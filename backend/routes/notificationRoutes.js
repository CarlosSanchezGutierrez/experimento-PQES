const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { listNotifications, markRead, markUnread } = require("../controllers/notificationController");
const { allowRoles } = require("../middleware/roleMiddleware");
const { RECORD_CREATE_ROLES } = require("../config/roles");

router.get("/", verifyToken, listNotifications);
router.put("/:id/read", verifyToken, allowRoles(...RECORD_CREATE_ROLES), markRead);
router.delete("/:id/read", verifyToken, allowRoles(...RECORD_CREATE_ROLES), markUnread);

module.exports = router;
