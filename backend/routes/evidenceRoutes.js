const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { listEvidence, createEvidence, uploadEvidence, downloadEvidence } = require("../controllers/evidenceController");

router.get("/", verifyToken, listEvidence);
router.post("/", verifyToken, createEvidence);
router.post("/upload", verifyToken, express.raw({ type: () => true, limit: "3mb" }), uploadEvidence);
router.get("/:id/download", verifyToken, downloadEvidence);

module.exports = router;
