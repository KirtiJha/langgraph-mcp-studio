const express = require("express");
const { connectDB } = require("../config/database");
const { ObjectId } = require("mongodb");

const router = express.Router();

// Get all chats - simple list for agents
router.get("/", async (req, res) => {
  try {
    const db = await connectDB();
    const chats = await db
      .collection("chats")
      .find({})
      .sort({ lastModifiedAt: -1 })
      .toArray();

    res.json({
      chats,
      totalRecords: chats.length,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch chats",
      message: error.message,
    });
  }
});

// Get chat by ID (UUID)
router.get("/id/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const chat = await db.collection("chats").findOne({
      id: req.params.id,
    });

    if (!chat) {
      return res.status(404).json({
        error: "Chat not found",
        message: `Chat with ID ${req.params.id} does not exist`,
      });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch chat",
      message: error.message,
    });
  }
});

// Get chats by user email
router.get("/user/:email", async (req, res) => {
  try {
    const db = await connectDB();

    // First find the user by email to get their ObjectId
    const user = await db
      .collection("users")
      .findOne({ email: req.params.email });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
        message: `User with email ${req.params.email} does not exist`,
      });
    }

    // Get chats for this user
    const chats = await db
      .collection("chats")
      .find({
        userId: user._id,
      })
      .sort({ lastModifiedAt: -1 })
      .toArray();

    res.json({
      chats,
      totalRecords: chats.length,
      userEmail: req.params.email,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch user chats",
      message: error.message,
    });
  }
});

// Search chats by title
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        error: "Search query required",
        message: 'Please provide a search query parameter "q"',
      });
    }

    const db = await connectDB();
    const chats = await db
      .collection("chats")
      .find({
        title: { $regex: q, $options: "i" },
      })
      .sort({ lastModifiedAt: -1 })
      .toArray();

    res.json({
      chats,
      totalRecords: chats.length,
      searchQuery: q,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to search chats",
      message: error.message,
    });
  }
});

// Get recent chats (by lastModifiedAt)
router.get("/recent", async (req, res) => {
  try {
    const db = await connectDB();
    const days = parseInt(req.query.days) || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const chats = await db
      .collection("chats")
      .find({
        lastModifiedAt: { $gte: cutoffDate },
      })
      .sort({ lastModifiedAt: -1 })
      .toArray();

    res.json({
      chats,
      totalRecords: chats.length,
      criteria: `Modified within ${days} days`,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch recent chats",
      message: error.message,
    });
  }
});

// Create new chat
router.post("/", async (req, res) => {
  try {
    const { title, userEmail } = req.body;

    if (!title || !userEmail) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "title and userEmail are required",
      });
    }

    const db = await connectDB();

    // Find user by email
    const user = await db.collection("users").findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({
        error: "User not found",
        message: `User with email ${userEmail} does not exist`,
      });
    }

    const { v4: uuidv4 } = require("uuid");
    const newChat = {
      id: uuidv4(),
      title,
      userId: user._id,
      createdAt: new Date(),
      lastModifiedAt: new Date(),
    };

    const result = await db.collection("chats").insertOne(newChat);

    res.status(201).json({
      message: "Chat created successfully",
      chat: { _id: result.insertedId, ...newChat },
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to create chat",
      message: error.message,
    });
  }
});

// Update chat by ID
router.put("/id/:id", async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id; // Don't allow ID changes

    const db = await connectDB();
    const result = await db.collection("chats").updateOne(
      { id: req.params.id },
      {
        $set: {
          ...updateData,
          lastModifiedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: "Chat not found",
        message: `Chat with ID ${req.params.id} does not exist`,
      });
    }

    res.json({
      message: "Chat updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to update chat",
      message: error.message,
    });
  }
});

// Delete chat by ID
router.delete("/id/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const result = await db.collection("chats").deleteOne({
      id: req.params.id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: "Chat not found",
        message: `Chat with ID ${req.params.id} does not exist`,
      });
    }

    res.json({
      message: "Chat deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete chat",
      message: error.message,
    });
  }
});

module.exports = router;
