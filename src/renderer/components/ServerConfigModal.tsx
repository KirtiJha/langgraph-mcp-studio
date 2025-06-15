import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  ServerIcon,
  CommandLineIcon,
  CogIcon,
  DocumentTextIcon,
  LinkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { ServerConfig } from "../../shared/types";

interface ServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ServerConfig) => void;
  serverConfig: ServerConfig | null;
  mode: "view" | "edit" | "create";
}

const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  serverConfig,
  mode,
}) => {
  const [activeTab, setActiveTab] = useState("basic");
  const [config, setConfig] = useState<ServerConfig>({
    name: "",
    type: "stdio",
    command: "",
    args: [],
    env: {},
    contextParams: {},
  });

  const [envVars, setEnvVars] = useState<
    Array<{ key: string; value: string; hidden: boolean }>
  >([]);
  const [contextParams, setContextParams] = useState<
    Array<{ key: string; value: string }>
  >([]);
  const [argsText, setArgsText] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [showJsonView, setShowJsonView] = useState(false);

  const isReadOnly = mode === "view";
  const isEditing = mode === "edit";
  const isCreating = mode === "create";

  useEffect(() => {
    if (serverConfig && isOpen) {
      setConfig(serverConfig);

      // Convert env object to array
      const envArray = Object.entries(serverConfig.env || {}).map(
        ([key, value]) => ({
          key,
          value: value || "",
          hidden:
            key.toLowerCase().includes("password") ||
            key.toLowerCase().includes("secret") ||
            key.toLowerCase().includes("token"),
        })
      );
      setEnvVars(envArray);

      // Convert contextParams object to array
      const contextArray = Object.entries(serverConfig.contextParams || {}).map(
        ([key, value]) => ({
          key,
          value: String(value || ""),
        })
      );
      setContextParams(contextArray);

      // Convert args array to text
      setArgsText((serverConfig.args || []).join(" "));
    } else if (isCreating && isOpen) {
      resetForm();
    }
  }, [serverConfig, isOpen, mode]);

  useEffect(() => {
    // Validate config
    const isValidConfig =
      config.name.trim() !== "" &&
      (config.type === "stdio"
        ? (config.command || "").trim() !== ""
        : (config.url || "").trim() !== "");
    setIsValid(isValidConfig);
  }, [config]);

  const resetForm = () => {
    setConfig({
      name: "",
      type: "stdio",
      command: "",
      args: [],
      env: {},
      contextParams: {},
    });
    setEnvVars([]);
    setContextParams([]);
    setArgsText("");
    setActiveTab("basic");
    setShowJsonView(false);
  };

  const handleSave = () => {
    // Convert arrays back to objects
    const envObj = envVars.reduce((acc, { key, value }) => {
      if (key.trim()) {
        acc[key.trim()] = value;
      }
      return acc;
    }, {} as Record<string, string>);

    const contextObj = contextParams.reduce((acc, { key, value }) => {
      if (key.trim()) {
        acc[key.trim()] = value;
      }
      return acc;
    }, {} as Record<string, string>);

    // Parse args from text
    const argsArray = argsText
      .split(/\s+/)
      .map((arg) => arg.trim())
      .filter((arg) => arg.length > 0);

    const finalConfig: ServerConfig = {
      ...config,
      env: envObj,
      contextParams: contextObj,
      args: argsArray,
    };

    onSave(finalConfig);
  };

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: "", value: "", hidden: false }]);
  };

  const removeEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const updateEnvVar = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const updated = [...envVars];
    updated[index][field] = value;
    if (field === "key") {
      updated[index].hidden =
        value.toLowerCase().includes("password") ||
        value.toLowerCase().includes("secret") ||
        value.toLowerCase().includes("token");
    }
    setEnvVars(updated);
  };

  const toggleEnvVarVisibility = (index: number) => {
    const updated = [...envVars];
    updated[index].hidden = !updated[index].hidden;
    setEnvVars(updated);
  };

  const addContextParam = () => {
    setContextParams([...contextParams, { key: "", value: "" }]);
  };

  const removeContextParam = (index: number) => {
    setContextParams(contextParams.filter((_, i) => i !== index));
  };

  const updateContextParam = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const updated = [...contextParams];
    updated[index][field] = value;
    setContextParams(updated);
  };

  const getJsonConfig = () => {
    const envObj = envVars.reduce((acc, { key, value }) => {
      if (key.trim()) acc[key.trim()] = value;
      return acc;
    }, {} as Record<string, string>);

    const contextObj = contextParams.reduce((acc, { key, value }) => {
      if (key.trim()) acc[key.trim()] = value;
      return acc;
    }, {} as Record<string, string>);

    const argsArray = argsText
      .split(/\s+/)
      .map((arg) => arg.trim())
      .filter((arg) => arg.length > 0);

    return {
      mcpServers: {
        [config.name || "server-name"]: {
          ...(config.type === "stdio" && { command: config.command }),
          ...(config.type === "sse" && { url: config.url }),
          ...(argsArray.length > 0 && { args: argsArray }),
          ...(Object.keys(envObj).length > 0 && { env: envObj }),
          ...(Object.keys(contextObj).length > 0 && {
            contextParams: contextObj,
          }),
        },
      },
    };
  };

  const copyJsonToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(getJsonConfig(), null, 2));
  };

  const tabs = [
    { id: "basic", label: "Basic", icon: ServerIcon },
    { id: "command", label: "Command", icon: CommandLineIcon },
    { id: "environment", label: "Environment", icon: CogIcon },
    { id: "context", label: "Context", icon: DocumentTextIcon },
    { id: "json", label: "JSON Config", icon: ClipboardDocumentIcon },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl mx-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800/50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <ServerIcon className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {isCreating
                    ? "Create Server"
                    : isEditing
                    ? "Edit Server"
                    : "Server Configuration"}
                </h2>
                <p className="text-sm text-slate-400">
                  {isCreating
                    ? "Configure a new MCP server"
                    : `Configure ${config.name || "server"}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-700 bg-slate-800/30">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                    isActive
                      ? "text-indigo-400 border-indigo-400 bg-indigo-500/10"
                      : "text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-600"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {/* Basic Tab */}
            {activeTab === "basic" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Server Name *
                  </label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={(e) =>
                      setConfig({ ...config, name: e.target.value })
                    }
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter server name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Server Type *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        value: "stdio",
                        label: "Standard I/O",
                        desc: "Local command execution",
                      },
                      {
                        value: "sse",
                        label: "Server-Sent Events",
                        desc: "HTTP-based connection",
                      },
                    ].map((type) => (
                      <button
                        key={type.value}
                        onClick={() =>
                          !isReadOnly &&
                          setConfig({
                            ...config,
                            type: type.value as "stdio" | "sse",
                          })
                        }
                        disabled={isReadOnly}
                        className={`p-3 text-left border rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          config.type === type.value
                            ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                            : "border-slate-600 hover:border-slate-500 text-slate-300"
                        }`}
                      >
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {type.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {config.type === "sse" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Server URL *
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="url"
                        value={config.url || ""}
                        onChange={(e) =>
                          setConfig({ ...config, url: e.target.value })
                        }
                        disabled={isReadOnly}
                        className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="https://example.com/mcp"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Command Tab */}
            {activeTab === "command" && config.type === "stdio" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Command *
                  </label>
                  <div className="relative">
                    <CommandLineIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={config.command || ""}
                      onChange={(e) =>
                        setConfig({ ...config, command: e.target.value })
                      }
                      disabled={isReadOnly}
                      className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="node server.js"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Arguments
                  </label>
                  <textarea
                    value={argsText}
                    onChange={(e) => setArgsText(e.target.value)}
                    disabled={isReadOnly}
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="--port 3000 --verbose"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Space-separated command line arguments
                  </p>
                </div>
              </div>
            )}

            {/* Environment Tab */}
            {activeTab === "environment" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-300">
                    Environment Variables
                  </h3>
                  {!isReadOnly && (
                    <button
                      onClick={addEnvVar}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-md transition-colors text-sm"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span>Add Variable</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {envVars.map((envVar, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                    >
                      <input
                        type="text"
                        value={envVar.key}
                        onChange={(e) =>
                          updateEnvVar(index, "key", e.target.value)
                        }
                        disabled={isReadOnly}
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 text-sm"
                        placeholder="VARIABLE_NAME"
                      />
                      <div className="relative flex-1">
                        <input
                          type={envVar.hidden ? "password" : "text"}
                          value={envVar.value}
                          onChange={(e) =>
                            updateEnvVar(index, "value", e.target.value)
                          }
                          disabled={isReadOnly}
                          className="w-full px-3 py-2 pr-10 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 text-sm"
                          placeholder="value"
                        />
                        <button
                          onClick={() => toggleEnvVarVisibility(index)}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        >
                          {envVar.hidden ? (
                            <EyeIcon className="w-4 h-4" />
                          ) : (
                            <EyeSlashIcon className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {!isReadOnly && (
                        <button
                          onClick={() => removeEnvVar(index)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {envVars.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <CogIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No environment variables configured</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Context Tab */}
            {activeTab === "context" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-slate-300">
                      Context Parameters
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Parameters automatically injected into tool calls
                    </p>
                  </div>
                  {!isReadOnly && (
                    <button
                      onClick={addContextParam}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-md transition-colors text-sm"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span>Add Parameter</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {contextParams.map((param, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                    >
                      <input
                        type="text"
                        value={param.key}
                        onChange={(e) =>
                          updateContextParam(index, "key", e.target.value)
                        }
                        disabled={isReadOnly}
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 text-sm"
                        placeholder="parameter_name"
                      />
                      <input
                        type="text"
                        value={param.value}
                        onChange={(e) =>
                          updateContextParam(index, "value", e.target.value)
                        }
                        disabled={isReadOnly}
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 text-sm"
                        placeholder="value"
                      />
                      {!isReadOnly && (
                        <button
                          onClick={() => removeContextParam(index)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {contextParams.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <DocumentTextIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No context parameters configured</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* JSON Tab */}
            {activeTab === "json" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-300">
                    JSON Configuration
                  </h3>
                  <button
                    onClick={copyJsonToClipboard}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors text-sm"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4" />
                    <span>Copy</span>
                  </button>
                </div>

                <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
                  <pre className="text-sm text-slate-300 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(getJsonConfig(), null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-slate-700 bg-slate-800/50">
            <div className="flex items-center space-x-2">
              {!isValid && !isReadOnly && (
                <div className="flex items-center space-x-2 text-amber-400">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  <span className="text-sm">Please fill required fields</span>
                </div>
              )}
              {isValid && !isReadOnly && (
                <div className="flex items-center space-x-2 text-emerald-400">
                  <CheckIcon className="w-4 h-4" />
                  <span className="text-sm">Configuration is valid</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                {isReadOnly ? "Close" : "Cancel"}
              </button>
              {!isReadOnly && (
                <button
                  onClick={handleSave}
                  disabled={!isValid}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  <CheckIcon className="w-4 h-4" />
                  <span>{isCreating ? "Create Server" : "Save Changes"}</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ServerConfigModal;
