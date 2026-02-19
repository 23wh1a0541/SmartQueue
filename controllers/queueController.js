const Shop = require("../models/Shop");
const Queue = require("../models/Queue");
const generateNextToken = require("../utils/tokenGenerator");

exports.joinQueue = async (req, res) => {
    try {
        const { shopId } = req.body;

        const shop = await Shop.findById(shopId);
        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        const newToken = generateNextToken(shop);
        await shop.save();

        const queue = await Queue.create({
            shop: shopId,
            customer: req.user.id,
            tokenNumber: newToken
        });

        res.status(201).json(queue);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.callNext = async (req, res) => {
    try {
        const { shopId } = req.body;

        const shop = await Shop.findById(shopId);
        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        shop.servingToken += 1;
        await shop.save();

        await Queue.findOneAndUpdate(
            { shop: shopId, tokenNumber: shop.servingToken },
            { status: "served" }
        );

        res.json({ servingToken: shop.servingToken });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getQueueStatus = async (req, res) => {
    try {
        const { shopId } = req.params;

        const shop = await Shop.findById(shopId);
        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        res.json({
            currentToken: shop.currentToken,
            servingToken: shop.servingToken
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
