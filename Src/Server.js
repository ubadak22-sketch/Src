require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { authMiddleware } = require("./middleware/auth");
const tokenRoute = require("./routes/token");
const textRoute = require("./routes/text");
const sttRoute = require("./routes/stt");
const ttsRoute = require("./routes/tts");
const imageRoute = require("./routes/image");

const app = express();
const PORT = process.env.PORT || 8080;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: "*", // lock this down to your frontend domain in production
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
}));

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// ── Public routes ─────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", tokenRoute);

// ── Protected routes (JWT required) ──────────────────────────
app.use("/api/translate/text",   authMiddleware, textRoute);
app.use("/api/translate/speech", authMiddleware, sttRoute);
app.use("/api/translate/tts",    authMiddleware, ttsRoute);
app.use("/api/translate/image",  authMiddleware, imageRoute);

// ── 404 handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🌍 Translator API running on port ${PORT}`);
  console.log(`📌 Endpoints:`);
  console.log(`   POST /api/auth/token          — get JWT token`);
  console.log(`   POST /api/translate/text      — translate text`);
  console.log(`   POST /api/translate/speech    — speech to text (+ translate)`);
  console.log(`   POST /api/translate/tts       — text to speech`);
  console.log(`   POST /api/translate/image     — OCR + translate image`);
  console.log(`   GET  /health                  — health check`);
});
