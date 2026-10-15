
const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/userRepository");
const { USER_STATUS } = require("../config/accountRules");
const { getJwtSecret } = require("../config/jwtSecret");

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Token requerido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, getJwtSecret());

    if (decoded.purpose) {
      return res.status(401).json({ message: "Token inválido" });
    }

    const user = await userRepository.findById(decoded.id);

    if (!user || user.status !== USER_STATUS.ACTIVE) {
      return res.status(401).json({
        message: "Tu cuenta está deshabilitada o ya no existe."
      });
    }

    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role
    };

    return next();
  } catch (error) {
    if (error.status === 503) {
      return res.status(503).json({
        message: "No fue posible validar la sesión con Supabase."
      });
    }

    return res.status(401).json({
      message: "Token inválido o expirado"
    });
  }
};

module.exports = { verifyToken };