const mongoose = require("mongoose");
const Concept = require("../models/Concept");
const Relation = require("../models/Relation");

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const serializeConcept = (concept) => {
  if (!concept) return concept;

  const plainConcept = concept.toObject ? concept.toObject() : { ...concept };
  return {
    ...plainConcept,
    title: plainConcept.displayTitle || plainConcept.title,
  };
};

const createConcept = async (req, res) => {
  try {
    const { title, description, tags } = req.body;

    if (!title || typeof title !== "string") {
      return res.status(400).json({ message: "Title is required." });
    }

    const displayTitle = title.trim();
    const normalizedTitle = displayTitle.toLowerCase();

    if (!normalizedTitle) {
      return res.status(400).json({ message: "Title is required." });
    }

    const existing = await Concept.findOne({
      title: normalizedTitle,
    });

    if (existing) {
      return res.status(409).json({ message: "Concept already exists." });
    }

    const normalizedDescription =
      typeof description === "string" ? description.trim() : "";
    const normalizedTags = Array.isArray(tags)
      ? tags
          .filter((tag) => typeof tag === "string")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];

    const concept = await Concept.create({
      title: normalizedTitle,
      displayTitle,
      description: normalizedDescription,
      tags: normalizedTags,
    });

    return res.status(201).json(serializeConcept(concept));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Concept already exists." });
    }

    return res.status(500).json({ message: "Failed to create concept." });
  }
};

const getConcepts = async (_req, res) => {
  try {
    const concepts = await Concept.find().sort({ createdAt: -1 });
    return res.json(concepts.map(serializeConcept));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch concepts." });
  }
};

const getConceptById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid concept id." });
    }

    const concept = await Concept.findById(id);

    if (!concept) {
      return res.status(404).json({ message: "Concept not found." });
    }

    return res.json(serializeConcept(concept));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch concept." });
  }
};

const deleteConcept = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid concept id." });
    }

    const deleted = await Concept.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Concept not found." });
    }

    await Relation.deleteMany({
      $or: [{ source: id }, { target: id }],
    });

    return res.json({ message: "Concept deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete concept." });
  }
};

module.exports = {
  createConcept,
  getConcepts,
  getConceptById,
  deleteConcept,
};
