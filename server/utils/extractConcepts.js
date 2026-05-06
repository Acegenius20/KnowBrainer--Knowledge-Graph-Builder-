const nlp = require("compromise");

const STOP_WORDS = new Set([
  "the", "and", "that", "this", "from", "with", "are", "was", "been",
  "have", "has", "for", "to", "in", "on", "at", "by", "or", "is", "it", "be",
  "a", "an", "as", "but", "not", "if", "so", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "must", "can", "shall", "of",
  "about", "after", "before", "between", "into", "through", "during", "above",
  "below", "up", "down", "out", "off", "over", "under", "again", "further",
  "then", "once", "here", "there", "when", "where", "why", "how", "all", "each",
  "every", "both", "few", "more", "most", "other", "some", "such", "no", "nor",
  "only", "same", "than", "too", "very", "just", "which", "who", "what", "whom",
  "whose", "am", "being", "we", "you", "he", "she", "me", "him", "her", "us", "them",
  "use", "uses", "used", "using", "happen", "happens", "happened", "happening",
  "multiple", "different", "general", "generic", "various", "many", "thing", "things",
  "system", "data", "information", "item", "items"
]);

const WEAK_SINGLE_WORDS = new Set([
  "use", "uses", "used", "using", "happen", "happens", "happened", "happening",
  "multiple", "different", "general", "generic", "various", "many", "thing", "things",
  "system", "data", "information", "item", "items", "network", "learning", "neural",
  "machine", "biological", "vector", "vectors", "matrix", "matrices"
]);

const TECH_HINTS = new Set([
  "neural", "network", "networks", "machine", "learning", "database", "databases",
  "model", "models", "algorithm", "algorithms", "vector", "vectors", "graph", "graphs",
  "concept", "concepts", "relation", "relations", "neuron", "neurons", "embedding", "embeddings"
]);

const cleanText = (value) => value.replace(/[^a-z0-9\s-]/gi, " ").replace(/\s+/g, " ").trim();

const normalizePhrase = (phrase) => {
  if (!phrase || typeof phrase !== "string") return null;

  const cleaned = cleanText(phrase.toLowerCase());
  if (!cleaned) return null;

  const tokens = cleaned
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !STOP_WORDS.has(token));

  if (tokens.length === 0) return null;

  const normalizedTokens = tokens.map((token) => {
    if (token.length > 4 && token.endsWith("s")) {
      return token.slice(0, -1);
    }
    return token;
  });

  const normalized = normalizedTokens.join(" ").trim();
  if (!normalized) return null;
  if (/^\d+$/.test(normalized)) return null;
  if (normalized.length < 3) return null;

  return normalized;
};

const scoreCandidate = (concept) => {
  const tokens = concept.split(" ");
  const lengthScore = tokens.length >= 2 ? 3 : 0;
  const techScore = tokens.some((token) => TECH_HINTS.has(token)) ? 2 : 0;
  const phraseScore = concept.length >= 12 ? 1 : 0;
  return lengthScore + techScore + phraseScore;
};

const extractConceptCandidates = (sentence) => {
  const doc = nlp(sentence);
  const candidateSet = new Set();

  const nounChunks = doc.nouns().out("array") || [];
  const nounChunksSingular = doc.nouns().toSingular().out("array") || [];
  const nounMatches = doc.match("#Noun+").out("array") || [];
  const taggedNouns = doc.match("#Noun #Noun").out("array") || [];

  [...nounChunks, ...nounChunksSingular, ...nounMatches, ...taggedNouns].forEach((item) => {
    const normalized = normalizePhrase(item);
    if (!normalized) return;
    candidateSet.add(normalized);
  });

  // Preserve original occurrence order by indexing candidates in the sentence,
  // filter weak single-word candidates, and return in appearance order.
  const candidatesArr = Array.from(candidateSet).filter((concept) => {
    const tokens = concept.split(" ");
    const isWeakSingle = tokens.length === 1 && WEAK_SINGLE_WORDS.has(concept);
    const isWeakShort = tokens.length === 1 && concept.length < 5;
    return !isWeakSingle && !isWeakShort;
  });

  // Compute first-occurrence index in the sentence to preserve original order.
  const ordered = candidatesArr
    .map((concept) => ({ concept, index: sentence.indexOf(concept) }))
    .filter((c) => c.index >= 0)
    .sort((a, b) => a.index - b.index)
    .map((c) => c.concept);

  return ordered;
};

const extractConcepts = (text) => {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return { allConcepts: [], sentenceConcepts: [] };
  }

  const processed = text.trim();
  const sentences = processed
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return { allConcepts: [], sentenceConcepts: [] };
  }

  const sentenceConcepts = [];
  const conceptFrequency = new Map();

  sentences.forEach((sentence) => {
    const cleanedSentence = cleanText(sentence.toLowerCase());
    if (!cleanedSentence) return;

    const candidates = extractConceptCandidates(cleanedSentence);
    if (candidates.length === 0) return;

    const uniqueInSentence = [];
    const seen = new Set();

    candidates.forEach((concept) => {
      if (seen.has(concept)) return;
      seen.add(concept);
      uniqueInSentence.push(concept);
      conceptFrequency.set(concept, (conceptFrequency.get(concept) || 0) + 1);
    });

    if (uniqueInSentence.length > 0) {
      // Limit candidates per sentence to keep relations meaningful (2-3 links)
      const MAX_CANDIDATES_PER_SENTENCE = 4;
      const limited = uniqueInSentence.slice(0, MAX_CANDIDATES_PER_SENTENCE);

      sentenceConcepts.push({
        sentence,
        concepts: limited,
        metadata: limited.map((concept) => ({
          concept,
          type: concept.split(" ").length >= 2 ? "technical" : "general",
          sourceSentence: sentence,
        })),
      });
    }
  });

  const allConcepts = Array.from(conceptFrequency.entries())
    .filter(([concept, count]) => count > 1 || concept.split(" ").length >= 2 || scoreCandidate(concept) >= 3)
    .map(([concept]) => concept)
    .sort((a, b) => scoreCandidate(b) - scoreCandidate(a) || b.length - a.length);

  return {
    allConcepts,
    sentenceConcepts,
  };
};

module.exports = extractConcepts;
