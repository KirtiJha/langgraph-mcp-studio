import React, { useState, useRef, useEffect } from "react";
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
  ComputerDesktopIcon,
  SunIcon,
  MoonIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import { useSettings } from "../providers/SettingsProvider";
import { useTheme } from "../providers/ThemeProvider";

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
  const {
    settings,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
  } = useSettings();
  const { theme, setTheme } = useTheme();

  // Temporary state for changes before applying
  const [tempSettings, setTempSettings] = useState(settings);
  const [tempTheme, setTempTheme] = useState(theme);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync temp settings when modal opens or settings change
  useEffect(() => {
    if (isOpen) {
      setTempSettings(settings);
      setTempTheme(theme);
      setHasChanges(false);
    }
  }, [isOpen, settings, theme]);

  // Check for changes
  useEffect(() => {
    const settingsChanged =
      JSON.stringify(tempSettings) !== JSON.stringify(settings);
    const themeChanged = tempTheme !== theme;
    setHasChanges(settingsChanged || themeChanged);
  }, [tempSettings, tempTheme, settings, theme]);

  // Apply changes
  const handleApply = () => {
    // Update each section individually
    updateSettings("general", tempSettings.general);
    updateSettings("notifications", tempSettings.notifications);
    updateSettings("security", tempSettings.security);
    updateSettings("appearance", tempSettings.appearance);
    updateSettings("advanced", tempSettings.advanced);
    setTheme(tempTheme);
    setHasChanges(false);
  };

  // Cancel changes
  const handleCancel = () => {
    setTempSettings(settings);
    setTempTheme(theme);
    setHasChanges(false);
  };

  // Close modal with confirmation if there are changes
  const handleClose = () => {
    if (hasChanges) {
      if (
        window.confirm(
          "You have unsaved changes. Are you sure you want to close?"
        )
      ) {
        handleCancel();
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Update temp theme
  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTempTheme(newTheme);
  };

  // Update temp settings
  const updateTempSettings = (updates: Partial<typeof settings>) => {
    setTempSettings((prev) => ({ ...prev, ...updates }));
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const [newAllowedDir, setNewAllowedDir] = useState("");
  const [newBlockedCommand, setNewBlockedCommand] = useState("");

  const tabs = [
    { id: "general", label: "General", icon: CogIcon },
    { id: "appearance", label: "Appearance", icon: PaintBrushIcon },
    { id: "notifications", label: "Notifications", icon: BellIcon },
    { id: "security", label: "Security", icon: ShieldCheckIcon },
    { id: "servers", label: "Servers", icon: ServerIcon },
    { id: "advanced", label: "Advanced", icon: AdjustmentsHorizontalIcon },
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

  const handleExportSettings = () => {
    const settingsJson = exportSettings();
    const blob = new Blob([settingsJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mcp-studio-settings-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (importSettings(content)) {
          // Settings imported successfully
          console.log("Settings imported successfully");
        } else {
          console.error("Failed to import settings");
        }
      };
      reader.readAsText(file);
    }
  };

  const addAllowedDirectory = () => {
    if (newAllowedDir.trim()) {
      updateSettings("security", {
        allowedDirectories: [
          ...settings.security.allowedDirectories,
          newAllowedDir.trim(),
        ],
      });
      setNewAllowedDir("");
    }
  };

  const removeAllowedDirectory = (index: number) => {
    const dirs = [...settings.security.allowedDirectories];
    dirs.splice(index, 1);
    updateSettings("security", { allowedDirectories: dirs });
  };

  const addBlockedCommand = () => {
    if (newBlockedCommand.trim()) {
      updateSettings("security", {
        blockedCommands: [
          ...settings.security.blockedCommands,
          newBlockedCommand.trim(),
        ],
      });
      setNewBlockedCommand("");
    }
  };

  const removeBlockedCommand = (index: number) => {
    const commands = [...settings.security.blockedCommands];
    commands.splice(index, 1);
    updateSettings("security", { blockedCommands: commands });
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
                onClick={handleClose}
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
                          checked={tempSettings.general.autoStart}
                          onChange={(e) =>
                            updateTempSettings({
                              general: {
                                ...tempSettings.general,
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
                          Keep running in system tray when minimized
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tempSettings.general.minimizeToTray}
                          onChange={(e) =>
                            updateTempSettings({
                              general: {
                                ...tempSettings.general,
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
                          Close to Tray
                        </h4>
                        <p className="text-sm text-slate-400">
                          Keep running when window is closed
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tempSettings.general.closeToTray}
                          onChange={(e) =>
                            updateTempSettings({
                              general: {
                                ...tempSettings.general,
                                closeToTray: e.target.checked,
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
                          checked={tempSettings.general.checkUpdates}
                          onChange={(e) =>
                            updateTempSettings({
                              general: {
                                ...tempSettings.general,
                                checkUpdates: e.target.checked,
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
                          Confirm on Exit
                        </h4>
                        <p className="text-sm text-slate-400">
                          Show confirmation when closing the application
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tempSettings.general.confirmExit}
                          onChange={(e) =>
                            updateTempSettings({
                              general: {
                                ...tempSettings.general,
                                confirmExit: e.target.checked,
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
                          Theme
                        </h4>
                        <p className="text-sm text-slate-400">
                          Choose your preferred theme
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 bg-slate-800/50 rounded-lg p-1">
                        <button
                          onClick={() => handleThemeChange("light")}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 ${
                            tempTheme === "light"
                              ? "bg-indigo-500 text-white"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <SunIcon className="w-4 h-4" />
                          <span className="text-sm">Light</span>
                        </button>
                        <button
                          onClick={() => handleThemeChange("dark")}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 ${
                            tempTheme === "dark"
                              ? "bg-indigo-500 text-white"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <MoonIcon className="w-4 h-4" />
                          <span className="text-sm">Dark</span>
                        </button>
                        <button
                          onClick={() => handleThemeChange("system")}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 ${
                            tempTheme === "system"
                              ? "bg-indigo-500 text-white"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <ComputerDesktopIcon className="w-4 h-4" />
                          <span className="text-sm">System</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-slate-200">
                          Language
                        </h4>
                        <p className="text-sm text-slate-400">
                          Application language
                        </p>
                      </div>
                      <select
                        value={tempSettings.general.language}
                        onChange={(e) =>
                          updateTempSettings({
                            general: {
                              ...tempSettings.general,
                              language: e.target.value,
                            },
                          })
                        }
                        className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                        <option value="ja">日本語</option>
                        <option value="zh">中文</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Appearance Tab */}
              {activeTab === "appearance" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-slate-200">
                          Font Size
                        </h4>
                        <p className="text-sm text-slate-400">
                          Adjust text size throughout the application
                        </p>
                      </div>
                      <select
                        value={tempSettings.appearance.fontSize}
                        onChange={(e) =>
                          updateTempSettings({
                            appearance: {
                              ...tempSettings.appearance,
                              fontSize: e.target.value as
                                | "small"
                                | "medium"
                                | "large",
                            },
                          })
                        }
                        className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-slate-200">
                          Font Family
                        </h4>
                        <p className="text-sm text-slate-400">
                          Choose font family for text display
                        </p>
                      </div>
                      <select
                        value={tempSettings.appearance.fontFamily}
                        onChange={(e) =>
                          updateTempSettings({
                            appearance: {
                              ...tempSettings.appearance,
                              fontFamily: e.target.value as
                                | "system"
                                | "mono"
                                | "serif",
                            },
                          })
                        }
                        className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="system">System Default</option>
                        <option value="mono">Monospace</option>
                        <option value="serif">Serif</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-slate-200">
                          Accent Color
                        </h4>
                        <p className="text-sm text-slate-400">
                          Primary color for buttons and highlights
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={settings.appearance.accentColor}
                          onChange={(e) =>
                            updateSettings("appearance", {
                              accentColor: e.target.value,
                            })
                          }
                          className="w-10 h-10 rounded-lg border border-slate-600 bg-slate-700 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={settings.appearance.accentColor}
                          onChange={(e) =>
                            updateSettings("appearance", {
                              accentColor: e.target.value,
                            })
                          }
                          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-24"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-slate-200">
                          Window Opacity
                        </h4>
                        <p className="text-sm text-slate-400">
                          Adjust window transparency ($
                          {settings.appearance.windowOpacity}%)
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="range"
                          min="70"
                          max="100"
                          value={settings.appearance.windowOpacity}
                          onChange={(e) =>
                            updateSettings("appearance", {
                              windowOpacity: parseInt(e.target.value),
                            })
                          }
                          className="w-32"
                        />
                        <span className="text-slate-300 text-sm w-12">
                          {settings.appearance.windowOpacity}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-slate-200">
                          Sidebar Width
                        </h4>
                        <p className="text-sm text-slate-400">
                          Adjust sidebar width ($
                          {settings.appearance.sidebarWidth}px)
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="range"
                          min="200"
                          max="400"
                          value={settings.appearance.sidebarWidth}
                          onChange={(e) =>
                            updateSettings("appearance", {
                              sidebarWidth: parseInt(e.target.value),
                            })
                          }
                          className="w-32"
                        />
                        <span className="text-slate-300 text-sm w-16">
                          {settings.appearance.sidebarWidth}px
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-slate-200">
                          Compact Mode
                        </h4>
                        <p className="text-sm text-slate-400">
                          Reduce spacing for a more compact interface
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.appearance.compactMode}
                          onChange={(e) =>
                            updateSettings("appearance", {
                              compactMode: e.target.checked,
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
                          Show Line Numbers
                        </h4>
                        <p className="text-sm text-slate-400">
                          Display line numbers in code blocks
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.appearance.showLineNumbers}
                          onChange={(e) =>
                            updateSettings("appearance", {
                              showLineNumbers: e.target.checked,
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
                          Enable Animations
                        </h4>
                        <p className="text-sm text-slate-400">
                          Enable smooth transitions and animations
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.appearance.enableAnimations}
                          onChange={(e) =>
                            updateSettings("appearance", {
                              enableAnimations: e.target.checked,
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

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-slate-200">
                          Server Status Changes
                        </h4>
                        <p className="text-sm text-slate-400">
                          Get notified when servers connect or disconnect
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.serverStatus}
                          onChange={(e) =>
                            updateSettings("notifications", {
                              serverStatus: e.target.checked,
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
                          Tool Execution
                        </h4>
                        <p className="text-sm text-slate-400">
                          Notifications for tool execution status
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.toolExecution}
                          onChange={(e) =>
                            updateSettings("notifications", {
                              toolExecution: e.target.checked,
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
                          Error Notifications
                        </h4>
                        <p className="text-sm text-slate-400">
                          Get notified about errors and failures
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.errors}
                          onChange={(e) =>
                            updateSettings("notifications", {
                              errors: e.target.checked,
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
                          Update Notifications
                        </h4>
                        <p className="text-sm text-slate-400">
                          Notifications about available updates
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.updates}
                          onChange={(e) =>
                            updateSettings("notifications", {
                              updates: e.target.checked,
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
                          Connection Issues
                        </h4>
                        <p className="text-sm text-slate-400">
                          Notifications for connection problems
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.connectionIssues}
                          onChange={(e) =>
                            updateSettings("notifications", {
                              connectionIssues: e.target.checked,
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
                          Desktop Notifications
                        </h4>
                        <p className="text-sm text-slate-400">
                          Show system notifications outside the app
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            settings.notifications.showDesktopNotifications
                          }
                          onChange={(e) =>
                            updateSettings("notifications", {
                              showDesktopNotifications: e.target.checked,
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
                          Notification Sounds
                        </h4>
                        <p className="text-sm text-slate-400">
                          Play sounds for notifications
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            settings.notifications.playNotificationSounds
                          }
                          onChange={(e) =>
                            updateSettings("notifications", {
                              playNotificationSounds: e.target.checked,
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

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-slate-200">
                          Require Confirmation
                        </h4>
                        <p className="text-sm text-slate-400">
                          Ask for confirmation before executing tools
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.security.requireConfirmation}
                          onChange={(e) =>
                            updateSettings("security", {
                              requireConfirmation: e.target.checked,
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
                          Allow File Access
                        </h4>
                        <p className="text-sm text-slate-400">
                          Allow tools to access local files
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.security.allowFileAccess}
                          onChange={(e) =>
                            updateSettings("security", {
                              allowFileAccess: e.target.checked,
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
                          Allow Network Access
                        </h4>
                        <p className="text-sm text-slate-400">
                          Allow tools to make network requests
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.security.allowNetworkAccess}
                          onChange={(e) =>
                            updateSettings("security", {
                              allowNetworkAccess: e.target.checked,
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
                          Enable Sandbox Mode
                        </h4>
                        <p className="text-sm text-slate-400">
                          Run tools in an isolated environment
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.security.enableSandboxMode}
                          onChange={(e) =>
                            updateSettings("security", {
                              enableSandboxMode: e.target.checked,
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
                          Log Level
                        </h4>
                        <p className="text-sm text-slate-400">
                          Set the verbosity of application logs
                        </p>
                      </div>
                      <select
                        value={settings.security.logLevel}
                        onChange={(e) =>
                          updateSettings("security", {
                            logLevel: e.target.value as
                              | "debug"
                              | "info"
                              | "warn"
                              | "error",
                          })
                        }
                        className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="debug">Debug</option>
                        <option value="info">Info</option>
                        <option value="warn">Warning</option>
                        <option value="error">Error</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-slate-200">
                          Max Log Size (MB)
                        </h4>
                        <p className="text-sm text-slate-400">
                          Maximum size for log files
                        </p>
                      </div>
                      <input
                        type="number"
                        min="10"
                        max="1000"
                        value={settings.security.maxLogSize}
                        onChange={(e) =>
                          updateSettings("security", {
                            maxLogSize: parseInt(e.target.value) || 100,
                          })
                        }
                        className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-20"
                      />
                    </div>
                  </div>

                  {/* Allowed Directories */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <h4 className="text-lg font-medium text-slate-200 mb-4">
                      Allowed Directories
                    </h4>
                    <p className="text-sm text-slate-400 mb-4">
                      Directories that tools are allowed to access
                    </p>
                    <div className="space-y-3">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="/path/to/directory"
                          value={newAllowedDir}
                          onChange={(e) => setNewAllowedDir(e.target.value)}
                          className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={addAllowedDirectory}
                          className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                        >
                          Add
                        </button>
                      </div>
                      <div className="space-y-2">
                        {settings.security.allowedDirectories.map(
                          (dir, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2"
                            >
                              <span className="text-slate-300 font-mono text-sm">
                                {dir}
                              </span>
                              <button
                                onClick={() => removeAllowedDirectory(index)}
                                className="text-red-400 hover:text-red-300 transition-colors duration-200"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          )
                        )}
                        {settings.security.allowedDirectories.length === 0 && (
                          <p className="text-slate-500 text-sm italic">
                            No allowed directories configured
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Blocked Commands */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <h4 className="text-lg font-medium text-slate-200 mb-4">
                      Blocked Commands
                    </h4>
                    <p className="text-sm text-slate-400 mb-4">
                      Commands that are blocked from execution
                    </p>
                    <div className="space-y-3">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="command-name"
                          value={newBlockedCommand}
                          onChange={(e) => setNewBlockedCommand(e.target.value)}
                          className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={addBlockedCommand}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                        >
                          Block
                        </button>
                      </div>
                      <div className="space-y-2">
                        {settings.security.blockedCommands.map((cmd, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                          >
                            <span className="text-red-300 font-mono text-sm">
                              {cmd}
                            </span>
                            <button
                              onClick={() => removeBlockedCommand(index)}
                              className="text-red-400 hover:text-red-300 transition-colors duration-200"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
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
                      <input
                        type="text"
                        placeholder="Working Directory (optional)"
                        value={newServer.cwd || ""}
                        onChange={(e) =>
                          setNewServer({ ...newServer, cwd: e.target.value })
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

              {/* Advanced Tab */}
              {activeTab === "advanced" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-slate-200">
                          Debug Mode
                        </h4>
                        <p className="text-sm text-slate-400">
                          Enable detailed logging and debug information
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.advanced.enableDebugMode}
                          onChange={(e) =>
                            updateSettings("advanced", {
                              enableDebugMode: e.target.checked,
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
                          Experimental Features
                        </h4>
                        <p className="text-sm text-slate-400">
                          Enable experimental features (may be unstable)
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.advanced.enableExperimentalFeatures}
                          onChange={(e) =>
                            updateSettings("advanced", {
                              enableExperimentalFeatures: e.target.checked,
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
                          Enable Telemetry
                        </h4>
                        <p className="text-sm text-slate-400">
                          Help improve MCP Studio by sharing anonymous usage
                          data
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.advanced.enableTelemetry}
                          onChange={(e) =>
                            updateSettings("advanced", {
                              enableTelemetry: e.target.checked,
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
                          Max Concurrent Connections
                        </h4>
                        <p className="text-sm text-slate-400">
                          Maximum number of simultaneous server connections
                        </p>
                      </div>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={settings.advanced.maxConcurrentConnections}
                        onChange={(e) =>
                          updateSettings("advanced", {
                            maxConcurrentConnections:
                              parseInt(e.target.value) || 10,
                          })
                        }
                        className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-20"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-slate-200">
                          Connection Timeout (ms)
                        </h4>
                        <p className="text-sm text-slate-400">
                          How long to wait for server connections
                        </p>
                      </div>
                      <input
                        type="number"
                        min="5000"
                        max="120000"
                        step="1000"
                        value={settings.advanced.connectionTimeout}
                        onChange={(e) =>
                          updateSettings("advanced", {
                            connectionTimeout:
                              parseInt(e.target.value) || 30000,
                          })
                        }
                        className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-24"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-slate-200">
                          Retry Attempts
                        </h4>
                        <p className="text-sm text-slate-400">
                          Number of times to retry failed connections
                        </p>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={settings.advanced.retryAttempts}
                        onChange={(e) =>
                          updateSettings("advanced", {
                            retryAttempts: parseInt(e.target.value) || 3,
                          })
                        }
                        className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-20"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-slate-200">
                          Custom CSS Path
                        </h4>
                        <p className="text-sm text-slate-400">
                          Path to custom CSS file for styling
                        </p>
                      </div>
                      <input
                        type="text"
                        placeholder="/path/to/custom.css"
                        value={settings.advanced.customCSSPath}
                        onChange={(e) =>
                          updateSettings("advanced", {
                            customCSSPath: e.target.value,
                          })
                        }
                        className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                      />
                    </div>
                  </div>

                  {/* Settings Management */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <h4 className="text-lg font-medium text-slate-200 mb-4">
                      Settings Management
                    </h4>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleExportSettings}
                        className="flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                      >
                        <DocumentArrowDownIcon className="w-4 h-4" />
                        <span>Export Settings</span>
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded-lg transition-colors duration-200"
                      >
                        <DocumentArrowUpIcon className="w-4 h-4" />
                        <span>Import Settings</span>
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to reset all settings to defaults?"
                            )
                          ) {
                            resetSettings();
                          }
                        }}
                        className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                      >
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        <span>Reset All</span>
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleImportSettings}
                      className="hidden"
                    />
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
                      <div className="flex justify-between">
                        <span className="text-slate-400">Language:</span>
                        <span className="text-slate-300">
                          {navigator.language}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Online:</span>
                        <span className="text-slate-300 flex items-center space-x-1">
                          {navigator.onLine ? (
                            <>
                              <CheckCircleIcon className="w-4 h-4 text-green-400" />
                              <span>Yes</span>
                            </>
                          ) : (
                            <>
                              <XMarkIcon className="w-4 h-4 text-red-400" />
                              <span>No</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <h4 className="text-lg font-medium text-slate-200 mb-4">
                      License & Credits
                    </h4>
                    <div className="text-sm text-slate-400 space-y-2">
                      <p>© 2024 MCP Studio. All rights reserved.</p>
                      <p>Built with React, TypeScript, and Electron.</p>
                      <p>This software is licensed under the MIT License.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700/50 bg-slate-900/50">
              <div className="flex justify-between items-center">
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          "Are you sure you want to reset all settings to default values?"
                        )
                      ) {
                        resetSettings();
                        setTempSettings({
                          general: {
                            autoStart: false,
                            minimizeToTray: true,
                            closeToTray: false,
                            checkUpdates: true,
                            confirmExit: true,
                            language: "en",
                            theme: "dark",
                            showWelcomeScreen: true,
                          },
                          appearance: {
                            fontSize: "medium",
                            fontFamily: "system",
                            accentColor: "#6366f1",
                            windowOpacity: 95,
                            sidebarWidth: 280,
                            compactMode: false,
                            showLineNumbers: true,
                            enableAnimations: true,
                          },
                          notifications: {
                            serverStatus: true,
                            toolExecution: true,
                            errors: true,
                            updates: true,
                            connectionIssues: true,
                            showDesktopNotifications: true,
                            playNotificationSounds: true,
                          },
                          security: {
                            requireConfirmation: true,
                            allowFileAccess: false,
                            allowNetworkAccess: true,
                            logLevel: "info",
                            maxLogSize: 1000,
                            enableSandboxMode: false,
                            allowedDirectories: [],
                            blockedCommands: [],
                          },
                          advanced: {
                            enableDebugMode: false,
                            maxConcurrentConnections: 10,
                            connectionTimeout: 5000,
                            retryAttempts: 3,
                            enableTelemetry: false,
                            customCSSPath: "",
                            enableExperimentalFeatures: false,
                          },
                        });
                        setTempTheme("dark");
                        setHasChanges(false);
                      }
                    }}
                    className="px-4 py-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded-lg transition-colors duration-200 text-sm"
                  >
                    Reset to Defaults
                  </button>
                </div>

                <div className="flex items-center space-x-3">
                  {hasChanges && (
                    <span className="text-sm text-amber-400">
                      You have unsaved changes
                    </span>
                  )}
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={!hasChanges}
                    className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                      hasChanges
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-slate-700 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    Apply Changes
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SettingsModal;
