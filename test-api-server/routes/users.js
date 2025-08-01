const express = require("express");
const { connectDB } = require("../config/database");
const { ObjectId } = require("mongodb");

const router = express.Router();

// Get all users - simple list for agents
router.get("/", async (req, res) => {
  try {
    const db = await connectDB();
    const users = await db.collection("users").find({}).toArray();

    res.json({
      users,
      totalRecords: users.length,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch users",
      message: error.message,
    });
  }
});

// Get user by email (main identifier)
router.get("/email/:email", async (req, res) => {
  try {
    const db = await connectDB();
    const user = await db.collection("users").findOne({
      email: req.params.email,
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
        message: `User with email ${req.params.email} does not exist`,
      });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch user",
      message: error.message,
    });
  }
});

// Search users by name or email
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
    const users = await db
      .collection("users")
      .find({
        $or: [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
        ],
      })
      .toArray();

    res.json({
      users,
      totalRecords: users.length,
      searchQuery: q,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to search users",
      message: error.message,
    });
  }
});

// Get users by role
router.get("/role/:role", async (req, res) => {
  try {
    const db = await connectDB();
    const users = await db
      .collection("users")
      .find({
        role: req.params.role,
      })
      .toArray();

    res.json({
      users,
      totalRecords: users.length,
      role: req.params.role,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch users by role",
      message: error.message,
    });
  }
});

// Get recent users (by lastLogin)
router.get("/recent", async (req, res) => {
  try {
    const db = await connectDB();
    const days = parseInt(req.query.days) || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const users = await db
      .collection("users")
      .find({
        lastLogin: { $gte: cutoffDate },
      })
      .sort({ lastLogin: -1 })
      .toArray();

    res.json({
      users,
      totalRecords: users.length,
      criteria: `Last login within ${days} days`,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch recent users",
      message: error.message,
    });
  }
});

// Create new user
router.post("/", async (req, res) => {
  try {
    const { email, name, role = "user" } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email is required",
        message: "Please provide an email address",
      });
    }

    const db = await connectDB();
    const collection = db.collection("users");

    // Check if user already exists
    const existingUser = await collection.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        error: "User already exists",
        message: `User with email ${email} already exists`,
        user: existingUser,
      });
    }

    const newUser = {
      email,
      name: name || email.split("@")[0],
      role,
      emailVerified: null,
      image: null,
      createdAt: new Date(),
      lastLogin: null,
    };

    const result = await collection.insertOne(newUser);

    res.status(201).json({
      message: "User created successfully",
      user: { _id: result.insertedId, ...newUser },
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to create user",
      message: error.message,
    });
  }
});

// Update user by email
router.put("/email/:email", async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.email; // Don't allow email changes via this endpoint

    const db = await connectDB();
    const result = await db
      .collection("users")
      .updateOne({ email: req.params.email }, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: "User not found",
        message: `User with email ${req.params.email} does not exist`,
      });
    }

    res.json({
      message: "User updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to update user",
      message: error.message,
    });
  }
});

// Delete user by email
router.delete("/email/:email", async (req, res) => {
  try {
    const db = await connectDB();
    const result = await db.collection("users").deleteOne({
      email: req.params.email,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: "User not found",
        message: `User with email ${req.params.email} does not exist`,
      });
    }

    res.json({
      message: "User deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete user",
      message: error.message,
    });
  }
});

module.exports = router;
