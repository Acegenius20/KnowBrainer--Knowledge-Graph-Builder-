const nlp = require("compromise");

const extractConcepts = (text) => {
  if (!text || typeof text !== "string") {
    return [];
  }

  const nouns = nlp(text).nouns().out("array");
  const unique = new Set(
    nouns
      .map((noun) => noun.trim())
      .filter((noun) => noun.length > 0)
  );

  return Array.from(unique);
};

module.exports = extractConcepts;
