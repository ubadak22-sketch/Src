const express = require("express");
const multer = require("multer");
const speech = require("@google-cloud/speech");
const { TranslationServiceClient } = require("@google-cloud/translate").v3;

const router = express.Router();
const speechClient = new speech.SpeechClient();
const translateClient = new TranslationServiceClient();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const ENCODING_MAP = {
  LINEAR16: "LINEAR16",
  FLAC: "FLAC",
  MP3: "MP3",
  WEBM_OPUS: "WEBM_OPUS",
  OGG_OPUS: "OGG_OPUS",
};

async function translateText(text, targetLang) {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const [response] = await translateClient.translateText({
    parent: `projects/${projectId}/locations/global`,
    contents: [text],
    mimeType: "text/plain",
    targetLanguageCode: targetLang,
  });
  return response.translations[0].translatedText;
}

/**
 * POST /api/translate/speech
 *
 * Multipart form:
 *   audio        = <audio file>
 *   encoding     = WEBM_OPUS | LINEAR16 | FLAC | MP3 | OGG_OPUS
 *   sample_rate  = 16000
 *   audio_lang   = en-US
 *   translate_to = ar  (optional)
 *
 * OR JSON body:
 *   { audio_base64, encoding, sample_rate, audio_lang, translate_to }
 */
router.post("/", upload.single("audio"), async (req, res) => {
  let audioBuffer;
  let encoding, sampleRate, audioLang, translateTo;

  if (req.file) {
    // Multipart upload
    audioBuffer = req.file.buffer;
    encoding = req.body.encoding || "WEBM_OPUS";
    sampleRate = parseInt(req.body.sample_rate) || 16000;
    audioLang = req.body.audio_lang || "en-US";
    translateTo = req.body.translate_to || null;
  } else {
    // JSON body
    const { audio_base64, sample_rate, audio_lang, translate_to } = req.body;
    encoding = req.body.encoding || "WEBM_OPUS";

    if (!audio_base64) {
      return res.status(400).json({ error: "audio file (multipart) or audio_base64 (JSON) required" });
    }
    audioBuffer = Buffer.from(audio_base64, "base64");
    sampleRate = parseInt(sample_rate) || 16000;
    audioLang = audio_lang || "en-US";
    translateTo = translate_to || null;
  }

  const resolvedEncoding = ENCODING_MAP[encoding.toUpperCase()] || "WEBM_OPUS";

  try {
    const [response] = await speechClient.recognize({
      config: {
        encoding: resolvedEncoding,
        sampleRateHertz: sampleRate,
        languageCode: audioLang,
      },
      audio: { content: audioBuffer.toString("base64") },
    });

    if (!response.results || response.results.length === 0) {
      return res.status(422).json({ error: "No speech detected in audio" });
    }

    const best = response.results[0].alternatives[0];
    const result = {
      transcript: best.transcript,
      confidence: best.confidence,
    };

    if (translateTo) {
      try {
        result.translated_text = await translateText(best.transcript, translateTo);
        result.target_lang = translateTo;
      } catch (e) {
        console.warn("Translation after STT failed:", e.message);
      }
    }

    res.json(result);
  } catch (err) {
    console.error("STT error:", err.message);
    res.status(500).json({ error: "Speech recognition failed: " + err.message });
  }
});

module.exports = router;
