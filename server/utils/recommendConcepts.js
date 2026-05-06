const Concept = require("../models/Concept");
const Relation = require("../models/Relation");
const knowledgeMap = require("../data/knowledgeMap");

const normalize = (value) => (value || "").trim().toLowerCase();

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const buildDegreeMap = (relations) => {
  const degree = new Map();

  relations.forEach((rel) => {
    const sourceId = rel.source?._id || rel.source;
    const targetId = rel.target?._id || rel.target;

    degree.set(sourceId, (degree.get(sourceId) || 0) + 1);
    degree.set(targetId, (degree.get(targetId) || 0) + 1);
  });

  return degree;
};

const recommendConcepts = async () => {
  const [concepts, relations] = await Promise.all([
    Concept.find({}).lean(),
    Relation.find({}).lean(),
  ]);

  const knownTitles = new Set(concepts.map((c) => normalize(c.title || c.displayTitle)));
  const degreeMap = buildDegreeMap(relations);
  const conceptByTitle = new Map(
    concepts.map((c) => [normalize(c.title || c.displayTitle), c])
  );

  const recommendations = new Map();

  Object.entries(knowledgeMap).forEach(([baseConcept, relatedConcepts]) => {
    const normalizedBase = normalize(baseConcept);
    if (!knownTitles.has(normalizedBase)) return;

    const baseConceptDoc = conceptByTitle.get(normalizedBase);
    const baseDegree = baseConceptDoc ? degreeMap.get(baseConceptDoc._id) || 0 : 0;

    relatedConcepts.forEach((related) => {
      const normalizedRelated = normalize(related);
      if (knownTitles.has(normalizedRelated)) return;

      const existing = recommendations.get(normalizedRelated);
      const score = baseDegree + 1;
      const confidence = clamp(60 + score * 8, 60, 92);
      const entry = {
        concept: normalizedRelated,
        reason: `Because you know ${baseConcept}`,
        score,
        confidence,
      };

      if (!existing || score > existing.score) {
        recommendations.set(normalizedRelated, entry);
      }
    });
  });

  return Array.from(recommendations.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ concept, reason, confidence }) => ({ concept, reason, confidence }));
};

module.exports = recommendConcepts;
