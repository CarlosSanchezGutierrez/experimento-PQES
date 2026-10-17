const express = require("express");
const { rateLimit } = require("express-rate-limit");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const { login, verify2FA, setup2FA, enable2FA, register } = require("../controllers/authController");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Demasiadas solicitudes de autenticación. Intenta más tarde.",
    code: "AUTH_RATE_LIMITED"
  }
});

router.post("/login", login);
router.post("/register", register); // HU-01
router.post("/verify-2fa", verify2FA);
router.post("/2fa/setup", verifyToken, setup2FA);
router.post("/2fa/enable", verifyToken, enable2FA);

module.exports = router;