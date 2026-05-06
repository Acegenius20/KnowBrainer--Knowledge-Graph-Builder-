/**
 * Simple semantic matching for concepts
 * Lightweight implementations without external APIs
 */

/**
 * Levenshtein distance (basic similarity)
 * Returns a score 0-100 where 100 is exact match
 */
const levenshteinDistance = (a, b) => {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array.from({ length: bn + 1 }, () => Array(an + 1).fill(0));

  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;

  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }

  const distance = matrix[bn][an];
  const maxLength = Math.max(an, bn);
  return Math.round(((maxLength - distance) / maxLength) * 100);
};

/**
 * Simple similarity scorer (0-100)
 */
export const calculateSimilarity = (term1, term2, threshold = 60) => {
  const t1 = term1.toLowerCase();
  const t2 = term2.toLowerCase();

  // Exact match
  if (t1 === t2) return 100;

  // Substring match (high weight)
  if (t1.includes(t2) || t2.includes(t1)) return 85;

  // Word boundary match
  const words1 = t1.split(/\s+/);
  const words2 = t2.split(/\s+/);
  const commonWords = words1.filter((w) => words2.includes(w)).length;
  if (commonWords > 0) {
    return Math.min(90, 50 + commonWords * 15);
  }

  // Levenshtein for remaining cases
  const distance = levenshteinDistance(t1, t2);
  return distance >= threshold ? distance : 0;
};

/**
 * Find similar concepts to a query
 */
export const findSimilarConcepts = (query, concepts, threshold = 60) => {
  return concepts
    .map((concept) => ({
      ...concept,
      similarity: calculateSimilarity(query, concept.displayTitle || concept.title, threshold),
    }))
    .filter((c) => c.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity);
};

/**
 * Highlight nodes based on search query
 * Returns { matched, connected, dimmed }
 */
export const getHighlightedNodes = (searchQuery, nodes, relations) => {
  if (!searchQuery.trim()) {
    return { matched: new Set(), connected: new Set(), dimmed: new Set() };
  }

  const query = searchQuery.toLowerCase();
  const matched = new Set();
  const connected = new Set();

  // Find exact and partial matches
  nodes.forEach((node) => {
    const title = (node.title || "").toLowerCase();
    if (title.includes(query) || query.includes(title.split(" ")[0])) {
      matched.add(node.id);
    }
  });

  // Find connected nodes
  relations.forEach((relation) => {
    const sourceId = relation.source?._id || relation.source;
    const targetId = relation.target?._id || relation.target;

    if (matched.has(sourceId) && !matched.has(targetId)) {
      connected.add(targetId);
    }
    if (matched.has(targetId) && !matched.has(sourceId)) {
      connected.add(sourceId);
    }
  });

  // Dimmed = everything else
  const dimmed = new Set(
    nodes.map((n) => n.id).filter((id) => !matched.has(id) && !connected.has(id))
  );

  return { matched, connected, dimmed };
};
