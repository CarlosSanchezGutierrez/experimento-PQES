const express = require("express");
const { rateLimit } = require("express-rate-limit");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const { ROLES } = require("../config/roles");
const { listAudit, listRecentAuditActivity } = require("../controllers/auditController");

// Registro de actividad de todos los usuarios (solo Super Admin)
router.get("/recent", verifyToken, listRecentAuditActivity);
router.get("/", rateLimit({ windowMs: 15 * 60 * 1000, limit: 120,
  standardHeaders: "draft-8", legacyHeaders: false }), verifyToken, allowRoles(ROLES.SUPER_ADMIN), listAudit);

module.exports = router;
