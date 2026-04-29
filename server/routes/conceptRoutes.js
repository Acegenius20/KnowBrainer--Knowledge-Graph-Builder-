const express = require("express");
const {
  createConcept,
  getConcepts,
  getConceptById,
  deleteConcept,
} = require("../controllers/conceptController");

const router = express.Router();

router.post("/", createConcept);
router.get("/", getConcepts);
router.get("/:id", getConceptById);
router.delete("/:id", deleteConcept);

module.exports = router;
