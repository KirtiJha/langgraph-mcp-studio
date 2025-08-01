import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CpuChipIcon,
  PlusIcon,
  ServerIcon,
  ChatBubbleLeftRightIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  PlayIcon,
  StopIcon,
  SparklesIcon,
  CommandLineIcon,
  CogIcon,
  ClipboardDocumentListIcon,
  GlobeAltIcon,
  CodeBracketIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

// Components
import StatusBar from "./components/StatusBar";
import LogsConsole from "./components/LogsConsole";
import SettingsModal from "./components/SettingsModal";
import ToolExecution from "./components/ToolExecution";
import KeyboardShortcuts from "./components/KeyboardShortcuts";
import ChatInterface from "./components/ChatInterface";
import AddServerDialog from "./components/AddServerDialog";
import AddRemoteServerDialog from "./components/AddRemoteServerDialog";
import MCPServerGeneratorDialog from "./components/MCPServerGeneratorDialog";
import ServerConfigModal from "./components/ServerConfigModal";
import ServerCard from "./components/ServerCard";
import ConfirmDialog from "./components/ConfirmDialog";
import APIServerManager from "./components/APIServerManager";
import { ServerCodeEditor } from "./components/ServerCodeEditor";
import PublicAPIExplorer from "./components/PublicAPIExplorer";
import Workflow from "./components/workflow/Workflow";
import LandingPage from "./components/LandingPage";
import LoadingScreen from "./components/LoadingScreen";
import UserMenu from "./components/UserMenu";
import AuthenticatedUserMenu from "./components/AuthenticatedUserMenu";
import { AuthService } from "./services/AuthService";
import { AuthUser } from "../shared/types";
import Logo from "./components/Logo";
import DevModeIndicator from "./components/DevModeIndicator";
import ErrorBoundary from "./components/ErrorBoundary";
import APIServerService from "./services/APIServerService";
import PublicAPIToMCPService from "./services/PublicAPIToMCPService";
import { LogsProvider } from "./stores/logsStore";
import { ThemeProvider } from "./providers/ThemeProvider";
import { SettingsProvider } from "./providers/SettingsProvider";

// Types
import {
  ServerConfig,
  ServerStatus as SharedServerStatus,
  Tool,
  ModelConfig,
} from "../shared/types";
import { APIServerConfig } from "../shared/apiServerTypes";
import { PublicAPISpec } from "../shared/publicApiTypes";

// Types
interface ServerStatus {
  id: string;
  name: string;
  connected: boolean;
  error?: string;
  uptime?: number;
  lastActivity?: Date;
  connectionStartTime?: Date;
}

interface BaseChatMessage {
  id: string;
  timestamp: Date;
}

interface UserMessage extends BaseChatMessage {
  role: "user";
  content: string;
}

interface AssistantMessage extends BaseChatMessage {
  role: "assistant";
  content: string;
  toolCalls?: Array<{
    name: string;
    args: any;
    result?: any;
    status?: "executing" | "completed" | "failed";
    duration?: number;
  }>;
  error?: string;
  isExecutingTools?: boolean;
}

interface ToolExecutionMessage extends BaseChatMessage {
  role: "tool-execution";
  content?: string;
  tools: Array<{
    name: string;
    args: any;
    status: "queued" | "executing" | "completed" | "failed";
    result?: any;
    duration?: number;
    startTime?: Date;
    modelId?: string; // ID of the model used for this tool
  }>;
}

type ChatMessage = UserMessage | AssistantMessage | ToolExecutionMessage;

