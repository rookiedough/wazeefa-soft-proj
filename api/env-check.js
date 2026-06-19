module.exports = function handler(req, res) {
  res.status(200).json({
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    geminiModel: process.env.GEMINI_MODEL || null,
    nodeEnv: process.env.NODE_ENV || null,
    cwd: process.cwd()
  });
};