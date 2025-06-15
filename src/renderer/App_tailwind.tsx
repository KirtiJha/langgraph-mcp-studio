import React, { useState, useEffect } from "react";
import {
  CpuChipIcon,
  PlusIcon,
  ServerIcon,
  ChatBubbleLeftRightIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

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

function App() {
  const [servers, setServers] = useState<ServerStatus[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedTab, setSelectedTab] = useState("servers");
  const [isLoading, setIsLoading] = useState(true);

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
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const connectServer = async (id: string) => {
    try {
      await window.electronAPI.connectServer(id);
      await loadData();
    } catch (error) {
      console.error("Error connecting server:", error);
    }
  };

  const disconnectServer = async (id: string) => {
    try {
      await window.electronAPI.disconnectServer(id);
      await loadData();
    } catch (error) {
      console.error("Error disconnecting server:", error);
    }
  };

  return (
    <div className="h-screen bg-dark-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-surface-dark border-b border-dark-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-brand-500 to-accent-500 rounded-lg flex items-center justify-center">
              <CpuChipIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">MCP Studio</h1>
              <p className="text-sm text-gray-400">
                Your Model Context Protocol Command Center
              </p>
            </div>
          </div>
          <button className="btn-primary flex items-center space-x-2">
            <PlusIcon className="w-4 h-4" />
            <span>Add Server</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-64 bg-surface border-r border-dark-800 p-4">
          <div className="space-y-2">
            {[
              { id: "servers", label: "Servers", icon: ServerIcon },
              { id: "tools", label: "Tools", icon: WrenchScrewdriverIcon },
              { id: "resources", label: "Resources", icon: DocumentTextIcon },
              { id: "chat", label: "Chat", icon: ChatBubbleLeftRightIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  selectedTab === tab.id
                    ? "bg-brand-500 text-white"
                    : "text-gray-300 hover:bg-surface-light hover:text-white"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
          ) : (
            <div className="p-6">
              {selectedTab === "servers" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">
                      MCP Servers
                    </h2>
                    <button className="btn-primary flex items-center space-x-2">
                      <PlusIcon className="w-4 h-4" />
                      <span>Add Server</span>
                    </button>
                  </div>

                  {servers.length === 0 ? (
                    <div className="text-center py-12">
                      <ServerIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400 mb-4">
                        No MCP servers configured
                      </p>
                      <button className="btn-primary">
                        Add Your First Server
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {servers.map((server) => (
                        <div key={server.id} className="card p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  server.connected
                                    ? "bg-green-400"
                                    : "bg-red-400"
                                }`}
                              />
                              <div>
                                <h3 className="font-semibold text-white">
                                  {server.name}
                                </h3>
                                <p className="text-sm text-gray-400">
                                  {server.connected
                                    ? "Connected"
                                    : "Disconnected"}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                server.connected
                                  ? disconnectServer(server.id)
                                  : connectServer(server.id)
                              }
                              className={
                                server.connected
                                  ? "btn-secondary"
                                  : "btn-primary"
                              }
                            >
                              {server.connected ? "Disconnect" : "Connect"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedTab === "tools" && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">
                    Available Tools
                  </h2>
                  {tools.length === 0 ? (
                    <div className="text-center py-12">
                      <WrenchScrewdriverIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400 mb-2">No tools available</p>
                      <p className="text-sm text-gray-500">
                        Connect an MCP server to see available tools
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {tools.map((tool) => (
                        <div key={tool.name} className="card p-4">
                          <h3 className="font-semibold text-white mb-2">
                            {tool.name}
                          </h3>
                          <p className="text-gray-400 text-sm mb-2">
                            {tool.description}
                          </p>
                          <span className="text-xs bg-brand-500/20 text-brand-300 px-2 py-1 rounded">
                            {tool.serverId}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedTab === "chat" && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">
                    AI Chat
                  </h2>
                  <div className="card p-6 text-center">
                    <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">
                      Chat interface coming soon
                    </p>
                    <p className="text-sm text-gray-500">
                      Chat with AI agents using your MCP tools
                    </p>
                  </div>
                </div>
              )}

              {selectedTab === "resources" && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">
                    Resources
                  </h2>
                  <div className="card p-6 text-center">
                    <DocumentTextIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">Resources coming soon</p>
                    <p className="text-sm text-gray-500">
                      Browse and manage MCP resources
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
