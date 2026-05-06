const express = require("express");
const { createRelation, getRelations, deleteRelation } = require("../controllers/relationController");

const router = express.Router();

router.post("/", createRelation);
router.get("/", getRelations);
router.delete("/:id", deleteRelation);

module.exports = router;
