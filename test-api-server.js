#!/usr/bin/env node

const express = require("express");
const cors = require("cors");
const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Sample data
let users = [
  { id: 1, name: "John Doe", email: "john@example.com", role: "admin" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", role: "user" },
  { id: 3, name: "Bob Johnson", email: "bob@example.com", role: "user" },
];

let tasks = [
  {
    id: 1,
    title: "Setup project",
    description: "Initialize the new project",
    status: "completed",
    assignedTo: 1,
  },
  {
    id: 2,
    title: "Design API",
    description: "Create API specifications",
    status: "in-progress",
    assignedTo: 1,
  },
  {
    id: 3,
    title: "Write tests",
    description: "Create unit tests",
    status: "pending",
    assignedTo: 2,
  },
];

// Authentication middleware (simple API key check)
const authenticateApiKey = (req, res, next) => {
  const apiKey =
    req.header("X-API-Key") ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!apiKey || apiKey !== "test-api-key-123") {
    return res.status(401).json({ error: "Invalid or missing API key" });
  }

  next();
};

// Routes

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Users API
app.get("/api/users", authenticateApiKey, (req, res) => {
  const { role, limit } = req.query;
  let filteredUsers = users;

  if (role) {
    filteredUsers = users.filter((user) => user.role === role);
  }

  if (limit) {
    filteredUsers = filteredUsers.slice(0, parseInt(limit));
  }

  res.json({
    users: filteredUsers,
    total: filteredUsers.length,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/users/:id", authenticateApiKey, (req, res) => {
  const user = users.find((u) => u.id === parseInt(req.params.id));

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({ user, timestamp: new Date().toISOString() });
});

app.post("/api/users", authenticateApiKey, (req, res) => {
  const { name, email, role = "user" } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  const newUser = {
    id: Math.max(...users.map((u) => u.id)) + 1,
    name,
    email,
    role,
  };

  users.push(newUser);

  res.status(201).json({
    message: "User created successfully",
    user: newUser,
    timestamp: new Date().toISOString(),
  });
});

// Tasks API
app.get("/api/tasks", authenticateApiKey, (req, res) => {
  const { status, assignedTo } = req.query;
  let filteredTasks = tasks;

  if (status) {
    filteredTasks = tasks.filter((task) => task.status === status);
  }

  if (assignedTo) {
    filteredTasks = filteredTasks.filter(
      (task) => task.assignedTo === parseInt(assignedTo)
    );
  }

  // Add user details to tasks
  const tasksWithUsers = filteredTasks.map((task) => ({
    ...task,
    assignedUser: users.find((u) => u.id === task.assignedTo),
  }));

  res.json({
    tasks: tasksWithUsers,
    total: tasksWithUsers.length,
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/tasks", authenticateApiKey, (req, res) => {
  const { title, description, status = "pending", assignedTo } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  const newTask = {
    id: Math.max(...tasks.map((t) => t.id)) + 1,
    title,
    description: description || "",
    status,
    assignedTo: assignedTo || null,
  };

  tasks.push(newTask);

  res.status(201).json({
    message: "Task created successfully",
    task: newTask,
    timestamp: new Date().toISOString(),
  });
});

app.put("/api/tasks/:id", authenticateApiKey, (req, res) => {
  const taskId = parseInt(req.params.id);
  const taskIndex = tasks.findIndex((t) => t.id === taskId);

  if (taskIndex === -1) {
    return res.status(404).json({ error: "Task not found" });
  }

  const { title, description, status, assignedTo } = req.body;

  if (title) tasks[taskIndex].title = title;
  if (description !== undefined) tasks[taskIndex].description = description;
  if (status) tasks[taskIndex].status = status;
  if (assignedTo !== undefined) tasks[taskIndex].assignedTo = assignedTo;

  res.json({
    message: "Task updated successfully",
    task: tasks[taskIndex],
    timestamp: new Date().toISOString(),
  });
});

// Analytics API
app.get("/api/analytics/summary", authenticateApiKey, (req, res) => {
  const totalUsers = users.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const pendingTasks = tasks.filter((t) => t.status === "pending").length;
  const inProgressTasks = tasks.filter(
    (t) => t.status === "in-progress"
  ).length;

  res.json({
    summary: {
      totalUsers,
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      completionRate:
        totalTasks > 0
          ? ((completedTasks / totalTasks) * 100).toFixed(2) + "%"
          : "0%",
    },
    timestamp: new Date().toISOString(),
  });
});

// OpenAPI spec endpoint
app.get("/openapi.json", (req, res) => {
  const spec = {
    openapi: "3.0.0",
    info: {
      title: "Test Task Management API",
      description:
        "A simple API for managing users and tasks - perfect for testing MCP integration",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:3001",
        description: "Local development server",
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
        },
      },
    },
    security: [
      {
        ApiKeyAuth: [],
      },
    ],
    paths: {
      "/health": {
        get: {
          summary: "Health check",
          description: "Check if the API is running",
          responses: {
            200: {
              description: "API is healthy",
            },
          },
        },
      },
      "/api/users": {
        get: {
          summary: "Get all users",
          description: "Retrieve a list of all users with optional filtering",
          parameters: [
            {
              name: "role",
              in: "query",
              description: "Filter users by role",
              schema: {
                type: "string",
                enum: ["admin", "user"],
              },
            },
            {
              name: "limit",
              in: "query",
              description: "Limit the number of results",
              schema: {
                type: "integer",
              },
            },
          ],
          responses: {
            200: {
              description: "List of users",
            },
          },
        },
        post: {
          summary: "Create a new user",
          description: "Add a new user to the system",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "email"],
                  properties: {
                    name: {
                      type: "string",
                    },
                    email: {
                      type: "string",
                      format: "email",
                    },
                    role: {
                      type: "string",
                      enum: ["admin", "user"],
                      default: "user",
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "User created successfully",
            },
          },
        },
      },
      "/api/users/{id}": {
        get: {
          summary: "Get user by ID",
          description: "Retrieve a specific user by their ID",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "User ID",
              schema: {
                type: "integer",
              },
            },
          ],
          responses: {
            200: {
              description: "User details",
            },
            404: {
              description: "User not found",
            },
          },
        },
      },
      "/api/tasks": {
        get: {
          summary: "Get all tasks",
          description: "Retrieve a list of all tasks with optional filtering",
          parameters: [
            {
              name: "status",
              in: "query",
              description: "Filter tasks by status",
              schema: {
                type: "string",
                enum: ["pending", "in-progress", "completed"],
              },
            },
            {
              name: "assignedTo",
              in: "query",
              description: "Filter tasks by assigned user ID",
              schema: {
                type: "integer",
              },
            },
          ],
          responses: {
            200: {
              description: "List of tasks",
            },
          },
        },
        post: {
          summary: "Create a new task",
          description: "Add a new task to the system",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title"],
                  properties: {
                    title: {
                      type: "string",
                    },
                    description: {
                      type: "string",
                    },
                    status: {
                      type: "string",
                      enum: ["pending", "in-progress", "completed"],
                      default: "pending",
                    },
                    assignedTo: {
                      type: "integer",
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "Task created successfully",
            },
          },
        },
      },
      "/api/tasks/{id}": {
        put: {
          summary: "Update a task",
          description: "Update an existing task",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Task ID",
              schema: {
                type: "integer",
              },
            },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: {
                      type: "string",
                    },
                    description: {
                      type: "string",
                    },
                    status: {
                      type: "string",
                      enum: ["pending", "in-progress", "completed"],
                    },
                    assignedTo: {
                      type: "integer",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Task updated successfully",
            },
            404: {
              description: "Task not found",
            },
          },
        },
      },
      "/api/analytics/summary": {
        get: {
          summary: "Get analytics summary",
          description: "Retrieve summary statistics about users and tasks",
          responses: {
            200: {
              description: "Analytics summary",
            },
          },
        },
      },
    },
  };

  res.json(spec);
});

app.listen(port, () => {
  console.log(`🚀 Test API Server running at http://localhost:${port}`);
  console.log(
    `📋 OpenAPI spec available at http://localhost:${port}/openapi.json`
  );
  console.log(`🔑 API Key for testing: test-api-key-123`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  GET  /health - Health check`);
  console.log(`  GET  /api/users - Get all users`);
  console.log(`  GET  /api/users/:id - Get user by ID`);
  console.log(`  POST /api/users - Create new user`);
  console.log(`  GET  /api/tasks - Get all tasks`);
  console.log(`  POST /api/tasks - Create new task`);
  console.log(`  PUT  /api/tasks/:id - Update task`);
  console.log(`  GET  /api/analytics/summary - Get analytics`);
  console.log(`\nExample usage:`);
  console.log(
    `  curl -H "X-API-Key: test-api-key-123" http://localhost:${port}/api/users`
  );
});
