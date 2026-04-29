const mongoose = require("mongoose");
const Relation = require("../models/Relation");

const createRelation = async (req, res) => {
  try {
    const { source, target, type } = req.body;

    if (!mongoose.Types.ObjectId.isValid(source) || !mongoose.Types.ObjectId.isValid(target)) {
      return res.status(400).json({ message: "Invalid source or target id." });
    }

    if (!type || typeof type !== "string") {
      return res.status(400).json({ message: "Type is required." });
    }

    if (source === target) {
      return res.status(400).json({ message: "Source and target must be different." });
    }

    const normalizedType = type.trim().toLowerCase();

    if (!normalizedType) {
      return res.status(400).json({ message: "Type is required." });
    }

    const existing = await Relation.findOne({
      source,
      target,
      type: normalizedType,
    });

    if (existing) {
      return res.status(409).json({ message: "Relation already exists." });
    }

    const relation = await Relation.create({ source, target, type: normalizedType });
    const populated = await relation.populate("source target");

    return res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Relation already exists." });
    }

    return res.status(500).json({ message: "Failed to create relation." });
  }
};

const getRelations = async (_req, res) => {
  try {
    const relations = await Relation.find()
      .sort({ createdAt: -1 })
      .populate("source target");

    return res.json(relations);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch relations." });
  }
};

module.exports = {
  createRelation,
  getRelations,
};
