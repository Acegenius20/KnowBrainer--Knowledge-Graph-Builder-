const express = require("express");
const router = express.Router();
const extractController = require("../controllers/extractController");

// POST /api/extract - Extract concepts from text
router.post("/", extractController.extractFromText);

module.exports = router;
