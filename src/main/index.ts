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

import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import path from "path";
import http from "http";
import url from "url";
import { MCPManager } from "./mcp/MCPManager";
import { LangGraphAgent } from "./agent/LangGraphAgent";
import { WorkflowAgent } from "./agent/WorkflowAgent";
import { ModelService } from "./services/ModelService";
import Store from "electron-store";
import { IpcChannels } from "../shared/types";
import { loggingService } from "./services/LoggingService";
import APIServerService from "./services/APIServerService";

// Set app name and metadata - use "MCP Studio" to match existing data location
app.setName("MCP Studio");
if (process.platform === "darwin") {
  // macOS specific: Set app name in dock
  const iconPath = path.join(__dirname, "../../assets/icon.icns");
  if (require("fs").existsSync(iconPath)) {
    app.dock?.setIcon(iconPath);
  }
}

let mainWindow: BrowserWindow | null = null;
let mcpManager: MCPManager;
let modelService: ModelService;
let agent: LangGraphAgent; // For regular AI chat
let workflowAgent: WorkflowAgent; // For workflow-specific operations
let apiServerService: APIServerService;
let oauth2Server: http.Server | null = null;
const store = new Store({
  name: "config", // This will create/read from 'config.json' in the app data directory
  // This should match the existing data location for MCP Studio
});

// Simple OAuth2 callback server
function createOAuth2Server() {
  oauth2Server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url || "", true);

    console.log(`🔗 OAuth2 server received ${req.method} request to:`, req.url);
    console.log("🔗 Request headers:", req.headers);

    if (
      parsedUrl.pathname === "/oauth-callback.html" ||
      parsedUrl.pathname === "/oauth_callback.html" ||
      parsedUrl.pathname === "/" // For IBM SSO OIDC that redirects to base URL
    ) {
      console.log("🔗 OAuth2 callback received:", req.url);

      // Handle POST requests that might contain form data with authorization code
      if (req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          console.log("🔗 POST body received:", body);

          // Try to parse form data
          const formData = new URLSearchParams(body);
          const code = formData.get("code");
          const state = formData.get("state");
          const error = formData.get("error");

          if (code || error) {
            // Construct a callback URL with the form data as query parameters
            const callbackUrl = `http://${req.headers.host}/?${body}`;
            console.log(
              "🔗 Constructed callback URL from POST data:",
              callbackUrl
            );

            // Send the callback URL to the renderer
            if (mainWindow) {
              mainWindow.webContents.send("oauth2-callback", callbackUrl);
            }
          } else {
            // No authorization code in POST body, send the original URL
            if (mainWindow) {
              mainWindow.webContents.send(
                "oauth2-callback",
                `http://${req.headers.host}${req.url}`
              );
            }
          }
        });
      } else {
        // Handle GET requests (normal case)
        // Extract query parameters from the URL
        const queryParams = parsedUrl.query;
        const code = queryParams.code;
        const state = queryParams.state;
        const error = queryParams.error;

        console.log("🔗 OAuth2 callback query parameters:", {
          code: code ? `${code.toString().substring(0, 10)}...` : null,
          state: state ? `${state.toString().substring(0, 10)}...` : null,
          error,
          pathname: parsedUrl.pathname,
          query: queryParams,
        });

        // Send the full callback URL to the renderer
        if (mainWindow) {
          const fullCallbackUrl = `http://${req.headers.host}${req.url}`;
          console.log("🔗 Sending callback URL to renderer:", fullCallbackUrl);
          mainWindow.webContents.send("oauth2-callback", fullCallbackUrl);
        }
      }

      // Serve a simple success page
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>OAuth2 Success</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px; background: #1e1e1e; color: white; }
            .container { max-width: 400px; margin: 0 auto; }
            .success { color: #4ade80; font-size: 24px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✅ Authentication Successful!</div>
            <p>You can close this window and return to the MCP Client.</p>
          </div>
          <script>
            // Close the window after a delay
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
        </html>
      `);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    }
  });

  // Try different ports starting from 3000
  function tryListen(port: number) {
    oauth2Server
      ?.listen(port, "0.0.0.0", () => {
        console.log(
          `🔗 OAuth2 callback server listening on http://localhost:${port} and http://127.0.0.1:${port}`
        );
      })
      .on("error", (err: any) => {
        if (err.code === "EADDRINUSE" && port < 3010) {
          console.log(`Port ${port} in use, trying ${port + 1}`);
          tryListen(port + 1);
        } else {
          console.error("Failed to start OAuth2 callback server:", err);
        }
      });
  }

  tryListen(3000);
}

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
    icon: (() => {
      // Try to use proper platform-specific icons first, fallback to favicon
      if (process.platform === "win32") {
        const winIcon = path.join(__dirname, "../../assets/icon.ico");
        return require("fs").existsSync(winIcon)
          ? winIcon
          : path.join(__dirname, "../../public/favicon.png");
      } else if (process.platform === "darwin") {
        const macIcon = path.join(__dirname, "../../assets/icon.icns");
        return require("fs").existsSync(macIcon)
          ? macIcon
          : path.join(__dirname, "../../public/favicon.png");
      } else {
        const linuxIcon = path.join(__dirname, "../../assets/icon.png");
        return require("fs").existsSync(linuxIcon)
          ? linuxIcon
          : path.join(__dirname, "../../public/favicon.png");
      }
    })(),
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

  // Start OAuth2 callback server
  createOAuth2Server();

  // Register custom OAuth2 protocol (backup method)
  app.setAsDefaultProtocolClient("mcp-oauth2");

  // Handle OAuth2 callback URLs - both custom protocol and HTTP intercepted URLs
  app.on("open-url", (event, url) => {
    event.preventDefault();
    console.log("🔗 OAuth2 callback URL received via open-url:", url);

    if (
      url.startsWith("mcp-oauth2://callback") ||
      url.includes("oauth_callback.html") ||
      url.includes("oauth-callback.html")
    ) {
      // Send the callback URL to the renderer process
      if (mainWindow) {
        mainWindow.webContents.send("oauth2-callback", url);
      }
    }
  });

  // Also handle the case where OAuth2 URLs are opened directly
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    // Check if any of the command line arguments contain OAuth2 callback
    const oauthUrl = commandLine.find(
      (arg) =>
        arg.includes("oauth_callback.html") ||
        arg.includes("oauth-callback.html") ||
        arg.startsWith("mcp-oauth2://callback")
    );

    if (oauthUrl && mainWindow) {
      console.log("🔗 OAuth2 callback from second instance:", oauthUrl);
      mainWindow.webContents.send("oauth2-callback", oauthUrl);

      // Focus the main window
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Debug: Log store information
  console.log("🔍 Store path:", (store as any).path);
  console.log("🔍 Store size:", (store as any).size);
  console.log(
    "🔍 Store contents:",
    JSON.stringify((store as any).store, null, 2)
  );
  console.log("🔍 Servers in store:", (store as any).get("servers", []));

  // Initialize MCP Manager
  mcpManager = new MCPManager(store, loggingService);
  loggingService.log("MCP Manager initialized", { timestamp: new Date() });

  // Initialize API Server Service with MCP Manager
  apiServerService = new APIServerService(mcpManager);
  loggingService.log("API Server Service initialized", {
    timestamp: new Date(),
  });

  // Initialize Model Service
  modelService = new ModelService(store, loggingService);
  loggingService.log("Model Service initialized", {
    timestamp: new Date(),
  });

  // Initialize Agent with error handling
  try {
    agent = new LangGraphAgent(mcpManager, modelService);
    console.log("LangGraph Agent initialized successfully");
  } catch (error) {
    console.warn("Failed to initialize LangGraph Agent:", error);
    console.warn(
      "Chat functionality will be limited. Please configure a model in settings."
    );
    // Continue without agent - the app can still manage MCP servers
  }

  // Initialize Workflow Agent with error handling
  try {
    workflowAgent = new WorkflowAgent(mcpManager, modelService);
    console.log("Workflow Agent initialized successfully");
  } catch (error) {
    console.warn("Failed to initialize Workflow Agent:", error);
    console.warn(
      "Workflow functionality will be limited. Please configure a model in settings."
    );
    // Continue without workflow agent - the app can still work without it
  }

  // Setup IPC handlers
  setupIpcHandlers();
});

