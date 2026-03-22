const express = require("express");
const { TranslationServiceClient } = require("@google-cloud/translate").v3;

const router = express.Router();
const client = new TranslationServiceClient();

/**
 * POST /api/translate/text
 * Body: { text, target_lang, source_lang? }
 * Returns: { translated_text, source_lang, target_lang }
 */
router.post("/", async (req, res) => {
  const { text, target_lang, source_lang } = req.body;

  if (!text || !target_lang) {
    return res.status(400).json({ error: "text and target_lang are required" });
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    return res.status(500).json({ error: "GOOGLE_CLOUD_PROJECT env var not set" });
  }

  try {
    const request = {
      parent: `projects/${projectId}/locations/global`,
      contents: [text],
      mimeType: "text/plain",
      targetLanguageCode: target_lang,
    };

    if (source_lang) {
      request.sourceLanguageCode = source_lang;
    }

    const [response] = await client.translateText(request);
    const translation = response.translations[0];

    res.json({
      translated_text: translation.translatedText,
      source_lang: source_lang || translation.detectedLanguageCode,
      target_lang,
    });
  } catch (err) {
    console.error("Translation error:", err.message);
    res.status(500).json({ error: "Translation failed: " + err.message });
  }
});

module.exports = router;
