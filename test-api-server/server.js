const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const { connectDB, testConnection } = require("./config/database");

// Import routes
const userRoutes = require("./routes/users");
const chatRoutes = require("./routes/chats");
const messageRoutes = require("./routes/messages");
const feedbackRoutes = require("./routes/feedbacks");
const healthRoutes = require("./routes/health");
const docsRoutes = require("./routes/docs");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check and database test endpoint
app.use("/api/health", healthRoutes);

// Documentation routes
app.use("/api/docs", docsRoutes);

// OpenAPI specification endpoint
app.get("/openapi.json", (req, res) => {
  try {
    const fs = require("fs");
    const path = require("path");
    const yaml = require("js-yaml");

    const yamlPath = path.join(__dirname, "openapi-simplified.yaml");
    const yamlContent = fs.readFileSync(yamlPath, "utf8");
    const openApiSpec = yaml.load(yamlContent);

    // Update server URL based on request
    const protocol = req.get("x-forwarded-proto") || req.protocol;
    const host = req.get("host");
    const baseUrl = `${protocol}://${host}`;

    openApiSpec.servers = [
      {
        url: baseUrl,
        description: "Current server",
      },
      {
        url: "http://localhost:3001",
        description: "Development server",
      },
    ];

    res.json(openApiSpec);
  } catch (error) {
    res.status(500).json({
      error: "Failed to load OpenAPI specification",
      message: error.message,
    });
  }
});

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/feedbacks", feedbackRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "MCP Test API Server",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      users: "/api/users",
      chats: "/api/chats",
      messages: "/api/messages",
      feedbacks: "/api/feedbacks",
    },
    documentation: {
      swagger: "/api/docs",
      openapi: "/openapi.json",
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.originalUrl} not found`,
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error(
        "Failed to connect to database. Server will start but database operations will fail."
      );
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📚 API documentation: http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  const { closeDB } = require("./config/database");
  await closeDB();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  const { closeDB } = require("./config/database");
  await closeDB();
  process.exit(0);
});

startServer();
