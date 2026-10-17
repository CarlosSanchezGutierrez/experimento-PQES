const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const { RECORD_CREATE_ROLES } = require("../config/roles");

const {
  listEvidence,
  createEvidence,
  uploadEvidence,
  downloadEvidence
} = require("../controllers/evidenceController");
const { rateLimit } = require("express-rate-limit");
const { listEvidence, createEvidence, uploadEvidence, downloadEvidence, askEvidence } = require("../controllers/evidenceController");

// Consultar y descargar: Director incluido.
router.get("/", verifyToken, listEvidence);
router.get("/:id/download", verifyToken, downloadEvidence);
router.post("/:id/ask", verifyToken, rateLimit({ windowMs: 15 * 60 * 1000, limit: 10,
  keyGenerator: (req) => String(req.user.id), standardHeaders: "draft-8", legacyHeaders: false }), askEvidence);

// Crear o subir: Director excluido.
router.post(
  "/",
  verifyToken,
  allowRoles(...RECORD_CREATE_ROLES),
  createEvidence
);

router.post(
  "/upload",
  verifyToken,
  allowRoles(...RECORD_CREATE_ROLES),
  express.raw({ type: () => true, limit: "3mb" }),
  uploadEvidence
);

module.exports = router;