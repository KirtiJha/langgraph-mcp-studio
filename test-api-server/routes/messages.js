const express = require("express");
const { connectDB } = require("../config/database");
const { ObjectId } = require("mongodb");

const router = express.Router();

// Get all messages - simple list for agents
router.get("/", async (req, res) => {
  try {
    const db = await connectDB();
    const messages = await db
      .collection("messages")
      .find({})
      .sort({ createdAt: 1 })
      .toArray();

    res.json({
      messages,
      totalRecords: messages.length,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch messages",
      message: error.message,
    });
  }
});

// Get message by ID (UUID)
router.get("/id/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const message = await db.collection("messages").findOne({
      id: req.params.id,
    });

    if (!message) {
      return res.status(404).json({
        error: "Message not found",
        message: `Message with ID ${req.params.id} does not exist`,
      });
    }

    res.json(message);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch message",
      message: error.message,
    });
  }
});

// Get messages by chat ID
router.get("/chat/:chatId", async (req, res) => {
  try {
    const db = await connectDB();
    const messages = await db
      .collection("messages")
      .find({
        chatId: req.params.chatId,
      })
      .sort({ createdAt: 1 })
      .toArray();

    res.json({
      messages,
      totalRecords: messages.length,
      chatId: req.params.chatId,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch messages by chat ID",
      message: error.message,
    });
  }
});

// Get messages by role (user/assistant/system)
router.get("/role/:role", async (req, res) => {
  try {
    const db = await connectDB();
    const messages = await db
      .collection("messages")
      .find({
        role: req.params.role,
      })
      .sort({ createdAt: 1 })
      .toArray();

    res.json({
      messages,
      totalRecords: messages.length,
      role: req.params.role,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch messages by role",
      message: error.message,
    });
  }
});

// Search messages by content
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
    const messages = await db
      .collection("messages")
      .find({
        content: { $regex: q, $options: "i" },
      })
      .sort({ createdAt: 1 })
      .toArray();

    res.json({
      messages,
      totalRecords: messages.length,
      searchQuery: q,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to search messages",
      message: error.message,
    });
  }
});

// Get recent messages
router.get("/recent", async (req, res) => {
  try {
    const db = await connectDB();
    const hours = parseInt(req.query.hours) || 24;
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);

    const messages = await db
      .collection("messages")
      .find({
        createdAt: { $gte: cutoffDate },
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      messages,
      totalRecords: messages.length,
      criteria: `Created within ${hours} hours`,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch recent messages",
      message: error.message,
    });
  }
});

// Get messages for a user's chats
router.get("/user/:email", async (req, res) => {
  try {
    const db = await connectDB();

    // First find the user by email
    const user = await db
      .collection("users")
      .findOne({ email: req.params.email });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
        message: `User with email ${req.params.email} does not exist`,
      });
    }

    // Get all chats for this user
    const userChats = await db
      .collection("chats")
      .find({
        userId: user._id,
      })
      .toArray();

    const chatIds = userChats.map((chat) => chat.id);

    // Get all messages for these chats
    const messages = await db
      .collection("messages")
      .find({
        chatId: { $in: chatIds },
      })
      .sort({ createdAt: 1 })
      .toArray();

    res.json({
      messages,
      totalRecords: messages.length,
      userEmail: req.params.email,
      chatCount: chatIds.length,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch user messages",
      message: error.message,
    });
  }
});

// Create single message
router.post("/", async (req, res) => {
  try {
    const { chatId, content, role = "user" } = req.body;

    if (!chatId || !content) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "chatId and content are required",
      });
    }

    const db = await connectDB();

    // Verify chat exists
    const chat = await db.collection("chats").findOne({ id: chatId });
    if (!chat) {
      return res.status(404).json({
        error: "Chat not found",
        message: `Chat with ID ${chatId} does not exist`,
      });
    }

    const { v4: uuidv4 } = require("uuid");
    const newMessage = {
      id: uuidv4(),
      content,
      role,
      chatId,
      createdAt: new Date(),
    };

    const result = await db.collection("messages").insertOne(newMessage);

    // Update chat's lastModifiedAt
    await db
      .collection("chats")
      .updateOne({ id: chatId }, { $set: { lastModifiedAt: new Date() } });

    res.status(201).json({
      message: "Message created successfully",
      data: { _id: result.insertedId, ...newMessage },
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to create message",
      message: error.message,
    });
  }
});

// Update message by ID
router.put("/id/:id", async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.id; // Don't allow ID changes

    const db = await connectDB();
    const result = await db
      .collection("messages")
      .updateOne({ id: req.params.id }, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: "Message not found",
        message: `Message with ID ${req.params.id} does not exist`,
      });
    }

    res.json({
      message: "Message updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to update message",
      message: error.message,
    });
  }
});

// Delete message by ID
router.delete("/id/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const result = await db.collection("messages").deleteOne({
      id: req.params.id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: "Message not found",
        message: `Message with ID ${req.params.id} does not exist`,
      });
    }

    res.json({
      message: "Message deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete message",
      message: error.message,
    });
  }
});

// Delete all messages for a chat
router.delete("/chat/:chatId", async (req, res) => {
  try {
    const db = await connectDB();
    const result = await db.collection("messages").deleteMany({
      chatId: req.params.chatId,
    });

    res.json({
      message: "Messages deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete messages",
      message: error.message,
    });
  }
});

module.exports = router;
