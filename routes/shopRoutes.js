const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const { createShop } = require("../controllers/shopController");

router.post("/create", auth, role("admin"), createShop);

module.exports = router;
