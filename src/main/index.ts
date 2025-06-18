// Load environment variables from .env file
import dotenv from "dotenv";
dotenv.config();

// Debug environment variables (only in development)
if (process.env.NODE_ENV === "development") {
  console.log("🔍 Main Process Environment:", {
    NODE_ENV: process.env.NODE_ENV,
    VITE_DEV_SERVER_URL: process.env.VITE_DEV_SERVER_URL,
    isDevelopment: process.env.NODE_ENV === "development",
  });
}

import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import { MCPManager } from "./mcp/MCPManager";
import { LangGraphAgent } from "./agent/LangGraphAgent";
import Store from "electron-store";
import { IpcChannels } from "../shared/types";
import { loggingService } from "./services/LoggingService";
import APIServerService from "./services/APIServerService";

let mainWindow: BrowserWindow | null = null;
let mcpManager: MCPManager;
let agent: LangGraphAgent;
let apiServerService: APIServerService;
const store = new Store();

function createWindow() {
  // Debug paths
  const preloadPath = path.join(__dirname, "preload.js");
  const htmlPath = path.join(__dirname, "../../renderer/index.html");
  console.log("🔍 Paths:", {
    __dirname,
    preloadPath,
    htmlPath,
    preloadExists: require("fs").existsSync(preloadPath),
    htmlExists: require("fs").existsSync(htmlPath),
  });

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    vibrancy: process.platform === "darwin" ? "sidebar" : undefined,
    backgroundColor: "#0f0f0f",
    show: false,
    icon:
      process.platform === "win32"
        ? path.join(__dirname, "../../assets/icon.ico")
        : undefined,
    title: "MCP Studio",
  });

  if (
    process.env.NODE_ENV === "development" &&
    process.env.VITE_DEV_SERVER_URL
  ) {
    // In development, load from Vite dev server
    console.log(
      "🔧 Loading from Vite dev server:",
      process.env.VITE_DEV_SERVER_URL
    );
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    console.log("📦 Loading from built files");
    mainWindow.loadFile(path.join(__dirname, "../../renderer/index.html"));
    // Open DevTools in production to debug issues
    if (process.env.DEBUG_PROD === "true") {
      mainWindow.webContents.openDevTools();
    }
  }

  // Add error handling for renderer process
  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription) => {
      console.error("❌ Failed to load renderer:", errorCode, errorDescription);
    }
  );

  mainWindow.webContents.on("render-process-gone", (event, details) => {
    console.error("❌ Renderer process gone:", details);
  });

  // Log when the page starts loading
  mainWindow.webContents.on("did-start-loading", () => {
    console.log("🔄 Started loading renderer...");
  });

  // Log when the page finishes loading
  mainWindow.webContents.on("did-finish-load", () => {
    console.log("✅ Renderer finished loading");
  });

  mainWindow.once("ready-to-show", () => {
    console.log("🖥️ Window ready to show, making visible...");
    mainWindow?.show();
    // Set the main window for logging service
    if (mainWindow) {
      loggingService.setMainWindow(mainWindow);
      loggingService.success("MCP Studio started successfully");
    }
  });

  // Add error handling for renderer process
  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription) => {
      console.error("❌ Renderer failed to load:", errorCode, errorDescription);
    }
  );

  mainWindow.on("unresponsive", () => {
    console.error("❌ Renderer process became unresponsive");
  });

  // Log when page finishes loading
  mainWindow.webContents.on("did-finish-load", () => {
    console.log("✅ Renderer finished loading");
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  createWindow();

  // Initialize MCP Manager
  mcpManager = new MCPManager(store);
  loggingService.log("MCP Manager initialized", { timestamp: new Date() });

  // Initialize API Server Service with MCP Manager
  apiServerService = new APIServerService(mcpManager);
  loggingService.log("API Server Service initialized", {
    timestamp: new Date(),
  });

  // Initialize Agent with error handling
  try {
    agent = new LangGraphAgent(mcpManager);
    console.log("LangGraph Agent initialized successfully");
  } catch (error) {
    console.warn("Failed to initialize LangGraph Agent:", error);
    console.warn(
      "Chat functionality will be limited. Please configure Watsonx credentials."
    );
    // Continue without agent - the app can still manage MCP servers
  }

  // Setup IPC handlers
  setupIpcHandlers();
});

