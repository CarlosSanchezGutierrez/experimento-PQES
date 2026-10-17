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

// Consultar y descargar: Director incluido.
router.get("/", verifyToken, listEvidence);
router.get("/:id/download", verifyToken, downloadEvidence);

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