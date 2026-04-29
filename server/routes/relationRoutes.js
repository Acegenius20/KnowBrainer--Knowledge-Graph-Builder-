const express = require("express");
const { createRelation, getRelations } = require("../controllers/relationController");

const router = express.Router();

router.post("/", createRelation);
router.get("/", getRelations);

module.exports = router;
