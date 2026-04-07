const Queue = require("../models/Queue");
const Shop = require("../models/Shop");
const generateNextToken = require("../utils/tokenGenerator");

const startOfToday = () => new Date(new Date().setHours(0, 0, 0, 0));

const isSameDay = (leftDate, rightDate) => {
    const left = new Date(leftDate);
    const right = new Date(rightDate);

    return (
        left.getFullYear() === right.getFullYear() &&
        left.getMonth() === right.getMonth() &&
        left.getDate() === right.getDate()
    );
};

const buildQueueSummary = async (shopId) => {
    const items = await Queue.find({
        shop: shopId,
        createdAt: { $gte: startOfToday() }
    })
        .populate("customer", "name email")
        .sort({ createdAt: 1 });

    const waiting = items.filter((item) => item.status === "waiting").length;
    const called = items.filter((item) => item.status === "called").length;
    const served = items.filter((item) => item.status === "served").length;
    const skipped = items.filter((item) => item.status === "skipped").length;

    return {
        items,
        summary: {
            total: items.length,
            waiting,
            called,
            served,
            skipped
        }
    };
};

exports.joinQueue = async (req, res) => {
    try {
        const { shopId } = req.body;

        if (!shopId) {
            return res.status(400).json({ message: "Shop ID is required." });
        }

        const shop = await Shop.findById(shopId);
        if (!shop) {
            return res.status(404).json({ message: "Shop not found." });
        }

        if (shop.status !== "open") {
            return res.status(400).json({ message: "This shop is currently not accepting new customers." });
        }

        const todayActiveToken = await Queue.findOne({
            shop: shopId,
            customer: req.user.id,
            createdAt: { $gte: startOfToday() },
            status: { $in: ["waiting", "called"] }
        });

        if (todayActiveToken) {
            return res.status(409).json({
                message: "You already have an active token for today.",
                queueItem: todayActiveToken
            });
        }

        const tokenData = generateNextToken(shop);
        await shop.save();

        const queueItem = await Queue.create({
            shop: shopId,
            customer: req.user.id,
            tokenNumber: tokenData.tokenNumber,
            tokenLabel: tokenData.tokenLabel,
            estimatedWaitMinutes: await exports.calculateEstimatedWait(shopId, shop.averageServiceTime)
        });

        await queueItem.populate("shop", "name queuePrefix averageServiceTime");

        return res.status(201).json({
            message: "Token generated successfully.",
            queueItem
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.calculateEstimatedWait = async (shopId, averageServiceTime) => {
    const activeCount = await Queue.countDocuments({
        shop: shopId,
        status: { $in: ["waiting", "called"] }
    });

    return activeCount * averageServiceTime;
};

exports.callNext = async (req, res) => {
    try {
        const { shopId } = req.body;

        const shop = await Shop.findOne({ _id: shopId, owner: req.user.id });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found or access denied." });
        }

        const currentlyCalled = await Queue.findOne({
            shop: shopId,
            status: "called"
        }).sort({ createdAt: 1 });

        if (currentlyCalled) {
            return res.status(400).json({ message: "Complete or skip the current token before calling the next one." });
        }

        const nextQueueItem = await Queue.findOne({
            shop: shopId,
            status: "waiting"
        }).sort({ createdAt: 1 });

        if (!nextQueueItem) {
            return res.status(404).json({ message: "No waiting customers in the queue." });
        }

        nextQueueItem.status = "called";
        nextQueueItem.calledAt = new Date();
        nextQueueItem.notificationSent = true;
        await nextQueueItem.save();

        shop.currentlyServingToken = nextQueueItem.tokenNumber;
        shop.lastCalledAt = new Date();
        await shop.save();

        return res.json({
            message: `${nextQueueItem.tokenLabel} is now being served.`,
            queueItem: nextQueueItem
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.updateQueueStatus = async (req, res) => {
    try {
        const { queueId } = req.params;
        const { status } = req.body;

        if (!["served", "skipped", "cancelled"].includes(status)) {
            return res.status(400).json({ message: "Invalid status update." });
        }

        const queueItem = await Queue.findById(queueId).populate("shop");
        if (!queueItem) {
            return res.status(404).json({ message: "Queue item not found." });
        }

        const isOwner = queueItem.shop.owner.toString() === req.user.id;
        const isCustomer = queueItem.customer.toString() === req.user.id;

        if (!isOwner && !(isCustomer && status === "cancelled")) {
            return res.status(403).json({ message: "You do not have permission to update this queue item." });
        }

        if (status === "served") {
            queueItem.servedAt = new Date();
        }

        queueItem.status = status;
        await queueItem.save();

        if (["served", "skipped", "cancelled"].includes(status)) {
            const shop = await Shop.findById(queueItem.shop._id);
            if (shop && shop.currentlyServingToken === queueItem.tokenNumber) {
                shop.currentlyServingToken = 0;
                await shop.save();
            }
        }

        return res.json({
            message: `Queue item updated to ${status}.`,
            queueItem
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.getQueueStatus = async (req, res) => {
    try {
        const { shopId } = req.params;
        const shop = await Shop.findById(shopId).select("-__v");

        if (!shop) {
            return res.status(404).json({ message: "Shop not found." });
        }

        const { items, summary } = await buildQueueSummary(shopId);
        const nextWaitingItem = items.find((item) => item.status === "waiting");

        return res.json({
            shop,
            summary,
            currentlyServing: shop.currentlyServingToken,
            nextToken: nextWaitingItem ? nextWaitingItem.tokenLabel : null,
            queue: items
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.getMyTokens = async (req, res) => {
    try {
        const tokens = await Queue.find({ customer: req.user.id })
            .populate("shop", "name queuePrefix averageServiceTime")
            .sort({ createdAt: -1 });

        return res.json({ tokens });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.getQueueAnalytics = async (req, res) => {
    try {
        const { shopId } = req.params;
        const shop = await Shop.findOne({ _id: shopId, owner: req.user.id });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found or access denied." });
        }

        const queueItems = await Queue.find({ shop: shopId }).sort({ createdAt: 1 });
        const todayItems = queueItems.filter((item) => isSameDay(item.createdAt, new Date()));

        const servedItems = todayItems.filter((item) => item.status === "served" && item.calledAt && item.servedAt);
        const averageServiceTime = servedItems.length
            ? Math.round(
                servedItems.reduce((sum, item) => sum + (item.servedAt - item.calledAt), 0) /
                servedItems.length /
                60000
            )
            : shop.averageServiceTime;

        return res.json({
            date: new Date(),
            shopId,
            metrics: {
                totalCustomersToday: todayItems.length,
                waiting: todayItems.filter((item) => item.status === "waiting").length,
                called: todayItems.filter((item) => item.status === "called").length,
                served: todayItems.filter((item) => item.status === "served").length,
                skipped: todayItems.filter((item) => item.status === "skipped").length,
                cancelled: todayItems.filter((item) => item.status === "cancelled").length,
                averageServiceTimeMinutes: averageServiceTime
            }
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
