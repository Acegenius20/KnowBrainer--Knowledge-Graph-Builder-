const extractConcepts = require("../utils/extractConcepts");
const Concept = require("../models/Concept");
const Relation = require("../models/Relation");

const serializeConcept = (concept) => {
  if (!concept) return concept;

  const plainConcept = concept.toObject ? concept.toObject() : { ...concept };
  return {
    ...plainConcept,
    title: plainConcept.displayTitle || plainConcept.title,
  };
};

/**
 * Extract concepts from text and create meaningful relationships
 * - Extracts concepts using NLP
 * - Creates relations only within same sentence
 * - Limits connections to avoid over-connecting (max 3 per sentence)
 * - Maintains first -> second direction
 */
exports.extractFromText = async (req, res) => {
  const session = await Concept.startSession();

  try {
    const { text } = req.body;

    // Validation
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ message: "Please provide some text to extract concepts from." });
    }

    if (text.trim().length < 10) {
      return res.status(400).json({ message: "Text is too short. Please provide at least 10 characters." });
    }

    // Extract concepts with sentence context
    const { allConcepts, sentenceConcepts } = extractConcepts(text);

    if (allConcepts.length === 0) {
      return res.status(400).json({ 
        message: "No meaningful concepts could be extracted. Try using more descriptive language." 
      });
    }

    let conceptsCreated = 0;
    let createdRelations = [];

    await session.withTransaction(async () => {
      // Step 1: Create or find all concepts
      const conceptMap = new Map(); // Maps normalized concept to MongoDB ID

      for (const conceptTitle of allConcepts) {
        const normalizedTitle = conceptTitle.trim().toLowerCase();

        // Check if concept already exists using normalized lowercase title
        let concept = await Concept.findOne({ title: normalizedTitle }).session(session);

        if (!concept) {
          // Create new concept
          concept = new Concept({
            title: normalizedTitle,
            displayTitle: conceptTitle,
            description: `Extracted from knowledge input: "${conceptTitle}"`,
          });
          await concept.save({ session });
          conceptsCreated += 1;
        }

        conceptMap.set(normalizedTitle, concept._id);
      }

      // Step 2: Create relations within sentences (same-sentence only)
      // Use a central-node strategy: pick a main concept per sentence (first strong noun or globally important),
      // then link central -> related concepts (max 2-3 relations). Infer simple relation types when possible.
      createdRelations = [];
      const MAX_RELATIONS_PER_SENTENCE = 3;

      for (const { sentence, concepts } of sentenceConcepts) {
        if (!concepts || concepts.length < 2) continue;

        let sentenceRelationCount = 0;

        // Determine central concept: prefer first multi-word candidate, else prefer a concept present in allConcepts, else first
        let central = concepts.find((c) => c.split(" ").length >= 2);
        if (!central) {
          central = concepts.find((c) => allConcepts.includes(c));
        }
        if (!central) central = concepts[0];

        // Targets are the other concepts in the sentence
        const targets = concepts.filter((c) => c !== central);

        // Order targets: multi-word targets first, then original sentence order
        const orderedTargets = targets.slice().sort((a, b) => {
          const aMulti = a.split(" ").length >= 2 ? 0 : 1;
          const bMulti = b.split(" ").length >= 2 ? 0 : 1;
          if (aMulti !== bMulti) return aMulti - bMulti;
          return concepts.indexOf(a) - concepts.indexOf(b);
        });

        for (const targetConcept of orderedTargets) {
          if (sentenceRelationCount >= MAX_RELATIONS_PER_SENTENCE) break;

          const sourceId = conceptMap.get(central);
          const targetId = conceptMap.get(targetConcept);
          if (!sourceId || !targetId) continue;

          // Simple relation type inference from sentence verbs/phrases
          const s = (sentence || "").toLowerCase();
          let type = "related_to";
          if (/\bused (in|for|to)\b/.test(s) || /\buse(d)? (in|for|to)\b/.test(s) || s.includes("used in") || s.includes("used for")) {
            type = "used_in";
          } else if (/\b(part of|consist of|composed of|includes|include)\b/.test(s)) {
            type = "part_of";
          }

          const existingRelation = await Relation.findOne({
            source: sourceId,
            target: targetId,
            type,
          }).session(session);

          if (!existingRelation) {
            const relation = new Relation({
              source: sourceId,
              target: targetId,
              type,
            });
            await relation.save({ session });
            createdRelations.push(relation);
            sentenceRelationCount += 1;
          }
        }
      }
    });

    // Success response
    res.status(201).json({
      message: "Knowledge extracted successfully",
      conceptsCreated,
      conceptsProcessed: allConcepts.length,
      relationsCreated: createdRelations.length,
      sentencesProcessed: sentenceConcepts.length,
      concepts: allConcepts,
      sentenceConcepts,
    });
  } catch (error) {
    console.error("Error extracting concepts:", error);

    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    res.status(500).json({ 
      message: "Server error during extraction. Please try again." 
    });
  } finally {
    session.endSession();
  }
};
