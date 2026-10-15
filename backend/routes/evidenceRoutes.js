const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const { ROLES } = require("../config/roles");
const { listEvidence, createEvidence } = require("../controllers/evidenceController");

router.get("/", verifyToken, listEvidence);
router.post("/", verifyToken, allowRoles(ROLES.SUPER_ADMIN, ROLES.GERENTE, ROLES.AUDITOR, ROLES.JEFATURA), createEvidence);

module.exports = router;
