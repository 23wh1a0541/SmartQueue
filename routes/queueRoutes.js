const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const { joinQueue, callNext, getQueueStatus } = require("../controllers/queueController");

router.post("/join", auth, role("customer"), joinQueue);
router.post("/call", auth, role("admin"), callNext);
router.get("/status/:shopId", auth, getQueueStatus);

module.exports = router;
