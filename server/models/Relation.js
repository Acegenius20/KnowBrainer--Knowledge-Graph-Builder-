const mongoose = require("mongoose");

const relationSchema = new mongoose.Schema(
  {
    source: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Concept",
      required: true,
    },
    target: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Concept",
      required: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

relationSchema.index({ source: 1, target: 1, type: 1 }, { unique: true });

module.exports = mongoose.model("Relation", relationSchema);
