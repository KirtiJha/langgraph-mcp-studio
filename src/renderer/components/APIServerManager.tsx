import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  PlusIcon,
  GlobeAltIcon,
  PlayIcon,
  StopIcon,
  PencilIcon,
  TrashIcon,
  BeakerIcon,
  CogIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import {
  GlobeAltIcon as GlobeAltIconSolid,
  PlayIcon as PlayIconSolid,
  StopIcon as StopIconSolid,
} from "@heroicons/react/24/solid";
import { APIServerConfig, APIServerStatus } from "../../shared/apiServerTypes";
import APIServerBuilder from "./APIServerBuilder";
import APIServerService from "../services/APIServerService";

// Modern animated spinner component
const ModernSpinner: React.FC<{ className?: string; size?: number }> = ({
  className = "",
  size = 16,
}) => (
  <div className={`inline-flex items-center justify-center ${className}`}>
    <motion.div
      className="rounded-full border-2 border-transparent"
      style={{
        width: size,
        height: size,
        borderTopColor: "currentColor",
        borderRightColor: "currentColor",
      }}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  </div>
);

// Pulsing dots spinner for a more modern look
const DotsSpinner: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`inline-flex items-center space-x-1 ${className}`}>
    {[0, 1, 2].map((index) => (
      <motion.div
        key={index}
        className="w-1 h-1 bg-current rounded-full"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          delay: index * 0.1,
        }}
      />
    ))}
  </div>
);

interface APIServerManagerProps {
  onServerStatusChange?: () => Promise<void>;
}

