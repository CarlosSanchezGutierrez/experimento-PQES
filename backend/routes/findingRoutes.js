const express = require("express");
const { verifyToken } = require("../middleware/authMiddleware");
const { listFindings, createFinding } = require("../controllers/findingController");

const router = express.Router();
router.get("/", verifyToken, listFindings);
router.post("/", verifyToken, createFinding);
module.exports = router;
