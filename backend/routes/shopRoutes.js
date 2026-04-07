const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const {
    createShop,
    getShops,
    getOwnerShop,
    toggleShopStatus
} = require("../controllers/shopController");

router.get("/", getShops);
router.post("/", auth, role("admin"), createShop);
router.get("/mine", auth, role("admin"), getOwnerShop);
router.patch("/mine/status", auth, role("admin"), toggleShopStatus);

module.exports = router;
