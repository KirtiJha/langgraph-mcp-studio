const express = require("express");
const { connectDB } = require("../config/database");
const { ObjectId } = require("mongodb");

const router = express.Router();

// Get all feedbacks - simple list for agents
router.get("/", async (req, res) => {
  try {
    const db = await connectDB();
    const feedbacks = await db
      .collection("feedbacks")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      feedbacks,
      totalRecords: feedbacks.length,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch feedbacks",
      message: error.message,
    });
  }
});

// Get feedbacks by chat ID
router.get("/chat/:chatId", async (req, res) => {
  try {
    const db = await connectDB();
    const feedbacks = await db
      .collection("feedbacks")
      .find({
        chatId: req.params.chatId,
      })
      .sort({ createdAt: 1 })
      .toArray();

    res.json({
      feedbacks,
      totalRecords: feedbacks.length,
      chatId: req.params.chatId,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch feedbacks by chat ID",
      message: error.message,
    });
  }
});

// Get feedback by message ID
router.get("/message/:messageId", async (req, res) => {
  try {
    const db = await connectDB();
    const feedback = await db.collection("feedbacks").findOne({
      messageId: req.params.messageId,
    });

    if (!feedback) {
      return res.status(404).json({
        error: "Feedback not found",
        message: `Feedback for message ${req.params.messageId} does not exist`,
      });
    }

    res.json(feedback);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch feedback",
      message: error.message,
    });
  }
});

// Get feedbacks by user email
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

    // Get all feedbacks for these chats
    const feedbacks = await db
      .collection("feedbacks")
      .find({
        chatId: { $in: chatIds },
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      feedbacks,
      totalRecords: feedbacks.length,
      userEmail: req.params.email,
      chatCount: chatIds.length,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch user feedbacks",
      message: error.message,
    });
  }
});

// Get feedbacks by rating
router.get("/rating/:rating", async (req, res) => {
  try {
    const db = await connectDB();
    const rating = parseInt(req.params.rating);

    const feedbacks = await db
      .collection("feedbacks")
      .find({
        rating: rating,
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      feedbacks,
      totalRecords: feedbacks.length,
      rating: rating,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch feedbacks by rating",
      message: error.message,
    });
  }
});

// Get upvoted/downvoted feedbacks
router.get("/vote/:voteType", async (req, res) => {
  try {
    const db = await connectDB();
    const isUpvoted = req.params.voteType === "up";

    const feedbacks = await db
      .collection("feedbacks")
      .find({
        isUpvoted: isUpvoted,
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      feedbacks,
      totalRecords: feedbacks.length,
      voteType: req.params.voteType,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch feedbacks by vote type",
      message: error.message,
    });
  }
});

// Search feedbacks by comments
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
    const feedbacks = await db
      .collection("feedbacks")
      .find({
        comments: { $regex: q, $options: "i" },
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      feedbacks,
      totalRecords: feedbacks.length,
      searchQuery: q,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to search feedbacks",
      message: error.message,
    });
  }
});

// Get recent feedbacks
router.get("/recent", async (req, res) => {
  try {
    const db = await connectDB();
    const days = parseInt(req.query.days) || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const feedbacks = await db
      .collection("feedbacks")
      .find({
        createdAt: { $gte: cutoffDate },
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      feedbacks,
      totalRecords: feedbacks.length,
      criteria: `Created within ${days} days`,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch recent feedbacks",
      message: error.message,
    });
  }
});

// Create feedback (vote on a message)
router.post("/", async (req, res) => {
  try {
    const {
      chatId,
      messageId,
      comments = "",
      rating = 0,
      isUpvoted = false,
    } = req.body;

    if (!chatId || !messageId) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "chatId and messageId are required",
      });
    }

    const db = await connectDB();

    // Check if feedback already exists for this message
    const existingFeedback = await db
      .collection("feedbacks")
      .findOne({ messageId });

    if (existingFeedback) {
      return res.status(409).json({
        error: "Feedback already exists",
        message: `Feedback for message ${messageId} already exists`,
        feedback: existingFeedback,
      });
    }

    const newFeedback = {
      chatId,
      messageId,
      comments,
      rating,
      isUpvoted,
      createdAt: new Date(),
      lastModifiedAt: new Date(),
    };

    const result = await db.collection("feedbacks").insertOne(newFeedback);

    res.status(201).json({
      message: "Feedback created successfully",
      feedback: { _id: result.insertedId, ...newFeedback },
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to create feedback",
      message: error.message,
    });
  }
});

// Update feedback by message ID
router.put("/message/:messageId", async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.messageId; // Don't allow messageId changes

    const db = await connectDB();
    const result = await db.collection("feedbacks").updateOne(
      { messageId: req.params.messageId },
      {
        $set: {
          ...updateData,
          lastModifiedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: "Feedback not found",
        message: `Feedback for message ${req.params.messageId} does not exist`,
      });
    }

    res.json({
      message: "Feedback updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to update feedback",
      message: error.message,
    });
  }
});

// Delete feedback by message ID
router.delete("/message/:messageId", async (req, res) => {
  try {
    const db = await connectDB();
    const result = await db.collection("feedbacks").deleteOne({
      messageId: req.params.messageId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: "Feedback not found",
        message: `Feedback for message ${req.params.messageId} does not exist`,
      });
    }

    res.json({
      message: "Feedback deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete feedback",
      message: error.message,
    });
  }
});

// Delete all feedbacks for a chat
router.delete("/chat/:chatId", async (req, res) => {
  try {
    const db = await connectDB();
    const result = await db.collection("feedbacks").deleteMany({
      chatId: req.params.chatId,
    });

    res.json({
      message: "Feedbacks deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete feedbacks",
      message: error.message,
    });
  }
});

module.exports = router;
