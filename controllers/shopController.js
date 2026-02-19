const Shop = require("../models/Shop");

exports.createShop = async (req, res) => {
    const shop = await Shop.create({
        name: req.body.name,
        owner: req.user.id
    });

    res.json(shop);
};
