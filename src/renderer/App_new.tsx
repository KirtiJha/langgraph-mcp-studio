import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Cog6ToothIcon,
  ServerIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  BeakerIcon,
} from "@heroicons/react/24/outline";
import { ServerConfig, ServerStatus } from "../shared/types";

// Import new Tailwind components (we'll create these)
import Sidebar from "./components/Sidebar";
import ServerPanel from "./components/ServerPanel";
import ToolsPanel from "./components/ToolsPanel";
import ResourcesPanel from "./components/ResourcesPanel";
import PromptsPanel from "./components/PromptsPanel";
import ChatInterface from "./components/ChatInterface";
import AddServerDialog from "./components/AddServerDialog";
import Header from "./components/Header";

type ActiveView = "servers" | "tools" | "resources" | "prompts" | "chat";

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>("servers");
  const [servers, setServers] = useState<ServerStatus[]>([]);
  const [showAddServer, setShowAddServer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load servers on mount
  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      setIsLoading(true);
      const serverList = await window.electronAPI.listServers();
      setServers(serverList);
    } catch (error) {
      console.error("Failed to load servers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddServer = async (config: ServerConfig) => {
    try {
      await window.electronAPI.addServer(config);
      await loadServers();
      setShowAddServer(false);
    } catch (error) {
      console.error("Failed to add server:", error);
    }
  };

  const handleConnectServer = async (id: string) => {
    try {
      await window.electronAPI.connectServer(id);
      await loadServers();
    } catch (error) {
      console.error("Failed to connect server:", error);
    }
  };

  const handleDisconnectServer = async (id: string) => {
    try {
      await window.electronAPI.disconnectServer(id);
      await loadServers();
    } catch (error) {
      console.error("Failed to disconnect server:", error);
    }
  };

  const handleRemoveServer = async (id: string) => {
    try {
      await window.electronAPI.removeServer(id);
      await loadServers();
    } catch (error) {
      console.error("Failed to remove server:", error);
    }
  };

  const navigationItems = [
    {
      id: "servers" as ActiveView,
      label: "Servers",
      icon: ServerIcon,
      count: servers.length,
    },
    {
      id: "tools" as ActiveView,
      label: "Tools",
      icon: WrenchScrewdriverIcon,
      count: servers.filter((s) => s.connected).length,
    },
    {
      id: "resources" as ActiveView,
      label: "Resources",
      icon: DocumentTextIcon,
      count: 0,
    },
    {
      id: "prompts" as ActiveView,
      label: "Prompts",
      icon: BeakerIcon,
      count: 0,
    },
    {
      id: "chat" as ActiveView,
      label: "Chat",
      icon: ChatBubbleLeftRightIcon,
      count: 0,
    },
  ];

  const renderActiveView = () => {
    const viewProps = {
      servers,
      onConnect: handleConnectServer,
      onDisconnect: handleDisconnectServer,
      onRemove: handleRemoveServer,
    };

    switch (activeView) {
      case "servers":
        return (
          <ServerPanel
            {...viewProps}
            onAddServer={() => setShowAddServer(true)}
          />
        );
      case "tools":
        return <ToolsPanel />;
      case "resources":
        return <ResourcesPanel />;
      case "prompts":
        return <PromptsPanel />;
      case "chat":
        return <ChatInterface />;
      default:
        return (
          <ServerPanel
            {...viewProps}
            onAddServer={() => setShowAddServer(true)}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-brand-500 to-purple-500 rounded-xl flex items-center justify-center">
            <ServerIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-dark-100 mb-2">
            MCP Studio
          </h2>
          <p className="text-dark-400">
            Loading your Model Context Protocol servers...
          </p>
          <div className="mt-4">
            <div className="w-48 h-1 bg-dark-800 rounded-full mx-auto overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-brand-500 to-purple-500"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Sidebar */}
      <Sidebar
        navigationItems={navigationItems}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header
          activeView={activeView}
          servers={servers}
          onAddServer={() => setShowAddServer(true)}
        />

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-auto">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderActiveView()}
          </motion.div>
        </main>
      </div>

      {/* Add Server Dialog */}
      <AddServerDialog
        open={showAddServer}
        onClose={() => setShowAddServer(false)}
        onSubmit={handleAddServer}
      />
    </div>
  );
};

export default App;
