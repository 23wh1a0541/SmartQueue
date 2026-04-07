const Queue = require("../models/Queue");
const Shop = require("../models/Shop");

const startOfToday = () => new Date(new Date().setHours(0, 0, 0, 0));

exports.createShop = async (req, res) => {
    try {
        const { name, description, category, averageServiceTime, queuePrefix } = req.body;

        if (!name || !description || !category) {
            return res.status(400).json({ message: "Name, description, and category are required." });
        }

        const existingShop = await Shop.findOne({ owner: req.user.id });
        if (existingShop) {
            return res.status(409).json({ message: "This admin already manages a shop." });
        }

        const shop = await Shop.create({
            name: name.trim(),
            description: description.trim(),
            category: category.trim(),
            averageServiceTime: Number(averageServiceTime) || 5,
            queuePrefix: (queuePrefix || "SQ").trim().toUpperCase().slice(0, 4),
            owner: req.user.id
        });

        return res.status(201).json({
            message: "Shop created successfully.",
            shop
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.getShops = async (_req, res) => {
    try {
        const shops = await Shop.find()
            .populate("owner", "name email")
            .sort({ createdAt: -1 });

        return res.json({ shops });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.getOwnerShop = async (req, res) => {
    try {
        const shop = await Shop.findOne({ owner: req.user.id }).populate("owner", "name email");
        if (!shop) {
            return res.status(404).json({ message: "No shop found for this admin." });
        }

        const queueItems = await Queue.find({ shop: shop._id })
            .where("createdAt").gte(startOfToday())
            .populate("customer", "name email")
            .sort({ createdAt: 1 });

        return res.json({
            shop,
            queueItems
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.toggleShopStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!["open", "closed"].includes(status)) {
            return res.status(400).json({ message: "Status must be open or closed." });
        }

        const shop = await Shop.findOne({ owner: req.user.id });
        if (!shop) {
            return res.status(404).json({ message: "No shop found for this admin." });
        }

        shop.status = status;
        await shop.save();

        return res.json({
            message: `Shop is now ${status}.`,
            shop
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