function App() {
  // Check if running in browser mode (e.g., after OAuth2 callback)
  const [isBrowserMode, setIsBrowserMode] = useState(() => {
    return !window.electronAPI;
  });

  // Authentication state with new service
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const authService = AuthService.getInstance();
    return authService.isAuthenticated();
  });

  // Existing states
  const [servers, setServers] = useState<ServerStatus[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [serverConfigs, setServerConfigs] = useState<ServerConfig[]>([]);
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [apiServers, setApiServers] = useState<APIServerConfig[]>([]);
  const [selectedTab, _setSelectedTab] = useState("servers");

  // Wrapper for setSelectedTab with logging
  const setSelectedTab = (tab: string) => {
    _setSelectedTab(tab);
  };
  const [isLoading, setIsLoading] = useState(true);
  const [connectingServers, setConnectingServers] = useState<Set<string>>(
    new Set()
  );
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAddServerOpen, setIsAddServerOpen] = useState(false);
  const [isAddRemoteServerOpen, setIsAddRemoteServerOpen] = useState(false);
  const [isGenerateServerOpen, setIsGenerateServerOpen] = useState(false);
  const [isServerConfigOpen, setIsServerConfigOpen] = useState(false);
  const [selectedServerConfig, setSelectedServerConfig] =
    useState<ServerConfig | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [serverConfigMode, setServerConfigMode] = useState<
    "view" | "edit" | "create"
  >("view");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [codeEditorServerId, setCodeEditorServerId] = useState<string | null>(
    null
  );

  // Initialize authentication service
  useEffect(() => {
    const authService = AuthService.getInstance();

    // Check if user is already authenticated
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
    }

    // Listen for authentication changes
    const unsubscribe = authService.addAuthListener((user) => {
      setCurrentUser(user);
      setIsAuthenticated(user !== null);
    });

    return unsubscribe;
  }, []);

  // Load data when authenticated
  useEffect(() => {
    console.log("🔐 Authentication state changed:", {
      isAuthenticated,
      hasElectronAPI: !!window.electronAPI,
    });

    // Only load data if authenticated and electronAPI is available
    if (isAuthenticated && window.electronAPI) {
      console.log("🔐 User authenticated, loading initial data...");

      // Load initial data
      loadData();

      // Set up event listeners for real-time server status updates
      const unsubscribeConnected = window.electronAPI.on(
        "server-connected",
        (serverId: string) => {
          console.log("📡 Server connected event received:", serverId);
          // Update the specific server's status
          setServers((prevServers) =>
            prevServers.map((server) =>
              server.id === serverId
                ? {
                    ...server,
                    connected: true,
                    connectionStartTime: new Date(),
                    uptime: 0,
                  }
                : server
            )
          );
          // Refresh tools list to get the latest tools from the connected server
          if (window.electronAPI) {
            window.electronAPI
              .listTools()
              .then((toolList) => {
                console.log(
                  "🔧 Updated tools after server connection:",
                  toolList
                );
                setTools(toolList);
              })
              .catch((error) => {
                console.error(
                  "Error refreshing tools after server connection:",
                  error
                );
              });
          }
        }
      );

      const unsubscribeDisconnected = window.electronAPI.on(
        "server-disconnected",
        (serverId: string) => {
          console.log("📡 Server disconnected event received:", serverId);
          // Update the specific server's status
          setServers((prevServers) =>
            prevServers.map((server) =>
              server.id === serverId
                ? {
                    ...server,
                    connected: false,
                    uptime: 0,
                    connectionStartTime: undefined,
                  }
                : server
            )
          );
          // Remove tools from disconnected server
          setTools((prevTools) =>
            prevTools.filter((tool) => tool.serverId !== serverId)
          );
        }
      );

      const unsubscribeError = window.electronAPI.on(
        "server-error",
        ({ serverId, error }: { serverId: string; error: string }) => {
          console.log("📡 Server error event received:", serverId, error);
          // Update the specific server's status with error
          setServers((prevServers) =>
            prevServers.map((server) =>
              server.id === serverId
                ? { ...server, connected: false, error }
                : server
            )
          );
        }
      );

      // Cleanup event listeners when component unmounts or auth changes
      return () => {
        if (window.electronAPI) {
          unsubscribeConnected();
          unsubscribeDisconnected();
          unsubscribeError();
        }
      };
    } else if (isAuthenticated && !window.electronAPI) {
      // Handle browser mode - show message that Electron is required
      console.warn(
        "🌐 App is running in browser mode - Electron features unavailable"
      );
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Set up periodic refresh for server data (uptime and last activity)
  useEffect(() => {
    if (!isAuthenticated || !window.electronAPI) return;

    const interval = setInterval(async () => {
      try {
        const serverList = await window.electronAPI.listServers();

        // Convert date strings back to Date objects for servers
        const processedServers = serverList.map((server: any) => ({
          ...server,
          lastActivity: server.lastActivity
            ? new Date(server.lastActivity)
            : undefined,
          connectionStartTime: server.connectionStartTime
            ? new Date(server.connectionStartTime)
            : undefined,
        }));

        setServers(processedServers);
        setLastUpdate(new Date());
      } catch (error) {
        console.error("Error refreshing server data:", error);
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem("mcp_studio_authenticated", "true");
  };

  const handleLogout = () => {
    const authService = AuthService.getInstance();
    authService.signOut();
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("mcp_studio_authenticated");
    // Clear any cached data
    setServers([]);
    setTools([]);
    setServerConfigs([]);
    setApiServers([]);
    setChatMessages([]);
  };

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Check if electronAPI is available
      if (!window.electronAPI) {
        console.warn("ElectronAPI not available - running in browser mode");
        setIsLoading(false);
        return;
      }

      const [serverList, toolList, apiServerList] = await Promise.all([
        window.electronAPI.listServers(),
        window.electronAPI.listTools(),
        APIServerService.getAllServers(),
      ]);

      // Load models
      let modelList: ModelConfig[] = [];
      try {
        modelList = await window.electronAPI.getModelConfigs();
      } catch (error) {
        console.warn("Failed to load models:", error);
      }

      // Convert date strings back to Date objects for servers
      const processedServers = serverList.map((server: any) => ({
        ...server,
        lastActivity: server.lastActivity
          ? new Date(server.lastActivity)
          : undefined,
        connectionStartTime: server.connectionStartTime
          ? new Date(server.connectionStartTime)
          : undefined,
      }));

      setServers(processedServers);
      setTools(toolList);
      setModels(modelList);
      setApiServers(apiServerList);

      // Load configurations for all servers
      const configs = await Promise.all(
        serverList.map(async (server: ServerStatus) => {
          try {
            return await window.electronAPI.getServerConfig(server.id);
          } catch (error) {
            console.error(
              `Failed to load config for server ${server.id}:`,
              error
            );
            return null;
          }
        })
      );

      setServerConfigs(
        configs.filter((config): config is ServerConfig => config !== null)
      );
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get model name by ID
  const getModelNameById = (
    modelId: string | undefined
  ): string | undefined => {
    if (!modelId) return undefined;
    const model = models.find((m) => m.id === modelId);
    return model ? `${model.name} (${model.provider})` : undefined;
  };

  // Helper function to get model name from model ID
  const getModelName = (modelId: string | undefined): string => {
    if (!modelId) return "Default";
    const model = models.find((m) => m.id === modelId);
    return model ? model.modelId : "Unknown Model";
  };

  const handleConnect = async (serverId: string) => {
    try {
      setConnectingServers((prev) => new Set(prev).add(serverId));
      await window.electronAPI.connectServer(serverId);
      // No need to reload data - real-time events will update the UI
    } catch (error) {
      console.error("Error connecting server:", error);
      // Optionally show an error message to the user
    } finally {
      setConnectingServers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(serverId);
        return newSet;
      });
    }
  };

  const handleDisconnect = async (serverId: string) => {
    try {
      setConnectingServers((prev) => new Set(prev).add(serverId));
      await window.electronAPI.disconnectServer(serverId);
      // No need to reload data - real-time events will update the UI
    } catch (error) {
      console.error("Error disconnecting server:", error);
      // Optionally show an error message to the user
    } finally {
      setConnectingServers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(serverId);
        return newSet;
      });
    }
  };

  const handleAddServer = async (serverConfig: ServerConfig) => {
    try {
      await window.electronAPI.addServer(serverConfig);
      await loadData();
      setIsAddServerOpen(false);
    } catch (error) {
      console.error("Error adding server:", error);
    }
  };

  const handleGenerateServer = async (config: any) => {
    try {
      const result = await window.electronAPI.generateMCPServer(config);
      console.log("✅ Generated MCP server:", result);

      // Small delay to ensure files are fully written to disk
      await new Promise((resolve) => setTimeout(resolve, 100));

      await loadData(); // Refresh the server list
      // Optionally switch to the server code editor
      setCodeEditorServerId(result.serverId);
      setShowCodeEditor(true);
    } catch (error) {
      console.error("❌ Error generating MCP server:", error);
    }
  };

  const handleViewServerConfig = async (serverId: string) => {
    try {
      console.log("🔍 handleViewServerConfig called with serverId:", serverId);
      console.log("📋 Current apiServers:", apiServers);
      console.log("📋 Current servers:", servers);

      // Check if this is a generated API-to-MCP server
      const isGeneratedServer = apiServers.some((apiServer) => {
        const matches =
          apiServer.id === serverId ||
          apiServer.name === servers.find((s) => s.id === serverId)?.name;
        console.log(
          `🔍 Checking apiServer ${apiServer.id} (${apiServer.name}) against serverId ${serverId}: ${matches}`
        );
        return matches;
      });

      console.log("🎯 isGeneratedServer:", isGeneratedServer);

      if (isGeneratedServer) {
        // Open the code editor for generated servers
        console.log("📝 Opening code editor for server:", serverId);
        setCodeEditorServerId(serverId);
        setShowCodeEditor(true);
      } else {
        // Open the config modal for regular MCP servers
        console.log("⚙️ Opening config modal for server:", serverId);
        const config = await window.electronAPI.getServerConfig(serverId);
        setSelectedServerConfig(config);
        setSelectedServerId(serverId);
        setServerConfigMode("view");
        setIsServerConfigOpen(true);
      }
    } catch (error) {
      console.error("Error handling server view:", error);
    }
  };

  const handleEditServerConfig = async (serverId: string) => {
    try {
      const config = await window.electronAPI.getServerConfig(serverId);
      setSelectedServerConfig(config);
      setSelectedServerId(serverId);
      setServerConfigMode("edit");
      setIsServerConfigOpen(true);
    } catch (error) {
      console.error("Error fetching server config:", error);
    }
  };

  const handleSaveServerConfig = async (config: ServerConfig) => {
    try {
      if (selectedServerId) {
        await window.electronAPI.updateServer(selectedServerId, config);
      } else {
        await window.electronAPI.addServer(config);
      }
      await loadData();
      setIsServerConfigOpen(false);
      setSelectedServerConfig(null);
      setSelectedServerId(null);
    } catch (error) {
      console.error("Error saving server config:", error);
    }
  };

  const handleDeleteServer = async (serverId: string) => {
    const server = servers.find((s) => s.id === serverId);
    const serverName = server?.name || serverId;

    setServerToDelete({ id: serverId, name: serverName });
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteServer = async () => {
    if (!serverToDelete) return;

    try {
      // First, check if this server also exists as an API server and remove it
      const serverName = serverToDelete.name;
      const matchingApiServer = apiServers.find(
        (apiServer) =>
          apiServer.name === serverName || apiServer.id === serverToDelete.id
      );

      if (matchingApiServer) {
        console.log(
          `Deleting matching API server: ${matchingApiServer.name} (${matchingApiServer.id})`
        );
        try {
          await APIServerService.deleteServer(matchingApiServer.id);
        } catch (apiError) {
          console.warn("Failed to delete matching API server:", apiError);
          // Continue with MCP server deletion even if API server deletion fails
        }
      }

      // Then remove the MCP server
      await window.electronAPI.removeServer(serverToDelete.id);
      await loadData();
      setIsDeleteDialogOpen(false);
      setServerToDelete(null);
    } catch (error) {
      console.error("Error deleting server:", error);
      alert("Failed to delete server. Please try again.");
    }
  };

  const cancelDeleteServer = () => {
    setIsDeleteDialogOpen(false);
    setServerToDelete(null);
  };

  const handleCloseServerConfig = () => {
    setIsServerConfigOpen(false);
    setSelectedServerConfig(null);
    setSelectedServerId(null);
  };

  // Calculate tool count for each server
  const getToolCountForServer = (serverId: string) => {
    return tools.filter((tool) => tool.serverId === serverId).length;
  };

  const getContextParamsCountForServer = (serverId: string) => {
    const serverConfig = serverConfigs.find(
      (config: ServerConfig) => config.id === serverId
    );
    if (!serverConfig?.contextParams) return 0;

    // Count total parameters across all tools
    return Object.keys(serverConfig.contextParams || {}).length;
  };

  const sendMessage = async (
    message: string,
    model: string = "ibm/granite-3-3-8b-instruct"
  ) => {
    if (!message.trim() || isSending) return;

    const userMessage: UserMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setIsSending(true);

    try {
      const response = await window.electronAPI.sendMessage({ message, model });

      // Extract the thought section from the response content (if it starts with 💭)
      let thoughtContent = "";
      let cleanContent = response.content;

      if (response.content.startsWith("💭")) {
        const thoughtMatch = response.content.match(
          /💭 \*\*My Plan\*\*: (.*?)(?:\n\n)([\s\S]*)/
        );
        if (thoughtMatch) {
          thoughtContent = thoughtMatch[1];
          cleanContent = thoughtMatch[2];
        }
      }

      // If we have a thought, show it first
      if (thoughtContent) {
        const thoughtMessage: AssistantMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: thoughtContent,
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, thoughtMessage]);
      }

      // Check if the response contains tool calls information
      if (response.toolCalls && response.toolCalls.length > 0) {
        // Create separate tool execution messages for each tool
        const toolExecutionMessages: ToolExecutionMessage[] =
          response.toolCalls.map((tool: any, index: number) => ({
            id: (Date.now() + 2 + index).toString(),
            role: "tool-execution" as const,
            content: `Executing ${tool.name}...`,
            timestamp: new Date(),
            tools: [
              {
                name: tool.name,
                args: tool.args,
                result: tool.result,
                status: "completed" as const,
                duration: tool.duration,
                modelId: tool.modelId, // Include model information
              },
            ],
          }));

        // Add all tool execution messages at once
        setChatMessages((prev) => [...prev, ...toolExecutionMessages]);
      }

      // Then add the assistant's clean response (without the thought section)
      const assistantMessage: AssistantMessage = {
        id: (Date.now() + 100).toString(),
        role: "assistant",
        content: cleanContent,
        timestamp: new Date(),
        toolCalls: response.toolCalls,
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: AssistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Sorry, I encountered an error while processing your message. Please try again.",
        timestamp: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const clearChat = async () => {
    setChatMessages([]);
    // Also clear the agent's conversation state
    try {
      await window.electronAPI.clearChat();
    } catch (error) {
      console.error("Error clearing agent chat state:", error);
    }
  };

  const handleKeyboardAction = (action: string) => {
    switch (action) {
      case "switch-servers":
        setSelectedTab("servers");
        break;
      case "switch-tools":
        setSelectedTab("tools");
        break;
      case "switch-chat":
        setSelectedTab("chat");
        break;
      case "switch-resources":
        setSelectedTab("workflows");
        break;
      case "switch-logs":
        setSelectedTab("logs");
        break;
      case "switch-public-apis":
        setSelectedTab("public-apis");
        break;
      case "switch-private-apis":
        setSelectedTab("private-apis");
        break;
      case "add-server":
        setIsAddServerOpen(true);
        break;
      case "refresh":
        loadData();
        break;
      case "open-settings":
        setIsSettingsOpen(true);
        break;
      case "close-modal":
        setIsSettingsOpen(false);
        setIsAddServerOpen(false);
        break;
      case "reset-auth":
        // Debug shortcut: Reset authentication
        localStorage.removeItem("mcp_studio_authenticated");
        setIsAuthenticated(false);
        console.log("🔐 Authentication reset via keyboard shortcut");
        break;
    }
  };

  const handleExecuteTool = async (
    toolName: string,
    args: any,
    serverId?: string
  ) => {
    try {
      console.log(
        `🔧 Executing tool ${toolName} on server ${serverId} with args:`,
        args
      );

      if (!serverId) {
        throw new Error("No server ID provided for tool execution");
      }

      // Make actual IPC call to execute the tool
      const result = await window.electronAPI.executeTool(
        serverId,
        toolName,
        args
      );

      console.log(`✅ Tool ${toolName} executed successfully:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Tool ${toolName} execution failed:`, error);
      throw error;
    }
  };

  const handleConvertPublicAPIToMCP = async (publicAPI: PublicAPISpec) => {
    try {
      // Convert the public API to MCP server configuration
      const mcpConfig = await PublicAPIToMCPService.convertToMCP(publicAPI);

      // Create the API server using the existing service
      await APIServerService.saveServer(mcpConfig);

      // Reload data to reflect the new server
      await loadData();

      // Switch to the API servers tab to show the newly created server
      setSelectedTab("api-servers");

      // Show success notification (if you have a notification system)
      console.log(`Successfully converted ${publicAPI.name} to MCP server`);
    } catch (error) {
      console.error("Failed to convert public API to MCP:", error);
      // Show error notification
      alert(
        `Failed to convert ${publicAPI.name} to MCP server: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleCreateAPIServer = async (config: APIServerConfig) => {
    try {
      // Create the API server using the existing service
      await APIServerService.saveServer(config);

      // Reload data to reflect the new server
      await loadData();

      // Switch to the API servers tab to show the newly created server
      setSelectedTab("api-servers");

      // Show success notification
      console.log(`Successfully created API server: ${config.name}`);
    } catch (error) {
      console.error("Failed to create API server:", error);
      // Show error notification
      alert(
        `Failed to create API server: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  // Handle OAuth2 callback and browser mode
  useEffect(() => {
    // Check if this is an OAuth2 callback
    if (isBrowserMode && window.location.search.includes("code=")) {
      console.log("🔐 OAuth2 callback detected in browser mode");

      // Show a message to the user about the OAuth2 callback
      const message =
        "OAuth2 authentication completed! Please return to the main application.";

      // Try to close the window if it was opened as a popup
      if (window.opener) {
        window.close();
      } else {
        // Show a message to the user
        alert(message);
      }
      return;
    }

    // Check if there's a stored OAuth2 callback to process
    const storedCallback = localStorage.getItem("oauth2_callback");
    if (storedCallback) {
      try {
        const callbackData = JSON.parse(storedCallback);
        // Only process if it's recent (within 5 minutes)
        if (Date.now() - callbackData.timestamp < 5 * 60 * 1000) {
          console.log("🔐 Processing stored OAuth2 callback");
          // Clear the stored callback
          localStorage.removeItem("oauth2_callback");

          // If we have electronAPI, send the callback data
          if (window.electronAPI) {
            // Send the callback to the OAuth2 flow component
            window.dispatchEvent(
              new CustomEvent("oauth2-callback-processed", {
                detail: callbackData,
              })
            );
          }
        }
      } catch (error) {
        console.error("Error processing stored OAuth2 callback:", error);
        localStorage.removeItem("oauth2_callback");
      }
    }
  }, [isBrowserMode]);

  const handleToolStateChange = async (
    toolName: string,
    serverId: string,
    enabled: boolean
  ) => {
    // Update local tools state immediately for responsive UI
    setTools((prevTools) =>
      prevTools.map((tool) =>
        tool.name === toolName && tool.serverId === serverId
          ? { ...tool, enabled }
          : tool
      )
    );

    // Optionally refresh tools from server to ensure consistency
    try {
      const updatedTools = await window.electronAPI.listTools();
      setTools(updatedTools);
    } catch (error) {
      console.error("Error refreshing tools after state change:", error);
    }
  };

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SettingsProvider>
          <LogsProvider>
            {/* Handle OAuth2 callback in browser mode */}
            {isBrowserMode && window.location.search.includes("code=") ? (
              <div className="h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                  <h2 className="text-xl font-semibold mb-2">
                    OAuth2 Authentication Complete
                  </h2>
                  <p className="text-slate-400 mb-4">
                    Authentication successful! Please return to the main MCP
                    Studio application.
                  </p>
                  <button
                    onClick={() => {
                      if (window.opener) {
                        window.close();
                      } else {
                        window.location.href = "/";
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
                  >
                    {window.opener ? "Close Window" : "Return to App"}
                  </button>
                </div>
              </div>
            ) : isBrowserMode ? (
              // Browser mode without OAuth2 callback - show message
              <div className="h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="text-6xl mb-4">🖥️</div>
                  <h2 className="text-2xl font-bold mb-4">
                    Electron App Required
                  </h2>
                  <p className="text-slate-400 mb-6">
                    MCP Studio is designed to run as an Electron application.
                    Please download and install the desktop version to access
                    all features.
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm text-slate-500">
                      If you're seeing this after OAuth2 authentication, please
                      return to the main application.
                    </p>
                  </div>
                </div>
              </div>
            ) : !isAuthenticated ? (
              <LandingPage onLogin={handleLogin} />
            ) : isLoading ? (
              <LoadingScreen message="Initializing MCP Studio..." />
            ) : (
              <div className="h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased overflow-hidden">
                {/* Development Mode Indicator */}
                <DevModeIndicator
                  message="Development Mode Active"
                  position="top"
                />

                {/* Keyboard Shortcuts Handler */}
                <KeyboardShortcuts onAction={handleKeyboardAction} />

                {/* Settings Modal */}
                <SettingsModal
                  isOpen={isSettingsOpen}
                  onClose={() => setIsSettingsOpen(false)}
                />

                {/* Add Server Dialog */}
                <AddServerDialog
                  open={isAddServerOpen}
                  onClose={() => setIsAddServerOpen(false)}
                  onAdd={handleAddServer}
                />

                {/* Add Remote Server Dialog */}
                <AddRemoteServerDialog
                  open={isAddRemoteServerOpen}
                  onClose={() => setIsAddRemoteServerOpen(false)}
                  onAdd={handleAddServer}
                />

                {/* MCP Server Generator Dialog */}
                <MCPServerGeneratorDialog
                  open={isGenerateServerOpen}
                  onOpenChange={setIsGenerateServerOpen}
                  onGenerate={handleGenerateServer}
                />

                {/* Server Configuration Modal */}
                <ServerConfigModal
                  isOpen={isServerConfigOpen}
                  onClose={handleCloseServerConfig}
                  onSave={(config) => {
                    handleSaveServerConfig(config);
                  }}
                  serverConfig={selectedServerConfig}
                  mode={serverConfigMode}
                />

                {/* Delete Server Confirmation Dialog */}
                <ConfirmDialog
                  open={isDeleteDialogOpen}
                  title="Delete Server"
                  message={`Are you sure you want to delete the server "${serverToDelete?.name}"? This action cannot be undone.`}
                  confirmText="Delete"
                  cancelText="Cancel"
                  onConfirm={confirmDeleteServer}
                  onCancel={cancelDeleteServer}
                  destructive={true}
                />

                {/* Server Code Editor */}
                {showCodeEditor && codeEditorServerId && (
                  <ServerCodeEditor
                    serverId={codeEditorServerId}
                    serverName={
                      servers.find((s) => s.id === codeEditorServerId)?.name ||
                      apiServers.find((s) => s.id === codeEditorServerId)
                        ?.name ||
                      "Unknown Server"
                    }
                    isOpen={showCodeEditor}
                    onClose={() => {
                      setShowCodeEditor(false);
                      setCodeEditorServerId(null);
                    }}
                  />
                )}
                {/* Modern Header with Glass Effect */}
                <motion.header
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 px-6 py-3 relative z-30 titlebar"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5"></div>
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Logo size="sm" />
                      <div>
                        <h1 className="text-lg font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                          MCP Studio
                        </h1>
                        <p className="text-xs text-slate-400 font-medium">
                          Model Context Protocol Client
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 no-drag">
                      <div className="flex items-center space-x-2 px-2.5 py-1.5 bg-slate-800/50 rounded-md border border-slate-700/50">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            servers.some((s) => s.connected)
                              ? "bg-emerald-400"
                              : "bg-slate-500"
                          }`}
                        ></div>
                        <span className="text-xs text-slate-300">
                          {servers.filter((s) => s.connected).length} /{" "}
                          {servers.length} connected
                        </span>
                      </div>

                      <button
                        onClick={() => setIsAddServerOpen(true)}
                        className="group relative bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-1.5 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-md hover:shadow-indigo-500/25 hover:scale-105 text-sm"
                      >
                        <div className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                        <PlusIcon className="w-3.5 h-3.5 relative z-10" />
                        <span className="font-medium relative z-10">
                          Add Server
                        </span>
                      </button>

                      <button
                        onClick={() => setIsAddRemoteServerOpen(true)}
                        className="group relative bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-4 py-1.5 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-md hover:shadow-emerald-500/25 hover:scale-105 text-sm"
                      >
                        <div className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                        <GlobeAltIcon className="w-3.5 h-3.5 relative z-10" />
                        <span className="font-medium relative z-10">
                          Add Remote Server
                        </span>
                      </button>

                      <button
                        onClick={() => setIsGenerateServerOpen(true)}
                        className="group relative bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-4 py-1.5 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-md hover:shadow-orange-500/25 hover:scale-105 text-sm"
                      >
                        <div className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                        <CodeBracketIcon className="w-3.5 h-3.5 relative z-10" />
                        <span className="font-medium relative z-10">
                          Generate Server
                        </span>
                      </button>

                      <UserMenu
                        user={currentUser || undefined}
                        onLogout={handleLogout}
                        onSettings={() => setIsSettingsOpen(true)}
                        onSignIn={() => {
                          // This shouldn't happen if user is authenticated, but just in case
                          console.log(
                            "Sign in button clicked from authenticated state"
                          );
                        }}
                      />
                    </div>
                  </div>
                </motion.header>

                <div className="flex flex-1 overflow-hidden">
                  {/* Enhanced Collapsible Sidebar */}
                  <aside
                    className={`${
                      isSidebarCollapsed ? "w-16" : "w-64"
                    } bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/50 flex flex-col transition-all duration-300 ease-in-out`}
                  >
                    {/* Sidebar Header with Toggle */}
                    <div className="p-4 border-b border-slate-800/50">
                      <div className="flex items-center justify-between">
                        {!isSidebarCollapsed && (
                          <h2 className="text-sm font-semibold text-slate-200">
                            Navigation
                          </h2>
                        )}
                        <button
                          onClick={() =>
                            setIsSidebarCollapsed(!isSidebarCollapsed)
                          }
                          className="p-1.5 rounded-lg hover:bg-slate-800/50 transition-colors duration-200 text-slate-400 hover:text-slate-200"
                          title={
                            isSidebarCollapsed
                              ? "Expand sidebar"
                              : "Collapse sidebar"
                          }
                        >
                          {isSidebarCollapsed ? (
                            <ChevronRightIcon className="w-4 h-4" />
                          ) : (
                            <ChevronLeftIcon className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Navigation */}
                    <nav
                      className={`${isSidebarCollapsed ? "p-2" : "p-4"} flex-1`}
                    >
                      <div className="space-y-2">
                        {[
                          {
                            id: "servers",
                            label: "MCP Servers",
                            icon: ServerIcon,
                            count: servers.length,
                            color: "emerald",
                          },
                          {
                            id: "public-apis",
                            label: "Public APIs",
                            icon: GlobeAltIcon,
                            count: 0,
                            color: "cyan",
                          },
                          {
                            id: "api-servers",
                            label: "API to MCP",
                            icon: ServerIcon,
                            count: apiServers.length,
                            color: "indigo",
                          },
                          {
                            id: "tools",
                            label: "Tools",
                            icon: WrenchScrewdriverIcon,
                            count: tools.length,
                            color: "blue",
                          },
                          {
                            id: "chat",
                            label: "AI Chat",
                            icon: ChatBubbleLeftRightIcon,
                            count: chatMessages.length,
                            color: "purple",
                          },
                          {
                            id: "workflows",
                            label: "Workflows",
                            icon: CommandLineIcon,
                            count: 0,
                            color: "emerald",
                          },
                          {
                            id: "logs",
                            label: "Logs",
                            icon: ClipboardDocumentListIcon,
                            count: 0,
                            color: "slate",
                          },
                        ].map((tab) => {
                          const isActive = selectedTab === tab.id;
                          const colorClasses = {
                            emerald: isActive
                              ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                              : "hover:bg-emerald-500/10 hover:border-emerald-500/20",
                            cyan: isActive
                              ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-300"
                              : "hover:bg-cyan-500/10 hover:border-cyan-500/20",
                            indigo: isActive
                              ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300"
                              : "hover:bg-indigo-500/10 hover:border-indigo-500/20",
                            blue: isActive
                              ? "bg-blue-500/20 border-blue-500/30 text-blue-300"
                              : "hover:bg-blue-500/10 hover:border-blue-500/20",
                            purple: isActive
                              ? "bg-purple-500/20 border-purple-500/30 text-purple-300"
                              : "hover:bg-purple-500/10 hover:border-purple-500/20",
                            amber: isActive
                              ? "bg-amber-500/20 border-amber-500/30 text-amber-300"
                              : "hover:bg-amber-500/10 hover:border-amber-500/20",
                            slate: isActive
                              ? "bg-slate-500/20 border-slate-500/30 text-slate-300"
                              : "hover:bg-slate-500/10 hover:border-slate-500/20",
                          };

                          return (
                            <button
                              key={tab.id}
                              onClick={() => setSelectedTab(tab.id)}
                              className={`group w-full flex items-center ${
                                isSidebarCollapsed
                                  ? "justify-center px-2 py-3"
                                  : "justify-between px-3 py-2"
                              } rounded-lg text-left transition-all duration-200 border text-sm ${
                                isActive
                                  ? `${
                                      colorClasses[
                                        tab.color as keyof typeof colorClasses
                                      ]
                                    } shadow-md scale-105`
                                  : `text-slate-300 border-transparent ${
                                      colorClasses[
                                        tab.color as keyof typeof colorClasses
                                      ]
                                    } hover:text-white`
                              }`}
                              title={isSidebarCollapsed ? tab.label : undefined}
                            >
                              {isSidebarCollapsed ? (
                                // Collapsed view - icon only
                                <div className="relative">
                                  <div
                                    className={`p-1 rounded-md transition-colors duration-200 ${
                                      isActive
                                        ? "bg-white/10"
                                        : "group-hover:bg-white/5"
                                    }`}
                                  >
                                    <tab.icon className="w-5 h-5" />
                                  </div>
                                  {tab.count > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                                      {tab.count > 99 ? "99+" : tab.count}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                // Expanded view - icon and label
                                <>
                                  <div className="flex items-center space-x-2.5">
                                    <div
                                      className={`p-1 rounded-md transition-colors duration-200 ${
                                        isActive
                                          ? "bg-white/10"
                                          : "group-hover:bg-white/5"
                                      }`}
                                    >
                                      <tab.icon className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium">
                                      {tab.label}
                                    </span>
                                  </div>
                                  {tab.count > 0 && (
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors duration-200 ${
                                        isActive
                                          ? "bg-white/20 text-white"
                                          : "bg-slate-700/50 text-slate-400 group-hover:bg-slate-600/50 group-hover:text-slate-300"
                                      }`}
                                    >
                                      {tab.count}
                                    </span>
                                  )}
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </nav>

                    {/* Enhanced Server Status */}
                    <div
                      className={`mt-auto ${
                        isSidebarCollapsed ? "p-2" : "p-4"
                      } border-t border-slate-800/50`}
                    >
                      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-slate-700/50">
                        {isSidebarCollapsed ? (
                          // Collapsed view - just status indicator
                          <div className="flex flex-col items-center space-y-2">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                servers.some((s) => s.connected)
                                  ? "bg-emerald-400"
                                  : "bg-slate-500"
                              }`}
                              title={`${
                                servers.filter((s) => s.connected).length
                              }/${servers.length} servers connected`}
                            ></div>
                            <span className="text-slate-300 font-medium text-xs">
                              {servers.filter((s) => s.connected).length}/
                              {servers.length}
                            </span>
                          </div>
                        ) : (
                          // Expanded view - full status
                          <>
                            <div className="flex items-center justify-between text-xs mb-2">
                              <span className="text-slate-400 font-medium">
                                System Status
                              </span>
                              <div className="flex items-center space-x-1.5">
                                <div
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    servers.some((s) => s.connected)
                                      ? "bg-emerald-400"
                                      : "bg-slate-500"
                                  }`}
                                ></div>
                                <span className="text-slate-300 font-medium text-xs">
                                  {servers.filter((s) => s.connected).length}/
                                  {servers.length}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-400">Servers</span>
                                <span className="text-emerald-400">
                                  {servers.filter((s) => s.connected).length}{" "}
                                  online
                                </span>
                              </div>
                              <div className="w-full bg-slate-700/50 rounded-full h-1">
                                <div
                                  className={`bg-gradient-to-r from-emerald-500 to-emerald-400 h-1 rounded-full transition-all duration-500`}
                                  style={{
                                    width: `${
                                      servers.length > 0
                                        ? (servers.filter((s) => s.connected)
                                            .length /
                                            servers.length) *
                                          100
                                        : 0
                                    }%`,
                                  }}
                                />
                              </div>

                              <div className="flex justify-between text-xs pt-0.5">
                                <span className="text-slate-400">
                                  Tools Available
                                </span>
                                <span className="text-blue-400">
                                  {tools.length}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </aside>

                  {/* Enhanced Main Content */}
                  <main className="flex-1 flex flex-col bg-slate-950/50 overflow-hidden">
                    {/* Servers Tab */}
                    {selectedTab === "servers" && (
                      <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-shrink-0 p-6 pb-4">
                          <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent mb-2">
                            MCP Servers
                          </h2>
                          <p className="text-slate-400 text-sm">
                            Manage your Model Context Protocol server
                            connections
                          </p>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 pb-6">
                          {isLoading ? (
                            <div className="flex items-center justify-center h-64">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                            </div>
                          ) : (
                            <div className="grid gap-4">
                              {servers.map((server) => {
                                const serverConfig = serverConfigs.find(
                                  (config) => config.id === server.id
                                );
                                return (
                                  <ServerCard
                                    key={server.id}
                                    server={server}
                                    toolCount={getToolCountForServer(server.id)}
                                    contextParamsCount={getContextParamsCountForServer(
                                      server.id
                                    )}
                                    preferredModelName={getModelName(
                                      serverConfig?.preferredModelId
                                    )}
                                    onConnect={handleConnect}
                                    onDisconnect={handleDisconnect}
                                    onView={handleViewServerConfig}
                                    onEdit={handleEditServerConfig}
                                    onDelete={handleDeleteServer}
                                    isLoading={connectingServers.has(server.id)}
                                  />
                                );
                              })}

                              {servers.length === 0 && (
                                <div className="text-center py-12">
                                  <ServerIcon className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                                  <h3 className="text-xl font-semibold text-zinc-300 mb-2">
                                    No servers configured
                                  </h3>
                                  <p className="text-zinc-500 mb-6">
                                    Add your first MCP server to get started
                                  </p>
                                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <button
                                      onClick={() => setIsAddServerOpen(true)}
                                      className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 justify-center transition-all duration-200"
                                    >
                                      <PlusIcon className="w-5 h-5" />
                                      <span>Add Local Server</span>
                                    </button>
                                    <button
                                      onClick={() =>
                                        setIsAddRemoteServerOpen(true)
                                      }
                                      className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 justify-center transition-all duration-200"
                                    >
                                      <GlobeAltIcon className="w-5 h-5" />
                                      <span>Add Remote Server</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* API to MCP Tab */}
                    {selectedTab === "api-servers" && (
                      <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-shrink-0 p-6 pb-4">
                          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-100 to-indigo-300 bg-clip-text text-transparent mb-2">
                            API to MCP Conversion
                          </h2>
                          <p className="text-slate-400 text-sm">
                            Convert REST APIs into MCP servers with
                            authentication and testing capabilities
                          </p>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 pb-6">
                          <APIServerManager onServerStatusChange={loadData} />
                        </div>
                      </div>
                    )}

                    {/* Tools Tab */}
                    {selectedTab === "tools" && (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key="tools"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.3 }}
                          className="flex-1 h-full overflow-hidden"
                        >
                          <ToolExecution
                            tools={tools}
                            servers={servers}
                            onExecuteTool={handleExecuteTool}
                            onToolStateChange={handleToolStateChange}
                          />
                        </motion.div>
                      </AnimatePresence>
                    )}

                    {/* Public APIs Tab */}
                    {selectedTab === "public-apis" && (
                      <motion.div
                        key="public-apis"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="flex-1 h-full overflow-hidden"
                      >
                        {(() => {
                          console.log(
                            "🌐 PublicAPIExplorer: Rendering component"
                          );
                          return (
                            <PublicAPIExplorer
                              onConvertToMCP={handleConvertPublicAPIToMCP}
                            />
                          );
                        })()}
                      </motion.div>
                    )}

                    {/* Chat Tab */}
                    {selectedTab === "chat" && (
                      <ChatInterface
                        messages={chatMessages}
                        onSendMessage={sendMessage}
                        onClearChat={clearChat}
                        isLoading={isSending}
                        connectedServers={
                          servers.filter((s) => s.connected).length
                        }
                      />
                    )}

                    {/* Workflows Tab */}
                    {selectedTab === "workflows" && (
                      <div className="flex-1 flex flex-col overflow-hidden">
                        <Workflow
                          onExecuteTool={handleExecuteTool}
                          servers={servers.map((server) => ({
                            id: server.id,
                            name: server.name,
                            connected: server.connected,
                            tools:
                              tools.filter(
                                (tool) => tool.serverId === server.id
                              ) || [],
                          }))}
                          tools={tools}
                        />
                      </div>
                    )}

                    {/* Logs Tab */}
                    {selectedTab === "logs" && (
                      <AnimatePresence mode="wait">
                        {" "}
                        <motion.div
                          key="logs"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.3 }}
                          className="flex-1 h-full overflow-hidden"
                        >
                          <LogsConsole />
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </main>
                </div>

                {/* Status Bar */}
                <StatusBar
                  serverCount={servers.length}
                  connectedServers={servers.filter((s) => s.connected).length}
                  toolCount={tools.length}
                  lastUpdate={lastUpdate}
                  isOnline={true}
                />
              </div>
            )}
          </LogsProvider>
        </SettingsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
