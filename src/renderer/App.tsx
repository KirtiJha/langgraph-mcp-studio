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
} from "@heroicons/react/24/outline";

// Components
import StatusBar from "./components/StatusBar";
import LogsConsole from "./components/LogsConsole";
import SettingsModal from "./components/SettingsModal";
import ToolExecution from "./components/ToolExecution";
import KeyboardShortcuts from "./components/KeyboardShortcuts";
import ChatInterface from "./components/ChatInterface";
import AddServerDialog from "./components/AddServerDialog";
import ServerConfigModal from "./components/ServerConfigModal";
import ServerCard from "./components/ServerCard";
import ConfirmDialog from "./components/ConfirmDialog";
import { LogsProvider } from "./stores/logsStore";

// Types
import { ServerConfig } from "../shared/types";

// Types
interface ServerStatus {
  id: string;
  name: string;
  connected: boolean;
}

interface Tool {
  name: string;
  description: string;
  serverId: string;
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
  }>;
}

type ChatMessage = UserMessage | AssistantMessage | ToolExecutionMessage;

function App() {
  const [servers, setServers] = useState<ServerStatus[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [serverConfigs, setServerConfigs] = useState<ServerConfig[]>([]);
  const [selectedTab, setSelectedTab] = useState("servers");
  const [isLoading, setIsLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddServerOpen, setIsAddServerOpen] = useState(false);
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [serverList, toolList] = await Promise.all([
        window.electronAPI.listServers(),
        window.electronAPI.listTools(),
      ]);
      setServers(serverList);
      setTools(toolList);

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

  const handleConnect = async (serverId: string) => {
    try {
      await window.electronAPI.connectServer(serverId);
      await loadData();
    } catch (error) {
      console.error("Error connecting server:", error);
    }
  };

  const handleDisconnect = async (serverId: string) => {
    try {
      await window.electronAPI.disconnectServer(serverId);
      await loadData();
    } catch (error) {
      console.error("Error disconnecting server:", error);
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

  const handleViewServerConfig = async (serverId: string) => {
    try {
      const config = await window.electronAPI.getServerConfig(serverId);
      setSelectedServerConfig(config);
      setSelectedServerId(serverId);
      setServerConfigMode("view");
      setIsServerConfigOpen(true);
    } catch (error) {
      console.error("Error fetching server config:", error);
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
    if (!serverConfig?.toolConfigs) return 0;

    // Count total parameters across all tools
    return Object.values(serverConfig.toolConfigs).reduce(
      (total: number, toolParams: any) => {
        return total + Object.keys(toolParams || {}).length;
      },
      0
    );
  };

  const sendMessage = async (message: string) => {
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
      const response = await window.electronAPI.sendMessage(message);

      // Check if the response contains tool calls information
      if (response.toolCalls && response.toolCalls.length > 0) {
        // Create a tool execution message first
        const toolExecutionMessage: ToolExecutionMessage = {
          id: (Date.now() + 1).toString(),
          role: "tool-execution",
          content: "Executing tools...",
          timestamp: new Date(),
          tools: response.toolCalls.map((tool: any) => ({
            name: tool.name,
            args: tool.args,
            result: tool.result,
            status: "completed" as const,
            duration: tool.duration,
          })),
        };
        setChatMessages((prev) => [...prev, toolExecutionMessage]);
      }

      // Then add the assistant's response
      const assistantMessage: AssistantMessage = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: response.content,
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
        setSelectedTab("resources");
        break;
      case "switch-logs":
        setSelectedTab("logs");
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
    }
  };

  const handleExecuteTool = async (
    toolName: string,
    args: any,
    serverId?: string
  ) => {
    // Mock implementation - replace with actual API call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.3) {
          resolve({
            success: true,
            result: `Tool ${toolName} executed successfully${
              serverId ? ` on server ${serverId}` : ""
            }`,
            data: args,
          });
        } else {
          reject(new Error(`Failed to execute tool ${toolName}`));
        }
      }, 1000 + Math.random() * 2000);
    });
  };

  return (
    <LogsProvider>
      <div className="h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased overflow-hidden">
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
        {/* Modern Header with Glass Effect */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 px-6 py-3 relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg blur-md opacity-30"></div>
                <div className="relative flex items-center justify-center w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg">
                  <CpuChipIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                  MCP Studio
                </h1>
                <p className="text-xs text-slate-400 font-medium">
                  Model Context Protocol Command Center
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-2.5 py-1.5 bg-slate-800/50 rounded-md border border-slate-700/50">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    servers.some((s) => s.connected)
                      ? "bg-emerald-400"
                      : "bg-slate-500"
                  }`}
                ></div>
                <span className="text-xs text-slate-300">
                  {servers.filter((s) => s.connected).length} / {servers.length}{" "}
                  connected
                </span>
              </div>

              <button
                onClick={() => setIsAddServerOpen(true)}
                className="group relative bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-1.5 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-md hover:shadow-indigo-500/25 hover:scale-105 text-sm"
              >
                <div className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                <PlusIcon className="w-3.5 h-3.5 relative z-10" />
                <span className="font-medium relative z-10">Add Server</span>
              </button>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-700/50 hover:border-slate-600/50 transition-all duration-200"
                title="Settings (Cmd+,)"
              >
                <CogIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.header>

        <div className="flex flex-1 overflow-hidden">
          {/* Enhanced Sidebar */}
          <aside className="w-64 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/50 flex flex-col">
            {/* Navigation */}
            <nav className="p-4">
              <div className="space-y-2">
                {[
                  {
                    id: "servers",
                    label: "Servers",
                    icon: ServerIcon,
                    count: servers.length,
                    color: "emerald",
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
                    id: "resources",
                    label: "Resources",
                    icon: DocumentTextIcon,
                    count: 0,
                    color: "amber",
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
                      className={`group w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all duration-200 border text-sm ${
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
                    >
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`p-1 rounded-md transition-colors duration-200 ${
                            isActive ? "bg-white/10" : "group-hover:bg-white/5"
                          }`}
                        >
                          <tab.icon className="w-4 h-4" />
                        </div>
                        <span className="font-medium">{tab.label}</span>
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
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Enhanced Server Status */}
            <div className="mt-auto p-4 border-t border-slate-800/50">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-slate-700/50">
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
                      {servers.filter((s) => s.connected).length} online
                    </span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-1">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-1 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          servers.length > 0
                            ? (servers.filter((s) => s.connected).length /
                                servers.length) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>

                  <div className="flex justify-between text-xs pt-0.5">
                    <span className="text-slate-400">Tools Available</span>
                    <span className="text-blue-400">{tools.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Enhanced Main Content */}
          <main className="flex-1 flex flex-col bg-slate-950/50 overflow-hidden">
            {/* Servers Tab */}
            {selectedTab === "servers" && (
              <div className="flex-1 p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent mb-2">
                    MCP Servers
                  </h2>
                  <p className="text-slate-400 text-sm">
                    Manage your Model Context Protocol server connections
                  </p>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {servers.map((server) => (
                      <ServerCard
                        key={server.id}
                        server={server}
                        toolCount={getToolCountForServer(server.id)}
                        contextParamsCount={getContextParamsCountForServer(
                          server.id
                        )}
                        onConnect={handleConnect}
                        onDisconnect={handleDisconnect}
                        onView={handleViewServerConfig}
                        onEdit={handleEditServerConfig}
                        onDelete={handleDeleteServer}
                        isLoading={isLoading}
                      />
                    ))}

                    {servers.length === 0 && (
                      <div className="text-center py-12">
                        <ServerIcon className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-zinc-300 mb-2">
                          No servers configured
                        </h3>
                        <p className="text-zinc-500 mb-6">
                          Add your first MCP server to get started
                        </p>
                        <button
                          onClick={() => setIsAddServerOpen(true)}
                          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 mx-auto transition-all duration-200"
                        >
                          <PlusIcon className="w-5 h-5" />
                          <span>Add Server</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
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
                  />
                </motion.div>
              </AnimatePresence>
            )}

            {/* Chat Tab */}
            {selectedTab === "chat" && (
              <ChatInterface
                messages={chatMessages}
                onSendMessage={sendMessage}
                isLoading={isSending}
                connectedServers={servers.filter((s) => s.connected).length}
              />
            )}

            {/* Resources Tab */}
            {selectedTab === "resources" && (
              <div className="flex-1 p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Resources
                  </h2>
                  <p className="text-zinc-400">
                    Resources provided by your MCP servers
                  </p>
                </div>

                <div className="text-center py-12">
                  <DocumentTextIcon className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-zinc-300 mb-2">
                    Resources coming soon
                  </h3>
                  <p className="text-zinc-500">
                    Resource management will be available in a future update
                  </p>
                </div>
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
    </LogsProvider>
  );
}

export default App;
