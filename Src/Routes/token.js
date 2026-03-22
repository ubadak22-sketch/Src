const express = require("express");
const { generateToken } = require("../middleware/auth");

const router = express.Router();

/**
 * POST /api/auth/token
 * Body: { client_id, api_key }
 * Returns: { token }
 */
router.post("/token", (req, res) => {
  const { client_id, api_key } = req.body;

  if (!client_id || !api_key) {
    return res.status(400).json({ error: "client_id and api_key are required" });
  }

  const validKey = process.env.TRANSLATOR_API_KEY || "default-dev-key";

  if (api_key !== validKey) {
    return res.status(401).json({ error: "Invalid api_key" });
  }

  const token = generateToken(client_id);
  res.json({ token });
});

module.exports = router;
