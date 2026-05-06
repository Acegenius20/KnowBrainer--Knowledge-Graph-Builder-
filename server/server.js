const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const conceptRoutes = require("./routes/conceptRoutes");
const relationRoutes = require("./routes/relationRoutes");
const extractRoutes = require("./routes/extractRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/concepts", conceptRoutes);
app.use("/api/relations", relationRoutes);
app.use("/api/extract", extractRoutes);

app.get("/", (_req, res) => {
  res.send("KnowBrainer backend is running");
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});