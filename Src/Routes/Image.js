const express = require("express");
const multer = require("multer");
const vision = require("@google-cloud/vision");
const { TranslationServiceClient } = require("@google-cloud/translate").v3;

const router = express.Router();
const visionClient = new vision.ImageAnnotatorClient();
const translateClient = new TranslationServiceClient();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

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
 * POST /api/translate/image
 *
 * Multipart form:
 *   image        = <image file (jpg/png/webp/gif)>
 *   target_lang  = en  (optional)
 *
 * OR JSON body:
 *   { image_base64, target_lang }
 */
router.post("/", upload.single("image"), async (req, res) => {
  let imageBuffer;
  let targetLang;

  if (req.file) {
    imageBuffer = req.file.buffer;
    targetLang = req.body.target_lang || null;
  } else {
    const { image_base64, target_lang } = req.body;
    if (!image_base64) {
      return res.status(400).json({ error: "image file (multipart) or image_base64 (JSON) required" });
    }
    imageBuffer = Buffer.from(image_base64, "base64");
    targetLang = target_lang || null;
  }

  try {
    // Use DOCUMENT_TEXT_DETECTION for best accuracy on dense text
    const [result] = await visionClient.documentTextDetection({
      image: { content: imageBuffer },
    });

    const fullAnnotation = result.fullTextAnnotation;

    if (!fullAnnotation || !fullAnnotation.text) {
      return res.status(422).json({ error: "No text found in image" });
    }

    const extractedText = fullAnnotation.text;

    // Extract paragraph-level blocks
    const blocks = [];
    for (const page of fullAnnotation.pages || []) {
      for (const block of page.blocks || []) {
        let blockText = "";
        for (const para of block.paragraphs || []) {
          for (const word of para.words || []) {
            for (const symbol of word.symbols || []) {
              blockText += symbol.text;
              const breakType = symbol.property?.detectedBreak?.type;
              if (breakType === "SPACE" || breakType === "SURE_SPACE") blockText += " ";
              if (breakType === "LINE_BREAK" || breakType === "EOL_SURE_SPACE") blockText += "\n";
            }
          }
        }
        const cleaned = blockText.trim();
        if (cleaned) blocks.push({ text: cleaned });
      }
    }

    const response = { extracted_text: extractedText, blocks };

    // Translate if requested
    if (targetLang) {
      try {
        response.translated_text = await translateText(extractedText, targetLang);
        response.target_lang = targetLang;

        // Translate each block too
        for (const block of blocks) {
          try {
            block.translated = await translateText(block.text, targetLang);
          } catch (_) {}
        }
      } catch (e) {
        console.warn("Translation after OCR failed:", e.message);
      }
    }

    res.json(response);
  } catch (err) {
    console.error("Image translation error:", err.message);
    res.status(500).json({ error: "Image processing failed: " + err.message });
  }
});

module.exports = router;
