const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Default Route
app.get("/", (req, res) => {
    res.send("Server is Running!");
});

// Start Server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