app.on("window-all-closed", async () => {
  // Cleanup OAuth2 server
  if (oauth2Server) {
    oauth2Server.close();
    oauth2Server = null;
  }

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

// Helper function to test remote server connections
async function testRemoteServerConnection(config: {
  url: string;
  authType?: string;
  accessToken?: string;
  apiKey?: string;
  apiKeyHeader?: string;
  username?: string;
  password?: string;
  headers?: Record<string, string>;
}): Promise<{ success: boolean; error?: string; capabilities?: string[] }> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "LangGraph-MCP-Client/1.0.0",
      ...config.headers,
    };

    // Add authentication headers
    switch (config.authType) {
      case "bearer":
        if (config.accessToken) {
          headers["Authorization"] = `Bearer ${config.accessToken}`;
        } else {
          return {
            success: false,
            error: "Bearer token is required but not provided",
          };
        }
        break;
      case "apiKey":
        if (config.apiKey && config.apiKeyHeader) {
          headers[config.apiKeyHeader] = config.apiKey;
        } else {
          return {
            success: false,
            error: "API key and header name are required but not provided",
          };
        }
        break;
      case "basic":
        if (config.username && config.password) {
          const credentials = Buffer.from(
            `${config.username}:${config.password}`
          ).toString("base64");
          headers["Authorization"] = `Basic ${credentials}`;
        } else {
          return {
            success: false,
            error: "Username and password are required but not provided",
          };
        }
        break;
    }

    // Special handling for GitHub MCP server
    if (config.url.includes("api.githubcopilot.com")) {
      if (!config.accessToken) {
        return {
          success: false,
          error:
            "GitHub Personal Access Token is required. Please provide a valid PAT with appropriate permissions in the Bearer Token field.",
        };
      }

      // Validate GitHub token format
      if (
        !config.accessToken.startsWith("github_pat_") &&
        !config.accessToken.startsWith("ghp_")
      ) {
        return {
          success: false,
          error:
            'Invalid GitHub token format. Please use a GitHub Personal Access Token (should start with "github_pat_" or "ghp_").',
        };
      }
    }

    // Use node-fetch for server-side requests (bypasses CORS)
    const response = await fetch(config.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {
            roots: { listChanged: true },
            resources: { subscribe: true, listChanged: true },
            tools: { listChanged: true },
            prompts: { listChanged: true },
            logging: {},
          },
          clientInfo: {
            name: "MCP Studio",
            version: "1.0.0",
          },
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.result) {
        return {
          success: true,
          capabilities: Object.keys(data.result.capabilities || {}),
        };
      } else {
        return {
          success: false,
          error:
            data.error?.message || "Server did not return a valid MCP response",
        };
      }
    } else {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      // Provide specific error messages for common HTTP status codes
      switch (response.status) {
        case 401:
          if (config.url.includes("api.githubcopilot.com")) {
            errorMessage =
              "Authentication failed. Please check your GitHub Personal Access Token. Make sure it has the required permissions and is not expired.";
          } else {
            errorMessage =
              "Authentication failed. Please check your credentials.";
          }
          break;
        case 403:
          errorMessage =
            "Access forbidden. Your credentials may not have sufficient permissions for this resource.";
          break;
        case 404:
          errorMessage =
            "MCP server not found. Please verify the URL is correct.";
          break;
        case 429:
          errorMessage = "Rate limited. Please wait a moment and try again.";
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorMessage =
            "Server error. The MCP server may be temporarily unavailable.";
          break;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Connection failed";
    return {
      success: false,
      error: `Connection error: ${errorMessage}`,
    };
  }
}

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

    // Refresh both agents with updated tools when a server connects
    if (agent) {
      await agent.refreshAgent();
    }
    if (workflowAgent) {
      await workflowAgent.refreshAgent();
    }

    return result;
  });

  ipcMain.handle(IpcChannels.DISCONNECT_SERVER, async (_, id) => {
    const result = await mcpManager.disconnectServer(id);

    // Refresh both agents with updated tools when a server disconnects
    if (agent) {
      await agent.refreshAgent();
    }
    if (workflowAgent) {
      await workflowAgent.refreshAgent();
    }

    return result;
  });

  ipcMain.handle(
    IpcChannels.TEST_REMOTE_SERVER_CONNECTION,
    async (_, config) => {
      return await testRemoteServerConnection(config);
    }
  );

  // Tool operations
  ipcMain.handle(IpcChannels.LIST_TOOLS, async (_, serverId) => {
    console.log("Main process: LIST_TOOLS called with serverId:", serverId);
    try {
      const result = await mcpManager.listToolsForUI(serverId); // Use UI-specific method to hide sequential thinking
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

  // Tool state management
  ipcMain.handle(IpcChannels.GET_TOOL_STATES, async () => {
    return mcpManager.getToolStates();
  });

  ipcMain.handle(
    IpcChannels.SET_TOOL_ENABLED,
    async (_, { toolName, serverId, enabled }) => {
      mcpManager.setToolEnabled(toolName, serverId, enabled);
      return true;
    }
  );

  ipcMain.handle(
    IpcChannels.TOGGLE_TOOL_STATE,
    async (_, { toolName, serverId }) => {
      return mcpManager.toggleToolState(toolName, serverId);
    }
  );

  // Agent operations
  ipcMain.handle(IpcChannels.SEND_MESSAGE, async (_, { message, model }) => {
    if (!agent) {
      throw new Error(
        "Chat agent is not available. Please configure a model in settings."
      );
    }
    return await agent.processMessage(message, model);
  });

  ipcMain.handle(
    IpcChannels.SEND_WORKFLOW_MESSAGE,
    async (_, { message, workflow, node, model }) => {
      if (!agent) {
        throw new Error(
          "Chat agent is not available. Please configure a model in settings."
        );
      }

      // Enhanced prompt for workflow context - use the regular LangGraph agent
      let contextualMessage = message;
      if (workflow && node) {
        contextualMessage = `You are processing a user query within a workflow context. 

Workflow: "${workflow.name}"
Current Node: "${node.data?.label || node.type}" (${node.id})
Node Type: ${node.type}

User Query: "${message}"

Based on the current node type (${
          node.type
        }), help the user accomplish their goal. If this is a:
- server node: Help them understand what MCP server tools are available and how to use them
- tool node: Help them execute the specific tool or understand its parameters  
- conditional node: Help them understand or evaluate conditions
- transform node: Help them transform or process data
- Other node types: Provide relevant assistance for the workflow step

Use available MCP tools when appropriate to help accomplish the user's request.`;
      } else if (workflow) {
        contextualMessage = `You are helping with workflow: "${workflow.name}"

User Query: "${message}"

This workflow has ${workflow.nodes.length} nodes and is designed for: ${
          workflow.description || "workflow automation"
        }

Help the user understand or work with this workflow. Use available MCP tools when appropriate.`;
      }

      return await agent.processMessage(contextualMessage, model);
    }
  );

  ipcMain.handle(IpcChannels.CLEAR_CHAT, async () => {
    if (agent) {
      agent.startNewConversation();
    }
    return { success: true };
  });

  // Model management operations
  ipcMain.handle(IpcChannels.GET_MODEL_CONFIGS, async () => {
    return modelService.getModelConfigs();
  });

  ipcMain.handle(IpcChannels.SAVE_MODEL_CONFIG, async (_, config) => {
    modelService.saveModelConfig(config);
    return { success: true };
  });

  ipcMain.handle(IpcChannels.DELETE_MODEL_CONFIG, async (_, configId) => {
    modelService.deleteModelConfig(configId);
    return { success: true };
  });

  ipcMain.handle(IpcChannels.SET_DEFAULT_MODEL, async (_, configId) => {
    modelService.setDefaultModel(configId);
    return { success: true };
  });

  ipcMain.handle(IpcChannels.TEST_MODEL_CONNECTION, async (_, config) => {
    return await modelService.testModelConnection(config);
  });

  ipcMain.handle(IpcChannels.GET_AVAILABLE_MODELS, async () => {
    return modelService.getAvailableModels();
  });

  ipcMain.handle(IpcChannels.GET_OLLAMA_MODELS, async (_, baseURL) => {
    return await modelService.getOllamaModels(baseURL);
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
    const result = await mcpManager.updateServer(id, config);

    // Reconnect the server with updated configuration
    try {
      await mcpManager.connectServer(id);

      // Refresh both agents with updated tools after server update
      if (agent) {
        await agent.refreshAgent();
      }
      if (workflowAgent) {
        await workflowAgent.refreshAgent();
      }
    } catch (error) {
      console.error(`Failed to reconnect server ${id} after update:`, error);
    }

    return result;
  });

  // OAuth2 operations
  ipcMain.handle("oauth2-open-url", async (_, url) => {
    console.log("🔗 Opening OAuth2 URL in Electron window:", url);

    // Create a new Electron window for OAuth2 instead of opening externally
    const oauth2Window = new BrowserWindow({
      width: 500,
      height: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
      },
      modal: true,
      parent: mainWindow || undefined,
      show: false,
      title: "OAuth2 Authentication",
      autoHideMenuBar: true,
    });

    // Handle navigation to detect callback URL
    oauth2Window.webContents.on("will-navigate", (event, navigationUrl) => {
      console.log("🔗 OAuth2 window navigating to:", navigationUrl);

      // Parse the URL to check for OAuth2 parameters
      const urlObj = new URL(navigationUrl);
      const hasCode = urlObj.searchParams.has("code");
      const hasState = urlObj.searchParams.has("state");
      const hasError = urlObj.searchParams.has("error");

      // Also check URL fragment for authorization code (some providers use hash instead of query params)
      const hasCodeInFragment = urlObj.hash.includes("code=");
      const hasStateInFragment = urlObj.hash.includes("state=");
      const hasErrorInFragment = urlObj.hash.includes("error=");

      // Check if this is a callback URL - more comprehensive check
      const isCallbackUrl =
        navigationUrl.includes("localhost:3000") ||
        navigationUrl.includes("127.0.0.1:3000") ||
        navigationUrl.includes("code=") ||
        navigationUrl.includes("oauth-callback") ||
        navigationUrl.includes("oauth_callback") ||
        hasCode ||
        hasError ||
        hasCodeInFragment ||
        hasErrorInFragment ||
        (navigationUrl.includes("?") && (hasState || hasError)) ||
        (navigationUrl.includes("#") &&
          (hasStateInFragment || hasErrorInFragment));

      console.log("🔗 Is callback URL?", isCallbackUrl);
      console.log("🔗 URL parameters:", {
        hasCode,
        hasState,
        hasError,
        hasCodeInFragment,
        hasStateInFragment,
        hasErrorInFragment,
        searchParams: urlObj.search,
        hash: urlObj.hash,
        pathname: urlObj.pathname,
        hostname: urlObj.hostname,
        port: urlObj.port,
      });

      if (isCallbackUrl) {
        event.preventDefault();

        console.log(
          "🔗 Detected OAuth2 callback, sending to main window:",
          navigationUrl
        );

        // Special handling for IBM SSO OIDC base URL callback
        if (
          navigationUrl === "http://localhost:3000/" &&
          !hasCode &&
          !hasError
        ) {
          console.log(
            "🔗 IBM SSO OIDC base URL detected, checking for authorization code delivery..."
          );

          // Try to execute JavaScript in the OAuth2 window to check for authorization code
          // IBM SSO OIDC might be using localStorage, sessionStorage, or hidden form fields
          oauth2Window.webContents
            .executeJavaScript(
              `
            (function() {
              console.log("🔗 Checking for authorization code in OAuth2 window...");
              
              // Check URL parameters again (sometimes they're set via JavaScript)
              const urlParams = new URLSearchParams(window.location.search);
              const hashParams = new URLSearchParams(window.location.hash.substring(1));
              
              // Check localStorage and sessionStorage
              const localStorageCode = localStorage.getItem('oauth2_code') || localStorage.getItem('code');
              const sessionStorageCode = sessionStorage.getItem('oauth2_code') || sessionStorage.getItem('code');
              
              // Check for any hidden form fields or data attributes
              const codeInputs = document.querySelectorAll('input[name*="code"], input[id*="code"]');
              const hiddenCodes = Array.from(codeInputs).map(input => input.value).filter(Boolean);
              
              // Check for any script tags or data that might contain the code
              const scripts = Array.from(document.querySelectorAll('script')).map(script => script.textContent || script.innerHTML);
              const codeInScripts = scripts.filter(script => script && script.includes('code=')).join('\\n');
              
              const result = {
                url: window.location.href,
                search: window.location.search,
                hash: window.location.hash,
                urlCode: urlParams.get('code'),
                hashCode: hashParams.get('code'),
                localStorageCode,
                sessionStorageCode,
                hiddenCodes,
                codeInScripts: codeInScripts.substring(0, 500), // Limit to first 500 chars
                documentTitle: document.title,
                bodyHTML: document.body ? document.body.innerHTML.substring(0, 1000) : 'No body' // First 1000 chars
              };
              
              console.log("🔗 OAuth2 window inspection result:", result);
              return result;
            })();
          `
            )
            .then((result) => {
              console.log("🔗 OAuth2 window inspection complete:", result);

              // Check if we found an authorization code
              const foundCode =
                result.urlCode ||
                result.hashCode ||
                result.localStorageCode ||
                result.sessionStorageCode ||
                (result.hiddenCodes && result.hiddenCodes.length > 0
                  ? result.hiddenCodes[0]
                  : null);

              if (foundCode) {
                console.log(
                  "🔗 Found authorization code in OAuth2 window:",
                  foundCode
                );
                // Construct a proper callback URL with the found code
                const callbackUrl = `http://localhost:3000/oauth-callback.html?code=${foundCode}&state=${
                  result.urlCode
                    ? new URLSearchParams(result.search).get("state")
                    : ""
                }`;

                if (mainWindow) {
                  mainWindow.webContents.send("oauth2-callback", callbackUrl);
                }
                oauth2Window.close();
              } else {
                console.log(
                  "🔗 No authorization code found in OAuth2 window, sending original callback URL"
                );
                if (mainWindow) {
                  mainWindow.webContents.send("oauth2-callback", navigationUrl);
                }
                oauth2Window.close();
              }
            })
            .catch((error) => {
              console.error("🔗 Error inspecting OAuth2 window:", error);
              if (mainWindow) {
                mainWindow.webContents.send("oauth2-callback", navigationUrl);
              }
              oauth2Window.close();
            });

          return; // Don't close immediately
        }

        // Send the callback URL to the main window
        if (mainWindow) {
          mainWindow.webContents.send("oauth2-callback", navigationUrl);
        }

        // Close the OAuth2 window
        oauth2Window.close();
      }
    });

    // Show window after it's ready to prevent white flash
    oauth2Window.once("ready-to-show", () => {
      oauth2Window.show();
    });

    // Clean up when window is closed
    oauth2Window.on("closed", () => {
      console.log("🔗 OAuth2 window closed");
    });

    // Load the OAuth2 URL
    await oauth2Window.loadURL(url);

    return true;
  });

  // OAuth2 token exchange (moved to main process to avoid CORS)
  ipcMain.handle(
    "oauth2-exchange-token",
    async (_, { config, callbackUrl }) => {
      console.log("🔗 Exchanging OAuth2 code for token in main process");
      console.log("🔗 Callback URL received:", callbackUrl);

      try {
        const url = new URL(callbackUrl);
        const params = new URLSearchParams(url.search);

        // Also check hash parameters
        const hashParams = new URLSearchParams(url.hash.substring(1));

        const code = params.get("code") || hashParams.get("code");
        const state = params.get("state") || hashParams.get("state");
        const error = params.get("error") || hashParams.get("error");
        const errorDescription =
          params.get("error_description") ||
          hashParams.get("error_description");

        console.log("🔗 Parsed callback parameters:", {
          code: code ? `${code.substring(0, 10)}...` : null,
          state: state ? `${state.substring(0, 10)}...` : null,
          error,
          errorDescription,
          fullUrl: callbackUrl,
          search: url.search,
          hash: url.hash,
        });

        if (error) {
          throw new Error(
            `OAuth2 error: ${error}${
              errorDescription ? ` - ${errorDescription}` : ""
            }`
          );
        }

        if (!code) {
          // Check if there's a stored callback in localStorage (this won't work in main process)
          // We need to get this from the renderer process
          console.log("🔗 No authorization code found in URL parameters");

          // Provide detailed error information for debugging
          const debugInfo = {
            callbackUrl,
            pathname: url.pathname,
            search: url.search,
            hash: url.hash,
            searchParams: Object.fromEntries(params.entries()),
            hashParams: Object.fromEntries(hashParams.entries()),
            allParams: [...params.entries(), ...hashParams.entries()],
          };

          console.error(
            "🔗 Authorization code not found. Debug info:",
            debugInfo
          );
          throw new Error(
            `Authorization code not found in callback. Received URL: ${callbackUrl}. Please check that your OAuth2 provider is configured to send the authorization code to the correct redirect URI.`
          );
        }

        // Prepare token exchange request
        const tokenParams = new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: config.redirectUri,
          client_id: config.clientId,
        });

        // Add client secret or PKCE challenge
        if (config.usePKCE && config.codeVerifier) {
          tokenParams.append("code_verifier", config.codeVerifier);
        } else if (config.clientSecret) {
          tokenParams.append("client_secret", config.clientSecret);
        }

        console.log("🔗 Making token exchange request to:", config.tokenUrl);
        console.log("🔗 Token request parameters:", {
          grant_type: "authorization_code",
          client_id: config.clientId,
          redirect_uri: config.redirectUri,
          has_client_secret: !!config.clientSecret,
          has_code_verifier: !!config.codeVerifier,
          usePKCE: config.usePKCE,
        });

        // Prepare headers - IBM SSO OIDC uses client_secret_post authentication method
        const headers = {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          "User-Agent": "LangGraph-MCP-Client/1.0",
        };

        // Create HTTPS agent that ignores SSL certificate errors for development
        const https = await import("https");
        const httpsAgent = new https.Agent({
          rejectUnauthorized: false,
        });

        // Import node-fetch for better control over HTTPS requests
        const fetch = (await import("node-fetch")).default;

        // Make token exchange request using node-fetch with custom agent
        const response = await fetch(config.tokenUrl, {
          method: "POST",
          headers,
          body: tokenParams.toString(),
          // Add HTTPS agent to ignore SSL certificate errors for development
          agent: config.tokenUrl.startsWith("https:") ? httpsAgent : undefined,
        });

        const responseText = await response.text();
        console.log("🔗 Token exchange response status:", response.status);
        console.log(
          "🔗 Token exchange response:",
          responseText.substring(0, 200)
        );

        if (!response.ok) {
          console.error(
            "Token exchange failed:",
            response.status,
            responseText
          );
          throw new Error(
            `Token exchange failed: ${response.status} ${response.statusText} - ${responseText}`
          );
        }

        let tokenResponse;
        try {
          tokenResponse = JSON.parse(responseText);
        } catch (parseError) {
          console.error("Failed to parse token response:", responseText);
          throw new Error("Invalid JSON response from token endpoint");
        }

        console.log("🔗 Token exchange successful");

        return {
          access_token: tokenResponse.access_token,
          refresh_token: tokenResponse.refresh_token,
          expires_in: tokenResponse.expires_in || 3600,
          token_type: tokenResponse.token_type || "Bearer",
          scope: tokenResponse.scope,
        };
      } catch (error) {
        console.error("🔗 Token exchange error:", error);
        throw error;
      }
    }
  );

  // Logging operations
  ipcMain.handle(IpcChannels.GET_LOGS, async () => {
    return loggingService.getLogs();
  });

  ipcMain.handle(IpcChannels.CLEAR_LOGS, async () => {
    return loggingService.clearLogs();
  });

  // Workflow operations
  ipcMain.handle(
    "workflow:execute",
    async (_, workflow, initialData = {}, options = {}) => {
      if (!workflowAgent) {
        throw new Error("Workflow agent not initialized");
      }
      return await workflowAgent.executeWorkflow(
        workflow,
        initialData,
        options
      );
    }
  );

  ipcMain.handle("workflow:process-query", async (_, workflow, query) => {
    console.log("Processing workflow query:", {
      workflowName: workflow.name,
      query,
    });

    if (!workflowAgent) {
      throw new Error(
        "WorkflowAgent not initialized. Please ensure your model is configured properly."
      );
    }

    try {
      const responses = await workflowAgent.processQueryThroughWorkflow(
        workflow,
        query,
        (response) => {
          // Send real-time responses via events
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("workflow-chat-response", response);
          }
        }
      );

      return {
        success: true,
        totalResponses: responses.length,
        finalResponse:
          responses[responses.length - 1]?.message || "Workflow completed",
      };
    } catch (error) {
      console.error("Workflow processing failed:", error);
      throw new Error(
        `Workflow processing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  });

  ipcMain.handle("workflow:get-execution", async (_, executionId) => {
    if (!workflowAgent) {
      return null;
    }
    return workflowAgent.getExecution(executionId);
  });

  ipcMain.handle("workflow:stop-execution", async (_, executionId) => {
    if (!workflowAgent) {
      return false;
    }
    return workflowAgent.stopExecution(executionId);
  });

  ipcMain.handle("workflow:pause-execution", async (_, executionId) => {
    if (!workflowAgent) {
      return false;
    }
    return workflowAgent.stopExecution(executionId); // For now, pause = stop
  });

  ipcMain.handle("workflow:resume-execution", async (_, executionId) => {
    if (!workflowAgent) {
      return false;
    }
    // Resume functionality would need to be implemented in WorkflowAgent
    return false;
  });

  ipcMain.handle(
    "workflow:send-chat-message",
    async (_, executionId, message, context) => {
      if (!workflowAgent) {
        throw new Error("Workflow agent not initialized");
      }

      // Get the execution
      const execution = workflowAgent.getExecution(executionId);
      if (!execution) {
        throw new Error("Execution not found");
      }

      // Process the chat message through the workflow
      // This will be enhanced to provide proper streaming responses
      const response = await agent.processMessage(message);

      return {
        message: response.content,
        timestamp: new Date().toISOString(),
        context: { executionId, ...context },
      };
    }
  );

  ipcMain.handle(
    "workflow:ask-question",
    async (_, workflow, question, context) => {
      console.log("Processing workflow question:", {
        workflowName: workflow.name,
        question,
      });

      if (!agent) {
        throw new Error("Agent not initialized");
      }

      // If workflowAgent is available, use the enhanced chat-based execution
      if (workflowAgent) {
        try {
          const responses = await workflowAgent.processQueryThroughWorkflow(
            workflow,
            question,
            (response) => {
              // Send real-time responses via events
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send("workflow-chat-response", response);
              }
            }
          );

          // Return the final summary
          const finalResponse = responses[responses.length - 1];
          return {
            message: finalResponse?.message || "Workflow processing completed",
            timestamp: new Date().toISOString(),
            context: {
              workflowId: workflow.id,
              totalResponses: responses.length,
              ...context,
            },
          };
        } catch (error) {
          console.error("Enhanced workflow processing failed:", error);
          // Fall back to basic analysis
        }
      }

      // Enhanced fallback using LangGraph agent with workflow context
      const contextualPrompt = `You are helping a user with a workflow called "${
        workflow.name
      }" that has ${workflow.nodes.length} nodes.

Workflow Description: ${workflow.description || "No description provided"}

Workflow Nodes:
${workflow.nodes
  .map(
    (node: any) =>
      `- ${node.type.toUpperCase()}: "${node.data?.label || node.id}"${
        node.data?.serverId ? ` (Uses ${node.data.serverId} server)` : ""
      }${node.data?.toolName ? ` (Executes ${node.data.toolName} tool)` : ""}`
  )
  .join("\n")}

Workflow Flow:
${workflow.edges
  .map(
    (edge: any) =>
      `- ${
        workflow.nodes.find((n: any) => n.id === edge.source)?.data?.label ||
        edge.source
      } → ${
        workflow.nodes.find((n: any) => n.id === edge.target)?.data?.label ||
        edge.target
      }`
  )
  .join("\n")}

User Question: "${question}"

Please provide a helpful response that:
1. Understands the user's question in the context of this workflow
2. Uses any available MCP tools that could help answer their question
3. Explains how this workflow could be used to address their query
4. Provides specific, actionable information rather than generic responses

If the question seems like it could be answered by executing the workflow, suggest how the workflow would process it.`;

      const response = await agent.processMessage(contextualPrompt);

      return {
        message: response.content,
        timestamp: new Date().toISOString(),
        context: {
          workflowId: workflow.id,
          usedTools: response.toolCalls?.length || 0,
          ...context,
        },
      };
    }
  );

  ipcMain.handle("workflow:analyze", async (_, workflow) => {
    if (!agent) {
      throw new Error("Agent not initialized");
    }

    const analysisPrompt = `Analyze this workflow and provide insights:

Workflow: "${workflow.name}"
Description: ${workflow.description || "No description"}
Nodes: ${workflow.nodes.length}
Edges: ${workflow.edges.length}

Node breakdown:
${workflow.nodes
  .map((node: any) => `- ${node.type}: ${node.data?.label || node.id}`)
  .join("\n")}

Please provide:
1. Analysis of the workflow structure
2. Suggestions for improvement
3. Potential issues or problems
4. Optimization recommendations`;

    const response = await agent.processMessage(analysisPrompt);

    return {
      analysis: response.content,
      suggestions: [],
      issues: [],
      optimization: [],
    };
  });

  ipcMain.handle(
    "workflow:generate-code",
    async (_, workflow, format = "javascript") => {
      if (!agent) {
        return `// Workflow code generation not available - agent not initialized`;
      }

      const codePrompt = `Generate ${format} code for this workflow:

Workflow: "${workflow.name}"
Description: ${workflow.description || "No description"}

Nodes:
${workflow.nodes
  .map((node: any) => `- ${node.type}: ${node.data?.label || node.id}`)
  .join("\n")}

Please generate clean, executable ${format} code that represents this workflow.`;

      const response = await agent.processMessage(codePrompt);
      return response.content;
    }
  );

  ipcMain.handle("workflow:get-templates", async () => {
    // Return empty array for now - templates can be added later
    return [];
  });

  ipcMain.handle(
    "workflow:save-template",
    async (_, workflow, templateName, description) => {
      // Template saving functionality can be implemented later
      return true;
    }
  );

  // Public API testing
  ipcMain.handle(
    IpcChannels.TEST_PUBLIC_API,
    async (_, { url, method = "GET", headers = {}, body = null }) => {
      try {
        // Import node-fetch for better control over HTTPS requests
        const fetch = (await import("node-fetch")).default;
        const https = await import("https");

        // Create HTTPS agent that ignores SSL certificate errors for development
        const httpsAgent = new https.Agent({
          rejectUnauthorized: false,
        });

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
          // Add HTTPS agent to ignore SSL certificate errors for development
          agent: url.startsWith("https:") ? httpsAgent : undefined,
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

  // Authentication operations
  ipcMain.handle(
    IpcChannels.FETCH_USER_INFO,
    async (_, { url, accessToken }) => {
      try {
        const fetch = (await import("node-fetch")).default;
        const https = await import("https");

        // Create HTTPS agent that ignores SSL certificate errors for development
        const httpsAgent = new https.Agent({
          rejectUnauthorized: false,
        });

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          agent: url.startsWith("https:") ? httpsAgent : undefined,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const userInfo = await response.json();
        return userInfo;
      } catch (error) {
        console.error("Failed to fetch user info:", error);
        throw error;
      }
    }
  );

  // File operations for server code management
  ipcMain.handle(IpcChannels.SELECT_DIRECTORY, async () => {
    const { ServerStorageService } = await import(
      "./services/ServerStorageService"
    );
    const storageService = ServerStorageService.getInstance();
    return await storageService.selectDirectory();
  });

  ipcMain.handle(
    IpcChannels.READ_SERVER_CODE,
    async (_, serverId, fileName = "server.ts") => {
      const { ServerStorageService } = await import(
        "./services/ServerStorageService"
      );
      const storageService = ServerStorageService.getInstance();
      return await storageService.readServerCode(serverId, fileName);
    }
  );

  ipcMain.handle(
    IpcChannels.WRITE_SERVER_CODE,
    async (_, serverId, fileName, content) => {
      const { ServerStorageService } = await import(
        "./services/ServerStorageService"
      );
      const storageService = ServerStorageService.getInstance();
      return await storageService.writeServerCode(serverId, fileName, content);
    }
  );

  ipcMain.handle(IpcChannels.GET_SERVER_FILES, async (_, serverId) => {
    const { ServerStorageService } = await import(
      "./services/ServerStorageService"
    );
    const storageService = ServerStorageService.getInstance();
    return await storageService.getServerFiles(serverId);
  });

  ipcMain.handle(IpcChannels.OPEN_SERVER_FOLDER, async (_, serverId) => {
    const { ServerStorageService } = await import(
      "./services/ServerStorageService"
    );
    const storageService = ServerStorageService.getInstance();
    return await storageService.openServerFolder(serverId);
  });

  ipcMain.handle(IpcChannels.OPEN_SERVER_IN_VSCODE, async (_, serverId) => {
    const { ServerStorageService } = await import(
      "./services/ServerStorageService"
    );
    const storageService = ServerStorageService.getInstance();
    return await storageService.openServerInVSCode(serverId);
  });

  ipcMain.handle(IpcChannels.GENERATE_MCP_SERVER, async (_, config) => {
    const { MCPServerGenerator } = await import(
      "./services/MCPServerGenerator"
    );
    const generator = MCPServerGenerator.getInstance();
    const result = await generator.generateServer(config);

    // Register the generated server with MCP manager
    try {
      await mcpManager.addServer(result.serverConfig);
      console.log(
        `✅ Registered generated MCP server: ${result.serverConfig.name}`
      );
    } catch (error) {
      console.warn(
        `⚠️ Failed to register generated server with MCP manager:`,
        error
      );
      // Don't fail the generation if registration fails
    }

    return result;
  });

  // Authentication window management
  let authWindow: BrowserWindow | null = null;

  // Get authentication configuration
  ipcMain.handle("get-auth-config", async () => {
    console.log("🔐 Getting authentication configuration");
    return {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        scopes: [
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/userinfo.email",
        ],
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID || "",
        clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
        scopes: ["user:email", "read:user"],
      },
      microsoft: {
        clientId: process.env.MICROSOFT_CLIENT_ID || "",
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
        tenantId: process.env.MICROSOFT_TENANT_ID || "common",
        scopes: ["openid", "profile", "email", "User.Read"],
      },
      ibm: {
        clientId: process.env.IBM_CLIENT_ID || "",
        clientSecret: process.env.IBM_CLIENT_SECRET || "",
        authUrl:
          process.env.IBM_AUTH_URL ||
          "https://w3id.sso.ibm.com/oidc/endpoint/default/authorize",
        tokenUrl:
          process.env.IBM_TOKEN_URL ||
          "https://w3id.sso.ibm.com/oidc/endpoint/default/token",
        userInfoUrl:
          process.env.IBM_USERINFO_URL ||
          "https://w3id.sso.ibm.com/oidc/endpoint/default/userinfo",
        scopes: ["openid", "profile", "email"],
      },
    };
  });

  ipcMain.handle("auth-open-window", async (_, url) => {
    console.log("🔐 Opening authentication window:", url);

    // Close existing auth window if any
    if (authWindow) {
      authWindow.close();
      authWindow = null;
    }

    // Create new authentication window
    authWindow = new BrowserWindow({
      width: 600,
      height: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
      },
      modal: true,
      parent: mainWindow || undefined,
      show: false,
      title: "Authentication",
      autoHideMenuBar: true,
    });

    // Handle navigation to detect callback URL
    authWindow.webContents.on("will-navigate", (event, navigationUrl) => {
      console.log("🔐 Auth window navigating to:", navigationUrl);

      // Check if this is a callback URL
      const isCallbackUrl =
        navigationUrl.includes("localhost:3000") ||
        navigationUrl.includes("127.0.0.1:3000") ||
        navigationUrl.includes("code=") ||
        navigationUrl.includes("oauth-callback") ||
        navigationUrl.includes("oauth_callback") ||
        navigationUrl.includes("error=");

      if (isCallbackUrl) {
        console.log("🔐 Auth callback detected:", navigationUrl);

        // Send callback to renderer
        if (mainWindow) {
          mainWindow.webContents.send("auth-callback", {
            url: navigationUrl,
            type: "callback",
          });
        }

        // Close auth window
        if (authWindow) {
          authWindow.close();
          authWindow = null;
        }
      }
    });

    // Handle window closed
    authWindow.on("closed", () => {
      console.log("🔐 Auth window closed");
      authWindow = null;
    });

    // Show window after ready
    authWindow.once("ready-to-show", () => {
      if (authWindow) {
        authWindow.show();
      }
    });

    // Load the authentication URL
    await authWindow.loadURL(url);

    return true;
  });

  ipcMain.handle("auth-close-window", async () => {
    console.log("🔐 Closing authentication window");
    if (authWindow) {
      authWindow.close();
      authWindow = null;
    }
    return true;
  });

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
