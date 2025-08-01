const express = require("express");
const { connectDB } = require("../config/database");

const router = express.Router();

// Test database connection
router.get("/", async (req, res) => {
  try {
    const db = await connectDB();
    await db.command({ ping: 1 });

    res.json({
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      database: "disconnected",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Database statistics
router.get("/db-stats", async (req, res) => {
  try {
    const db = await connectDB();
    const stats = await db.stats();

    // Get collection statistics
    const collections = ["users", "chats", "messages", "feedbacks"];
    const collectionStats = {};

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        collectionStats[collectionName] = { count };
      } catch (error) {
        collectionStats[collectionName] = { count: 0, error: error.message };
      }
    }

    res.json({
      databaseStats: {
        dbName: stats.db,
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
      },
      collectionStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to get database statistics",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