const APIServerManager: React.FC<APIServerManagerProps> = ({
  onServerStatusChange,
}) => {
  const [servers, setServers] = useState<APIServerConfig[]>([]);
  const [serverStatuses, setServerStatuses] = useState<
    Record<string, APIServerStatus>
  >({});
  const [loadingServers, setLoadingServers] = useState<Set<string>>(new Set());
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingServer, setEditingServer] = useState<APIServerConfig | null>(
    null
  );
  const [deletingServer, setDeletingServer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedServers, setExpandedServers] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    loadServers();

    // Set up real-time event listeners for MCP server status updates
    const unsubscribeConnected = window.electronAPI.on(
      "server-connected",
      async (serverId: string) => {
        console.log("📡 API Server Manager: Server connected event:", serverId);
        // Update status for this specific server
        const status = await APIServerService.getServerStatus(serverId);
        if (status) {
          setServerStatuses((prev) => ({
            ...prev,
            [serverId]: status,
          }));
        }
      }
    );

    const unsubscribeDisconnected = window.electronAPI.on(
      "server-disconnected",
      async (serverId: string) => {
        console.log(
          "📡 API Server Manager: Server disconnected event:",
          serverId
        );
        // Update status for this specific server
        const status = await APIServerService.getServerStatus(serverId);
        if (status) {
          setServerStatuses((prev) => ({
            ...prev,
            [serverId]: status,
          }));
        }
      }
    );

    const unsubscribeError = window.electronAPI.on(
      "server-error",
      async ({ serverId }: { serverId: string }) => {
        console.log("📡 API Server Manager: Server error event:", serverId);
        // Update status for this specific server
        const status = await APIServerService.getServerStatus(serverId);
        if (status) {
          setServerStatuses((prev) => ({
            ...prev,
            [serverId]: status,
          }));
        }
      }
    );

    // Set up polling for server status as fallback
    const interval = setInterval(async () => {
      if (servers.length > 0) {
        const statuses: Record<string, APIServerStatus> = {};
        for (const server of servers) {
          try {
            const status = await APIServerService.getServerStatus(server.id);
            if (status) {
              statuses[server.id] = status;
            }
          } catch (error) {
            console.error(
              `Failed to get status for server ${server.id}:`,
              error
            );
          }
        }
        setServerStatuses(statuses);
      }
    }, 10000); // Poll every 10 seconds as fallback

    return () => {
      clearInterval(interval);
      unsubscribeConnected();
      unsubscribeDisconnected();
      unsubscribeError();
    };
  }, [servers.length]);

  const loadServers = async () => {
    try {
      const serverList = await APIServerService.getAllServers();
      setServers(serverList);

      // Load statuses for each server
      const statuses: Record<string, APIServerStatus> = {};
      for (const server of serverList) {
        const status = await APIServerService.getServerStatus(server.id);
        if (status) {
          statuses[server.id] = status;
        }
      }
      setServerStatuses(statuses);
    } catch (error) {
      console.error("Failed to load servers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateServer = async (config: APIServerConfig) => {
    try {
      console.log("Creating server with config:", config);
      const savedServer = await APIServerService.saveServer(config);
      console.log("Server saved successfully:", savedServer);
      await loadServers();
      setShowBuilder(false);
      // Trigger main app refresh to update server count
      if (onServerStatusChange) {
        await onServerStatusChange();
      }
    } catch (error) {
      console.error("Failed to create server:", error);
      // Show error message to user
      alert(
        `Failed to create server: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleUpdateServer = async (config: APIServerConfig) => {
    try {
      await APIServerService.saveServer(config);
      await loadServers();
      setEditingServer(null);
      setShowBuilder(false);
      // Trigger main app refresh to update server list
      if (onServerStatusChange) {
        await onServerStatusChange();
      }
    } catch (error) {
      console.error("Failed to update server:", error);
    }
  };

  const handleEditServer = (server: APIServerConfig) => {
    setEditingServer(server);
    setShowBuilder(true);
  };

  const handleDeleteServer = async (id: string) => {
    try {
      setDeletingServer(id);
      await APIServerService.deleteServer(id);
      await loadServers();
      // Trigger main app refresh to update server count
      if (onServerStatusChange) {
        await onServerStatusChange();
      }
    } catch (error) {
      console.error("Failed to delete server:", error);
    } finally {
      setDeletingServer(null);
    }
  };

  const handleStartServer = async (id: string) => {
    try {
      setLoadingServers((prev) => new Set(prev).add(id));
      await APIServerService.startServer(id);
      await loadServers();
      // Trigger main app refresh to update server list and tools
      if (onServerStatusChange) {
        await onServerStatusChange();
      }
    } catch (error) {
      console.error("Failed to start server:", error);
    } finally {
      setLoadingServers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleStopServer = async (id: string) => {
    try {
      setLoadingServers((prev) => new Set(prev).add(id));
      await APIServerService.stopServer(id);
      await loadServers();
      // Trigger main app refresh to update server list and tools
      if (onServerStatusChange) {
        await onServerStatusChange();
      }
    } catch (error) {
      console.error("Failed to stop server:", error);
    } finally {
      setLoadingServers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleTestEndpoint = async (serverId: string, endpointId: string) => {
    try {
      await APIServerService.testEndpoint(serverId, endpointId);
      await loadServers();
    } catch (error) {
      console.error("Failed to test endpoint:", error);
    }
  };

  const handleGenerateDocumentation = async (serverId: string) => {
    try {
      const documentation = await APIServerService.generateDocumentation(
        serverId
      );

      // Create a blob and download link
      const blob = new Blob([documentation], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${
        servers.find((s) => s.id === serverId)?.name || "api-server"
      }-documentation.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log("Documentation generated and downloaded successfully");
    } catch (error) {
      console.error("Failed to generate documentation:", error);
    }
  };

  const toggleServerExpansion = (serverId: string) => {
    const newExpanded = new Set(expandedServers);
    if (newExpanded.has(serverId)) {
      newExpanded.delete(serverId);
    } else {
      newExpanded.add(serverId);
    }
    setExpandedServers(newExpanded);
  };

  const renderServerCard = (server: APIServerConfig) => {
    const status = serverStatuses[server.id];
    const isConnected = status?.connected || false;
    const endpointCount = server.endpoints.filter((e) => e.enabled).length;
    const isExpanded = expandedServers.has(server.id);

    return (
      <motion.div
        key={server.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg hover:border-slate-600/50 transition-all duration-300"
      >
        {/* Compact Header */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            {/* Left side - Icon, Name, Status */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                  loadingServers.has(server.id)
                    ? "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25"
                    : isConnected
                    ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25"
                    : "bg-gradient-to-br from-slate-600 to-slate-700"
                }`}
              >
                {loadingServers.has(server.id) ? (
                  <ModernSpinner className="text-white" size={20} />
                ) : (
                  <GlobeAltIconSolid className="w-5 h-5 text-white" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-semibold text-white truncate">
                    {server.name}
                  </h3>
                  <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-all duration-300 ${
                      loadingServers.has(server.id)
                        ? "bg-indigo-500/20 text-indigo-400"
                        : isConnected
                        ? "bg-green-500/20 text-green-400"
                        : "bg-slate-700/50 text-slate-400"
                    }`}
                  >
                    {loadingServers.has(server.id) ? (
                      <>
                        <DotsSpinner />
                        {isConnected ? "Stopping..." : "Starting..."}
                      </>
                    ) : (
                      <>
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            isConnected
                              ? "bg-green-400 animate-pulse"
                              : "bg-slate-500"
                          }`}
                        />
                        {isConnected ? "Running" : "Stopped"}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="truncate">{server.baseUrl}</span>
                  <span>•</span>
                  <span>
                    {endpointCount} endpoint{endpointCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Right side - Action buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <motion.button
                onClick={() =>
                  isConnected
                    ? handleStopServer(server.id)
                    : handleStartServer(server.id)
                }
                disabled={loadingServers.has(server.id)}
                className={`p-2 rounded-md transition-all duration-200 relative ${
                  loadingServers.has(server.id)
                    ? "text-indigo-400 bg-indigo-500/10 cursor-not-allowed"
                    : isConnected
                    ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    : "text-green-400 hover:text-green-300 hover:bg-green-500/10"
                }`}
                whileHover={
                  loadingServers.has(server.id) ? {} : { scale: 1.05 }
                }
                whileTap={loadingServers.has(server.id) ? {} : { scale: 0.95 }}
                title={
                  loadingServers.has(server.id)
                    ? isConnected
                      ? "Stopping Server..."
                      : "Starting Server..."
                    : isConnected
                    ? "Stop Server"
                    : "Start Server"
                }
              >
                <AnimatePresence mode="wait">
                  {loadingServers.has(server.id) ? (
                    <motion.div
                      key="spinner"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ModernSpinner size={16} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="icon"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                    >
                      {isConnected ? (
                        <StopIconSolid className="w-4 h-4" />
                      ) : (
                        <PlayIconSolid className="w-4 h-4" />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              <motion.button
                onClick={() => handleEditServer(server)}
                className="p-2 rounded-md text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Edit Server"
              >
                <PencilIcon className="w-4 h-4" />
              </motion.button>

              <motion.button
                onClick={() => handleGenerateDocumentation(server.id)}
                className="p-2 rounded-md text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Generate Documentation"
              >
                <DocumentTextIcon className="w-4 h-4" />
              </motion.button>

              <motion.button
                onClick={() => setDeletingServer(server.id)}
                className="p-2 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Delete Server"
              >
                <TrashIcon className="w-4 h-4" />
              </motion.button>

              <motion.button
                onClick={() => toggleServerExpansion(server.id)}
                className="p-2 rounded-md text-slate-400 hover:text-slate-300 hover:bg-slate-500/10 transition-colors duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={isExpanded ? "Show less" : "Show details"}
              >
                {isExpanded ? (
                  <ChevronDownIcon className="w-4 h-4" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4" />
                )}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Expandable Details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-slate-700/30">
                {/* Description */}
                {server.description && (
                  <div className="mb-4 pt-3">
                    <p className="text-sm text-slate-400">
                      {server.description}
                    </p>
                  </div>
                )}

                {/* Server Details */}
                {isConnected && status && (
                  <div className="mb-4">
                    <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                      Server Details
                    </h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {status.pid && (
                        <div className="text-center p-2 bg-slate-700/30 rounded-lg">
                          <div className="text-sm font-semibold text-white">
                            {status.pid}
                          </div>
                          <div className="text-xs text-slate-400">PID</div>
                        </div>
                      )}
                      {status.startTime && (
                        <div className="text-center p-2 bg-slate-700/30 rounded-lg">
                          <div className="text-sm font-semibold text-white">
                            {formatDistanceToNow(new Date(status.startTime), {
                              addSuffix: true,
                            })}
                          </div>
                          <div className="text-xs text-slate-400">Started</div>
                        </div>
                      )}
                      <div className="text-center p-2 bg-slate-700/30 rounded-lg">
                        <div className="text-sm font-semibold text-white">
                          {status.totalRequests || 0}
                        </div>
                        <div className="text-xs text-slate-400">Requests</div>
                      </div>
                      <div className="text-center p-2 bg-slate-700/30 rounded-lg">
                        <div className="text-sm font-semibold text-white">
                          {status.testResults?.filter((r) => r.success)
                            .length || 0}
                        </div>
                        <div className="text-xs text-slate-400">Successful</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Endpoints */}
                {server.endpoints.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                      Endpoints ({endpointCount} enabled)
                    </h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {server.endpoints.map((endpoint) => (
                        <div
                          key={endpoint.id}
                          className={`flex items-center gap-2 p-2 rounded-md border text-xs ${
                            endpoint.enabled
                              ? "bg-slate-700/30 border-slate-600/30 text-slate-300"
                              : "bg-slate-800/30 border-slate-700/30 text-slate-500"
                          }`}
                        >
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs font-mono font-bold ${
                              endpoint.method === "GET"
                                ? "bg-green-500/20 text-green-400"
                                : endpoint.method === "POST"
                                ? "bg-blue-500/20 text-blue-400"
                                : endpoint.method === "PUT"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : endpoint.method === "DELETE"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-purple-500/20 text-purple-400"
                            }`}
                          >
                            {endpoint.method}
                          </span>
                          <span
                            className="truncate flex-1"
                            title={endpoint.path}
                          >
                            {endpoint.path}
                          </span>
                          <span
                            className="text-slate-500 truncate max-w-32"
                            title={endpoint.toolName}
                          >
                            {endpoint.toolName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="pt-3 border-t border-slate-700/30">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                      Quick Actions
                    </h4>
                    <motion.button
                      onClick={() => handleGenerateDocumentation(server.id)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 hover:text-purple-300 border border-purple-500/30 rounded-lg transition-colors duration-200 text-xs"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      title="Generate and download API documentation"
                    >
                      <DocumentTextIcon className="w-3 h-3" />
                      Generate Docs
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-end">
        <motion.button
          onClick={() => setShowBuilder(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <PlusIcon className="w-4 h-4" />
          Create API to MCP Server
        </motion.button>
      </div>

      {/* Servers List */}
      {servers.length > 0 ? (
        <div className="grid gap-4">{servers.map(renderServerCard)}</div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-3xl blur-2xl"></div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
              <GlobeAltIconSolid className="w-10 h-10 text-white" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-200 mb-3">
            No API to MCP Servers Yet
          </h3>
          <p className="text-slate-400 max-w-md mb-6 text-lg">
            Create your first API to MCP server to convert REST endpoints into
            MCP tools that AI models can use.
          </p>
          <motion.button
            onClick={() => setShowBuilder(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <PlusIcon className="w-5 h-5" />
            Create Your First API Server
          </motion.button>
        </motion.div>
      )}

      {/* API Server Builder Modal */}
      <APIServerBuilder
        isOpen={showBuilder}
        onClose={() => {
          setShowBuilder(false);
          setEditingServer(null);
        }}
        onSave={editingServer ? handleUpdateServer : handleCreateServer}
        editingServer={editingServer || undefined}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingServer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) =>
              e.target === e.currentTarget && setDeletingServer(null)
            }
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Delete API Server
                  </h3>
                  <p className="text-sm text-slate-400">
                    This action cannot be undone
                  </p>
                </div>
              </div>

              <p className="text-slate-300 mb-6">
                Are you sure you want to delete "
                <span className="font-medium text-white">
                  {servers.find((s) => s.id === deletingServer)?.name}
                </span>
                "? All endpoints and configurations will be permanently removed.
              </p>

              <div className="flex gap-3">
                <motion.button
                  onClick={() => setDeletingServer(null)}
                  className="flex-1 px-4 py-2 text-slate-400 hover:text-white border border-slate-600 hover:border-slate-500 rounded-lg transition-colors duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={() => handleDeleteServer(deletingServer)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Delete Server
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default APIServerManager;
