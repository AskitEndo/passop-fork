const express = require("express");
const dotenv = require("dotenv");
const { MongoClient } = require("mongodb");
const bodyParser = require("body-parser");
const cors = require("cors");

dotenv.config();

// Connecting to the MongoDB Client
const url = process.env.MONGO_URI;
const client = new MongoClient(url);

client
  .connect()
  .then(() => {
    console.log("Database connected");
  })
  .catch((error) => {
    console.error("Database connection failed:", error);
    process.exit(1); // Exit the process if the database connection fails
  });

// App & Database
const dbName = process.env.DB_NAME;
const app = express();
const port = process.env.PORT || 3000; // Use port from environment variables or default to 3000

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Get all the passwords
app.get("/", async (req, res) => {
  try {
    const db = client.db(dbName);
    const collection = db.collection("passwords");
    const passwords = await collection.find({}).toArray();
    res.status(200).json(passwords);
  } catch (error) {
    console.error("Error fetching passwords:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// Save a password
app.post("/", async (req, res) => {
  try {
    const { site, username, password } = req.body;
    if (!site || !username || !password) {
      return res.status(400).json({
        success: false,
        message: "Site, username, and password are required",
      });
    }

    const db = client.db(dbName);
    const collection = db.collection("passwords");
    const result = await collection.insertOne({ site, username, password });
    res.status(201).json({ success: true, result });
  } catch (error) {
    console.error("Error saving password:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// Delete a password by id
app.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "ID is required" });
    }

    const db = client.db(dbName);
    const collection = db.collection("passwords");
    const result = await collection.deleteOne({
      _id: new MongoClient.ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Password not found" });
    }

    res.status(200).json({
      success: true,
      message: "Password deleted successfully",
      result,
    });
  } catch (error) {
    console.error("Error deleting password:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

//Exporting the passwords
app.get("/export", async (req, res) => {
  try {
    const db = client.db(dbName);
    const passwords = await db.collection("passwords").find({}).toArray();

    res.setHeader("content-Type", "application/json");
    res.setHeader("content-disposition", "attachment; filename=passwords.json");
    res.status(200).json(passwords);
  } catch (error) {
    console.error("Error exporting passwords:", error);
    res
      .status(500)
      .json({ success: false, message: "Error exporting the passwords" });
  }
});

// Importing the passwords
app.post("/import", async (req, res) => {
  try {
    const passwords = req.body;
    const db = client.db(dbName);
    const collection = db.collection("passwords");

    await collection.insertMany(passwords);

    res
      .status(200)
      .json({ success: true, message: "Passwords imported successfully" });
  } catch (error) {
    console.error("Error importing passwords:", error);
    res
      .status(500)
      .json({ success: false, message: "Error importing the passwords" });
  }
});

// Server listen
app.listen(port, () => {
  console.log(`PassOP server listening on http://localhost:${port}`);
});
