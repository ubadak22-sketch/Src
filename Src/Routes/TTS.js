const express = require("express");
const textToSpeech = require("@google-cloud/text-to-speech");

const router = express.Router();
const client = new textToSpeech.TextToSpeechClient();

const GENDER_MAP = {
  MALE: "MALE",
  FEMALE: "FEMALE",
  NEUTRAL: "NEUTRAL",
};

const FORMAT_MAP = {
  MP3: "MP3",
  OGG_OPUS: "OGG_OPUS",
  LINEAR16: "LINEAR16",
};

/**
 * POST /api/translate/tts
 * Body: {
 *   text, language_code,
 *   voice_name?,   // e.g. "en-US-Neural2-C"
 *   gender?,       // MALE | FEMALE | NEUTRAL
 *   audio_format?, // MP3 | OGG_OPUS | LINEAR16
 *   speed?,        // 0.25 - 4.0
 *   pitch?         // -20.0 - 20.0
 * }
 * Returns: { audio_base64, audio_format, language_code }
 */
router.post("/", async (req, res) => {
  const {
    text,
    language_code = "en-US",
    voice_name,
    gender = "NEUTRAL",
    audio_format = "MP3",
    speed = 1.0,
    pitch = 0.0,
  } = req.body;

  if (!text) {
    return res.status(400).json({ error: "text is required" });
  }

  const audioEncoding = FORMAT_MAP[audio_format.toUpperCase()] || "MP3";
  const ssmlGender = GENDER_MAP[gender.toUpperCase()] || "NEUTRAL";

  const voiceParams = { languageCode: language_code, ssmlGender };
  if (voice_name) voiceParams.name = voice_name;

  try {
    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: voiceParams,
      audioConfig: {
        audioEncoding,
        speakingRate: parseFloat(speed),
        pitch: parseFloat(pitch),
      },
    });

    const audioBase64 = response.audioContent.toString("base64");

    res.json({
      audio_base64: audioBase64,
      audio_format: audioEncoding,
      language_code,
    });
  } catch (err) {
    console.error("TTS error:", err.message);
    res.status(500).json({ error: "TTS synthesis failed: " + err.message });
  }
});

module.exports = router;
