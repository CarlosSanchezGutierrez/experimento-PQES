const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const { ROLES, USER_VIEW_ROLES } = require("../config/roles");
const { listAudit, listRecentAuditActivity } = require("../controllers/auditController");

// Registro de actividad de todos los usuarios (solo Super Admin)
router.get("/recent", verifyToken, listRecentAuditActivity);
router.get("/", verifyToken, allowRoles(...USER_VIEW_ROLES), listAudit);

module.exports = router;