app.on("window-all-closed", async () => {
  // Cleanup API servers before quitting
  if (apiServerService) {
    await apiServerService.cleanup();
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Flag to prevent double registration of IPC handlers
let ipcHandlersSetup = false;

function setupIpcHandlers() {
  if (ipcHandlersSetup) {
    console.log("⚠️ IPC handlers already set up, skipping...");
    return;
  }

  ipcHandlersSetup = true;
  console.log("🔧 Setting up IPC handlers...");

  // Server management
  ipcMain.handle(IpcChannels.ADD_SERVER, async (_, config) => {
    return await mcpManager.addServer(config);
  });

  ipcMain.handle(IpcChannels.REMOVE_SERVER, async (_, id) => {
    return await mcpManager.removeServer(id);
  });

  ipcMain.handle(IpcChannels.LIST_SERVERS, async () => {
    return mcpManager.listServers();
  });

  ipcMain.handle(IpcChannels.CONNECT_SERVER, async (_, id) => {
    const result = await mcpManager.connectServer(id);

    // Refresh the agent with updated tools when a server connects
    if (agent) {
      await agent.refreshAgent();
    }

    return result;
  });

  ipcMain.handle(IpcChannels.DISCONNECT_SERVER, async (_, id) => {
    return await mcpManager.disconnectServer(id);
  });

  // Tool operations
  ipcMain.handle(IpcChannels.LIST_TOOLS, async (_, serverId) => {
    console.log("Main process: LIST_TOOLS called with serverId:", serverId);
    try {
      const result = await mcpManager.listTools(serverId);
      console.log(
        "Main process: LIST_TOOLS returning:",
        result.length,
        "tools"
      );
      return result;
    } catch (error) {
      console.error("Main process: Error listing tools:", error);
      throw error;
    }
  });

  ipcMain.handle(
    IpcChannels.EXECUTE_TOOL,
    async (_, { serverId, toolName, args }) => {
      return await mcpManager.callTool(toolName, args, serverId);
    }
  );

  // Agent operations
  ipcMain.handle(IpcChannels.SEND_MESSAGE, async (_, message) => {
    if (!agent) {
      throw new Error(
        "Chat agent is not available. Please configure Watsonx credentials in your environment variables."
      );
    }
    return await agent.processMessage(message);
  });

  // Resource operations
  ipcMain.handle(IpcChannels.LIST_RESOURCES, async (_, serverId) => {
    return await mcpManager.listResources(serverId);
  });

  ipcMain.handle(IpcChannels.READ_RESOURCE, async (_, { serverId, uri }) => {
    return await mcpManager.readResource(serverId, uri);
  });

  // Prompt operations
  ipcMain.handle(IpcChannels.LIST_PROMPTS, async (_, serverId) => {
    return await mcpManager.listPrompts(serverId);
  });

  ipcMain.handle(
    IpcChannels.GET_PROMPT,
    async (_, { serverId, name, args }) => {
      return await mcpManager.getPrompt(serverId, name, args);
    }
  );

  // Context parameter discovery
  ipcMain.handle(IpcChannels.DISCOVER_CONTEXT_PARAMS, async (_, serverId) => {
    return await mcpManager.discoverContextParameters(serverId);
  });

  // Server configuration
  ipcMain.handle(IpcChannels.GET_SERVER_CONFIG, async (_, id) => {
    return mcpManager.getServerConfig(id);
  });

  ipcMain.handle(IpcChannels.UPDATE_SERVER, async (_, id, config) => {
    return await mcpManager.updateServer(id, config);
  });

  // Logging operations
  ipcMain.handle(IpcChannels.GET_LOGS, async () => {
    return loggingService.getLogs();
  });

  ipcMain.handle(IpcChannels.CLEAR_LOGS, async () => {
    return loggingService.clearLogs();
  });

  // Public API testing
  ipcMain.handle(
    IpcChannels.TEST_PUBLIC_API,
    async (_, { url, method = "GET", headers = {}, body = null }) => {
      try {
        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: body ? JSON.stringify(body) : null,
        });

        const responseData = await response.text();

        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData,
        };
      } catch (error) {
        return {
          ok: false,
          status: 0,
          statusText: "Network Error",
          headers: {},
          data: null,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }
  );

  // Server events
  mcpManager.on("serverConnected", (status) => {
    loggingService.success(`Server "${status.name}" connected successfully`);
    mainWindow?.webContents.send("server-connected", status.id);
  });

  mcpManager.on("serverDisconnected", (status) => {
    loggingService.warn(`Server "${status.name}" disconnected`);
    mainWindow?.webContents.send("server-disconnected", status.id);
  });

  mcpManager.on("serverError", (status) => {
    loggingService.error(`Server "${status.name}" error: ${status.error}`);
    mainWindow?.webContents.send("server-error", {
      serverId: status.id,
      error: status.error,
    });
  });

  mcpManager.on("tool-executed", (result) => {
    mainWindow?.webContents.send("tool-executed", result);
  });
}

// Graceful shutdown handlers
let cleanupInProgress = false;
const cleanup = async () => {
  if (cleanupInProgress) {
    console.log("⚠️ Cleanup already in progress, skipping...");
    return;
  }

  cleanupInProgress = true;
  console.log("🛑 Shutting down MCP Studio...");

  try {
    // Disconnect all MCP servers
    if (mcpManager) {
      const servers = mcpManager.listServers();
      for (const server of servers) {
        if (server.connected) {
          await mcpManager.disconnectServer(server.id);
        }
      }
      console.log("✅ MCP servers disconnected");
    }

    // Close API server service
    if (apiServerService) {
      await apiServerService.cleanup();
      console.log("✅ API servers shut down");
    }

    // Close main window
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
      mainWindow = null;
      console.log("✅ Main window closed");
    }

    console.log("✅ Cleanup completed successfully");
  } catch (error: any) {
    // Use simple console.log to avoid potential recursion
    console.log("❌ Error during cleanup:", error?.message || "Unknown error");
  }

  // Force exit after a short delay
  setTimeout(() => {
    process.exit(0);
  }, 100);
};

// Handle various termination signals
process.on("SIGINT", () => {
  console.log("\n🔸 Received SIGINT (Ctrl+C), initiating graceful shutdown...");
  cleanup();
});

process.on("SIGTERM", () => {
  console.log("🔸 Received SIGTERM, initiating graceful shutdown...");
  cleanup();
});

process.on("SIGHUP", () => {
  console.log("🔸 Received SIGHUP, initiating graceful shutdown...");
  cleanup();
});

// Handle uncaught errors (avoid infinite recursion)
process.on("uncaughtException", (error) => {
  console.log("❌ Uncaught Exception:", error.message || error);
  if (!cleanupInProgress) {
    cleanup();
  } else {
    // If cleanup is already in progress, just exit
    setTimeout(() => process.exit(1), 100);
  }
});

process.on("unhandledRejection", (reason, promise) => {
  console.log("❌ Unhandled Rejection at:", promise, "reason:", reason);
  if (!cleanupInProgress) {
    cleanup();
  } else {
    // If cleanup is already in progress, just exit
    setTimeout(() => process.exit(1), 100);
  }
});

// Handle app quit events
app.on("before-quit", (event) => {
  console.log("🔸 App before-quit event triggered");
  event.preventDefault();
  cleanup();
});

app.on("window-all-closed", () => {
  console.log("🔸 All windows closed");
  if (process.platform !== "darwin") {
    cleanup();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
