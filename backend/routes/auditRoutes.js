const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const { USER_VIEW_ROLES } = require("../config/roles");
const { listAudit } = require("../controllers/auditController");

// Registro de actividad de solo lectura para Super Admin y Director.
router.get("/", verifyToken, allowRoles(...USER_VIEW_ROLES), listAudit);

module.exports = router;