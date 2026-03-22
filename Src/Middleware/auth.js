const jwt = require("jsonwebtoken");

const getSecret = () => process.env.JWT_SECRET || "change-this-secret-in-production";

/**
 * Generate a signed JWT for a given clientId
 */
function generateToken(clientId) {
  return jwt.sign(
    { clientId, iss: "translator-api" },
    getSecret(),
    { expiresIn: "24h" }
  );
}

/**
 * Express middleware — validates Bearer token on protected routes
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return res.status(401).json({ error: "Invalid format. Use: Bearer <token>" });
  }

  try {
    const decoded = jwt.verify(parts[1], getSecret());
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { generateToken, authMiddleware };
