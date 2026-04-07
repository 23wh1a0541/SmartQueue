const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const {
    joinQueue,
    callNext,
    updateQueueStatus,
    getQueueStatus,
    getMyTokens,
    getQueueAnalytics
} = require("../controllers/queueController");

router.post("/join", auth, role("customer"), joinQueue);
router.post("/call-next", auth, role("admin"), callNext);
router.patch("/:queueId/status", auth, updateQueueStatus);
router.get("/status/:shopId", getQueueStatus);
router.get("/my-tokens", auth, role("customer"), getMyTokens);
router.get("/analytics/:shopId", auth, role("admin"), getQueueAnalytics);

module.exports = router;
