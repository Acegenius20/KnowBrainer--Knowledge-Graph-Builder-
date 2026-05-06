const recommendConcepts = require("../utils/recommendConcepts");

exports.getRecommendations = async (_req, res) => {
  try {
    const recommendations = await recommendConcepts();
    res.status(200).json(recommendations);
  } catch (error) {
    console.error("Failed to generate recommendations:", error);
    res.status(500).json({ message: "Failed to generate recommendations." });
  }
};
