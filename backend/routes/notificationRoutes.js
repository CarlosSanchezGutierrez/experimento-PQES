const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { listNotifications, markRead, markUnread } = require("../controllers/notificationController");

router.get("/", verifyToken, listNotifications);
router.put("/:id/read", verifyToken, markRead);
router.delete("/:id/read", verifyToken, markUnread);

module.exports = router;
