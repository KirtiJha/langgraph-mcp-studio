import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  CogIcon,
  ServerIcon,
  KeyIcon,
  BellIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  FolderIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState("general");
  const [servers, setServers] = useState<ServerConfig[]>([
    {
      id: "1",
      name: "Filesystem Server",
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/path/to/allowed/files",
      ],
      env: { NODE_ENV: "production" },
      cwd: "/Users/user/projects",
    },
  ]);

  const [newServer, setNewServer] = useState<Partial<ServerConfig>>({
    name: "",
    command: "",
    args: [],
    env: {},
  });

  const [settings, setSettings] = useState({
    general: {
      autoStart: true,
      minimizeToTray: false,
      checkUpdates: true,
      theme: "dark",
    },
    notifications: {
      serverStatus: true,
      toolExecution: true,
      errors: true,
      updates: false,
    },
    security: {
      requireConfirmation: true,
      allowFileAccess: false,
      allowNetworkAccess: true,
      logLevel: "info",
    },
  });

  const tabs = [
    { id: "general", label: "General", icon: CogIcon },
    { id: "servers", label: "Servers", icon: ServerIcon },
    { id: "security", label: "Security", icon: ShieldCheckIcon },
    { id: "notifications", label: "Notifications", icon: BellIcon },
    { id: "appearance", label: "Appearance", icon: PaintBrushIcon },
    { id: "about", label: "About", icon: InformationCircleIcon },
  ];

  const addServer = () => {
    if (newServer.name && newServer.command) {
      const server: ServerConfig = {
        id: Date.now().toString(),
        name: newServer.name,
        command: newServer.command,
        args: newServer.args || [],
        env: newServer.env,
        cwd: newServer.cwd,
      };
      setServers([...servers, server]);
      setNewServer({ name: "", command: "", args: [], env: {} });
    }
  };

  const removeServer = (id: string) => {
    setServers(servers.filter((s) => s.id !== id));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sidebar */}
          <div className="w-64 bg-slate-800/50 border-r border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-100">Settings</h2>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-200 transition-colors duration-200"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      : "text-slate-300 hover:bg-slate-700/50 hover:text-slate-200"
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col">
            <div className="p-6 border-b border-slate-700/50">
              <h3 className="text-2xl font-bold text-slate-100 capitalize">
                {activeTab}
              </h3>
              <p className="text-slate-400 mt-1">
                {activeTab === "general" &&
                  "Configure general application settings"}
                {activeTab === "servers" &&
                  "Manage your MCP server configurations"}
                {activeTab === "security" && "Security and privacy settings"}
                {activeTab === "notifications" && "Notification preferences"}
                {activeTab === "appearance" && "Customize the app appearance"}
                {activeTab === "about" && "About MCP Studio"}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* General Tab */}
              {activeTab === "general" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-slate-200">
                          Auto Start
                        </h4>
                        <p className="text-sm text-slate-400">
                          Launch MCP Studio when system starts
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.general.autoStart}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              general: {
                                ...settings.general,
                                autoStart: e.target.checked,
                              },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-slate-200">
                          Minimize to Tray
                        </h4>
                        <p className="text-sm text-slate-400">
                          Keep running in system tray when closed
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.general.minimizeToTray}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              general: {
                                ...settings.general,
                                minimizeToTray: e.target.checked,
                              },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-slate-200">
                          Check for Updates
                        </h4>
                        <p className="text-sm text-slate-400">
                          Automatically check for new versions
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.general.checkUpdates}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              general: {
                                ...settings.general,
                                checkUpdates: e.target.checked,
                              },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Servers Tab */}
              {activeTab === "servers" && (
                <div className="space-y-6">
                  {/* Add New Server */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <h4 className="text-lg font-medium text-slate-200 mb-4">
                      Add New Server
                    </h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Server Name"
                          value={newServer.name || ""}
                          onChange={(e) =>
                            setNewServer({ ...newServer, name: e.target.value })
                          }
                          className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          placeholder="Command"
                          value={newServer.command || ""}
                          onChange={(e) =>
                            setNewServer({
                              ...newServer,
                              command: e.target.value,
                            })
                          }
                          className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Arguments (comma-separated)"
                        onChange={(e) =>
                          setNewServer({
                            ...newServer,
                            args: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        onClick={addServer}
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200"
                      >
                        Add Server
                      </button>
                    </div>
                  </div>

                  {/* Existing Servers */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-slate-200">
                      Configured Servers
                    </h4>
                    {servers.map((server) => (
                      <div
                        key={server.id}
                        className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="text-lg font-medium text-slate-200">
                              {server.name}
                            </h5>
                            <p className="text-sm text-slate-400 mt-1 font-mono">
                              {server.command} {server.args.join(" ")}
                            </p>
                            {server.cwd && (
                              <div className="flex items-center space-x-2 mt-2">
                                <FolderIcon className="w-4 h-4 text-slate-500" />
                                <span className="text-xs text-slate-500">
                                  {server.cwd}
                                </span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => removeServer(server.id)}
                            className="text-red-400 hover:text-red-300 transition-colors duration-200"
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* About Tab */}
              {activeTab === "about" && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <CogIcon className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-100">
                      MCP Studio
                    </h3>
                    <p className="text-slate-400 mt-2">Version 1.0.0</p>
                    <p className="text-slate-500 text-sm mt-1">
                      Your Model Context Protocol Command Center
                    </p>
                  </div>

                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <h4 className="text-lg font-medium text-slate-200 mb-4">
                      About
                    </h4>
                    <p className="text-slate-400 leading-relaxed">
                      MCP Studio is a professional desktop application for
                      managing Model Context Protocol servers, tools, and
                      resources. Built with modern web technologies and designed
                      for developers and AI enthusiasts who work with
                      MCP-compatible systems.
                    </p>
                  </div>

                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <h4 className="text-lg font-medium text-slate-200 mb-4">
                      System Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Platform:</span>
                        <span className="text-slate-300">
                          {navigator.platform}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">User Agent:</span>
                        <span className="text-slate-300 text-xs">
                          {navigator.userAgent.slice(0, 50)}...
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Memory:</span>
                        <span className="text-slate-300">
                          {Math.round(
                            (performance as any).memory?.usedJSHeapSize /
                              1024 /
                              1024 || 0
                          )}{" "}
                          MB
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Placeholder for other tabs */}
              {["security", "notifications", "appearance"].includes(
                activeTab
              ) && (
                <div className="text-center py-12">
                  <CogIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-300 mb-2">
                    Coming Soon
                  </h3>
                  <p className="text-slate-500">
                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}{" "}
                    settings will be available in a future update
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700/50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SettingsModal;
