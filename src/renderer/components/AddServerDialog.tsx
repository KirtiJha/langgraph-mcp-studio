import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  ServerIcon,
  CommandLineIcon,
  FolderIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  InformationCircleIcon,
  PlusIcon,
  TrashIcon,
  CogIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { ServerConfig, Tool, ModelConfig } from "../../shared/types";

interface AddServerDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (serverConfig: ServerConfig) => void;
}

interface ToolConfig {
  name: string;
  description?: string;
  parameters: Record<string, any>;
}

interface MCPServerConfig {
  mcpServers: Record<
    string,
    {
      command: string;
      args?: string[];
      env?: Record<string, string>;
      cwd?: string;
    }
  >;
}

const AddServerDialog: React.FC<AddServerDialogProps> = ({
  open,
  onClose,
  onAdd,
}) => {
  // Enhanced Add Server Dialog with tabbed interface
  const [activeTab, setActiveTab] = useState<"manual" | "import" | "tools">(
    "manual"
  );

  // Manual configuration state
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [cwd, setCwd] = useState("");
  const [env, setEnv] = useState("");
  const [preferredModelId, setPreferredModelId] = useState<string>("");

  // Available models state
  const [availableModels, setAvailableModels] = useState<ModelConfig[]>([]);

  // Import JSON state
  const [importJson, setImportJson] = useState("");
  const [parsedConfig, setParsedConfig] = useState<ServerConfig | null>(null);
  const [importError, setImportError] = useState("");

  // Tool discovery state
  const [discoveredTools, setDiscoveredTools] = useState<Tool[]>([]);
  const [toolConfigs, setToolConfigs] = useState<Record<string, ToolConfig>>(
    {}
  );
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Form validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const parseImportedJson = (jsonString: string): ServerConfig | null => {
    try {
      const parsed = JSON.parse(jsonString);

      // Handle standard MCP server config format
      if (parsed.mcpServers) {
        const serverKeys = Object.keys(parsed.mcpServers);
        if (serverKeys.length === 0) {
          throw new Error("No servers found in mcpServers configuration");
        }

        // Use the first server (or let user choose if multiple)
        const serverKey = serverKeys[0];
        const serverData = parsed.mcpServers[serverKey];

        return {
          name: serverKey,
          type: "stdio",
          command: serverData.command,
          args: serverData.args || [],
          env: serverData.env || {},
          ...(serverData.cwd && { cwd: serverData.cwd }),
        };
      }

      // Handle direct server configuration format
      if (parsed.command) {
        return {
          name: parsed.name || "Imported Server",
          type: "stdio",
          command: parsed.command,
          args: parsed.args || [],
          env: parsed.env || {},
          ...(parsed.cwd && { cwd: parsed.cwd }),
        };
      }

      throw new Error(
        "Invalid configuration format. Expected 'mcpServers' object or direct server configuration."
      );
    } catch (error) {
      throw new Error(
        `Failed to parse JSON: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleImportJson = () => {
    try {
      const parsed = parseImportedJson(importJson);
      if (parsed) {
        setParsedConfig(parsed);
        setName(parsed.name);
        setCommand(parsed.command || "");
        setArgs(parsed.args?.join(" ") || "");
        setCwd(parsed.cwd || "");
        if (parsed.env) {
          setEnv(
            Object.entries(parsed.env)
              .map(([k, v]) => `${k}=${v}`)
              .join("\n")
          );
        }
        setPreferredModelId(parsed.preferredModelId || "");
        setImportError("");
        setActiveTab("manual"); // Switch to manual tab to show populated fields
      }
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Invalid JSON format"
      );
    }
  };

  const discoverToolParameters = async () => {
    if (!name || !command) {
      alert("Please fill in server name and command first");
      return;
    }

    setIsDiscovering(true);
    let tempServerId: string | null = null;

    try {
      // Create a temporary server config for discovery
      const tempConfig: ServerConfig = {
        name: `temp-${Date.now()}`,
        type: "stdio",
        command,
        args: args.split(" ").filter((arg) => arg.trim()),
        ...(cwd && { cwd }),
        ...(env && {
          env: Object.fromEntries(
            env.split("\n").map((line) => line.split("=", 2))
          ),
        }),
      };

      // Add temporary server and get the actual server ID
      const tempServer = await (window as any).electronAPI.addServer(
        tempConfig
      );
      tempServerId = tempServer.id;

      console.log("Tool discovery: Added temp server with ID:", tempServerId);

      // Connect and discover tools with timeout
      const connectPromise = (window as any).electronAPI.connectServer(
        tempServerId
      );
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Connection timeout after 10 seconds")),
          10000
        )
      );

      await Promise.race([connectPromise, timeoutPromise]);

      console.log("Tool discovery: Connected to temp server");

      // Wait for connection to establish and tools to be available
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Get tools for this server
      const tools = await (window as any).electronAPI.listTools(tempServerId);

      console.log("Tool discovery: Found tools:", tools.length);

      if (tools.length === 0) {
        throw new Error(
          "No tools found. The server may not be properly configured or may not expose any tools."
        );
      }

      setDiscoveredTools(tools);

      // Extract parameters for each tool
      const configs: Record<string, ToolConfig> = {};
      tools.forEach((tool: Tool) => {
        if (tool.inputSchema?.properties) {
          const parameters: Record<string, any> = {};
          Object.entries(tool.inputSchema.properties).forEach(
            ([paramName, paramDef]: [string, any]) => {
              if (
                paramDef.type === "string" &&
                paramDef.default === undefined
              ) {
                parameters[paramName] = ""; // Default empty for user to fill
              } else if (paramDef.default !== undefined) {
                parameters[paramName] = paramDef.default;
              }
            }
          );

          configs[tool.name] = {
            name: tool.name,
            description: tool.description,
            parameters,
          };
        }
      });

      setToolConfigs(configs);

      console.log(
        "Tool discovery: Configured",
        Object.keys(configs).length,
        "tools"
      );
    } catch (error) {
      console.error("Failed to discover tool parameters:", error);

      let errorMessage = "Failed to discover tools";
      if (error instanceof Error) {
        if (
          error.message.includes("ZoneInfoNotFoundError") ||
          error.message.includes("No time zone found")
        ) {
          errorMessage =
            "Server failed due to timezone error. If using mcp-server-time, try adding '--local-timezone America/New_York' to the arguments or remove timezone arguments entirely.";
        } else if (
          error.message.includes("Connection closed") ||
          error.message.includes("MCP error -32000")
        ) {
          errorMessage =
            "Server connection failed. Please check that the command and arguments are correct and the server starts properly.";
        } else if (
          error.message.includes("ENOENT") ||
          error.message.includes("spawn")
        ) {
          errorMessage =
            "Command not found. Make sure the server command is installed and available in your PATH.";
        } else if (error.message.includes("Connection timeout")) {
          errorMessage =
            "Server took too long to start. Please check the server configuration.";
        } else if (error.message.includes("No tools found")) {
          errorMessage = error.message;
        } else {
          errorMessage = `Server error: ${error.message}`;
        }
      }

      alert(errorMessage);
    } finally {
      // Always clean up temporary server if it was created
      if (tempServerId) {
        try {
          console.log("Tool discovery: Cleaning up temp server", tempServerId);
          await (window as any).electronAPI.removeServer(tempServerId);
        } catch (cleanupError) {
          console.error("Failed to cleanup temporary server:", cleanupError);
        }
      }
      setIsDiscovering(false);
    }
  };

  const updateToolParameter = (
    toolName: string,
    paramName: string,
    value: any
  ) => {
    setToolConfigs((prev) => ({
      ...prev,
      [toolName]: {
        ...prev[toolName],
        parameters: {
          ...prev[toolName].parameters,
          [paramName]: value,
        },
      },
    }));
  };

  // Load available models when dialog opens
  useEffect(() => {
    if (open) {
      const loadModels = async () => {
        try {
          const models = await (window as any).electronAPI.getModelConfigs();
          setAvailableModels(models || []);
        } catch (error) {
          console.error('Failed to load models:', error);
          setAvailableModels([]);
        }
      };
      loadModels();
    }
  }, [open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Server name is required";
    }

    if (!command.trim()) {
      newErrors.command = "Command is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Parse arguments and environment variables
    const parsedArgs = args
      .split(/\s+/)
      .filter((arg) => arg.trim())
      .map((arg) => arg.trim());

    const parsedEnv = env
      ? Object.fromEntries(
          env
            .split("\n")
            .filter((line) => line.includes("="))
            .map((line) => {
              const [key, ...valueParts] = line.split("=");
              return [key.trim(), valueParts.join("=").trim()];
            })
        )
      : {};

    const serverConfig: ServerConfig = {
      name: name.trim(),
      type: "stdio",
      command: command.trim(),
      args: parsedArgs,
      ...(cwd.trim() && { cwd: cwd.trim() }),
      ...(Object.keys(parsedEnv).length > 0 && { env: parsedEnv }),
      ...(preferredModelId && { preferredModelId: preferredModelId }),
      // Include tool-specific context parameters if any were set up
      ...(Object.keys(toolConfigs).length > 0 && {
        toolConfigs: Object.fromEntries(
          Object.entries(toolConfigs).map(([toolName, config]) => [
            toolName,
            config.parameters,
          ])
        ),
      }),
    };

    onAdd(serverConfig);
    handleClose();
  };

  const handleClose = () => {
    setName("");
    setCommand("");
    setArgs("");
    setCwd("");
    setEnv("");
    setPreferredModelId("");
    setImportJson("");
    setParsedConfig(null);
    setImportError("");
    setDiscoveredTools([]);
    setToolConfigs({});
    setActiveTab("manual");
    setErrors({});
    onClose();
  };

  const inputClasses = `
    w-full px-4 py-3 rounded-lg border bg-zinc-900 border-zinc-700 
    text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 
    focus:ring-blue-500 focus:border-transparent transition-all duration-200
  `;

  const errorInputClasses = `
    w-full px-4 py-3 rounded-lg border bg-zinc-900 border-red-500 
    text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 
    focus:ring-red-500 focus:border-transparent transition-all duration-200
  `;

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-700">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <ServerIcon className="w-6 h-6 text-blue-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-zinc-100">
                    Add MCP Server
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors duration-200"
                  title="Close dialog"
                  aria-label="Close dialog"
                >
                  <XMarkIcon className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                {/* Tab Navigation */}
                <div className="flex border-b border-zinc-700 px-6">
                  <button
                    type="button"
                    onClick={() => setActiveTab("manual")}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-200 ${
                      activeTab === "manual"
                        ? "border-blue-500 text-blue-400"
                        : "border-transparent text-zinc-400 hover:text-zinc-300"
                    }`}
                  >
                    <ServerIcon className="w-4 h-4 inline mr-2" />
                    Manual Setup
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("import")}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-200 ${
                      activeTab === "import"
                        ? "border-blue-500 text-blue-400"
                        : "border-transparent text-zinc-400 hover:text-zinc-300"
                    }`}
                  >
                    <DocumentTextIcon className="w-4 h-4 inline mr-2" />
                    Import JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("tools")}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-200 ${
                      activeTab === "tools"
                        ? "border-blue-500 text-blue-400"
                        : "border-transparent text-zinc-400 hover:text-zinc-300"
                    }`}
                  >
                    <WrenchScrewdriverIcon className="w-4 h-4 inline mr-2" />
                    Context Parameters ({Object.keys(toolConfigs).length})
                  </button>
                </div>

                {/* Tab Content */}
                <form
                  onSubmit={handleSubmit}
                  className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]"
                >
                  {/* Manual Setup Tab */}
                  {activeTab === "manual" && (
                    <div className="space-y-6">
                      {/* Server Name */}
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                          Server Name *
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g., My MCP Server"
                          className={
                            errors.name ? errorInputClasses : inputClasses
                          }
                        />
                        {errors.name && (
                          <p className="mt-2 text-sm text-red-400 flex items-center">
                            <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                            {errors.name}
                          </p>
                        )}
                      </div>

                      {/* Command */}
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                          Command *
                        </label>
                        <div className="relative">
                          <CommandLineIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" />
                          <input
                            type="text"
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            placeholder="e.g., node server.js or python main.py"
                            className={`pl-10 ${
                              errors.command ? errorInputClasses : inputClasses
                            }`}
                          />
                        </div>
                        {errors.command && (
                          <p className="mt-2 text-sm text-red-400 flex items-center">
                            <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                            {errors.command}
                          </p>
                        )}
                      </div>

                      {/* Arguments */}
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                          Arguments
                        </label>
                        <input
                          type="text"
                          value={args}
                          onChange={(e) => setArgs(e.target.value)}
                          placeholder="e.g., --port 3000 --config config.json"
                          className={inputClasses}
                        />
                        <p className="mt-1 text-xs text-zinc-500">
                          Space-separated command line arguments
                        </p>
                      </div>

                      {/* Working Directory */}
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                          Working Directory
                        </label>
                        <div className="relative">
                          <FolderIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" />
                          <input
                            type="text"
                            value={cwd}
                            onChange={(e) => setCwd(e.target.value)}
                            placeholder="e.g., /path/to/server"
                            className={`pl-10 ${inputClasses}`}
                          />
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          Directory to run the command from
                        </p>
                      </div>

                      {/* Environment Variables */}
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                          Environment Variables
                        </label>
                        <textarea
                          value={env}
                          onChange={(e) => setEnv(e.target.value)}
                          placeholder={`API_KEY=your_api_key\nDEBUG=true\nPORT=3000`}
                          rows={4}
                          className={inputClasses}
                        />
                        <p className="mt-1 text-xs text-zinc-500">
                          One variable per line in KEY=value format
                        </p>
                      </div>

                      {/* Preferred AI Model */}
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                          Preferred AI Model
                        </label>
                        <div className="relative">
                          <CogIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" />
                          <select
                            value={preferredModelId}
                            onChange={(e) => setPreferredModelId(e.target.value)}
                            className={`pl-10 ${inputClasses} appearance-none cursor-pointer`}
                            aria-label="Preferred AI Model"
                            title="Select which AI model this server should use for tool execution"
                          >
                            <option value="">Use default model</option>
                            {availableModels.filter(model => model.enabled).map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.modelId}
                              </option>
                            ))}
                          </select>
                          {/* Custom dropdown arrow */}
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          Choose which AI model this server should use for tool execution (optional)
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Import JSON Tab */}
                  {activeTab === "import" && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                          Paste MCP Server Configuration JSON
                        </label>
                        <textarea
                          value={importJson}
                          onChange={(e) => setImportJson(e.target.value)}
                          placeholder={`Example:\n{\n  "mcpServers": {\n    "filesystem": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"]\n    }\n  }\n}`}
                          rows={10}
                          className={
                            importError ? errorInputClasses : inputClasses
                          }
                        />
                        {importError && (
                          <p className="mt-2 text-sm text-red-400 flex items-center">
                            <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                            {importError}
                          </p>
                        )}
                      </div>

                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={handleImportJson}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
                        >
                          Parse & Import
                        </button>
                        <button
                          type="button"
                          onClick={() => setImportJson("")}
                          className="px-4 py-2 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600 transition-colors duration-200"
                        >
                          Clear
                        </button>
                      </div>

                      {parsedConfig && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                          <h4 className="text-green-300 font-medium mb-2">
                            Successfully Parsed!
                          </h4>
                          <p className="text-sm text-green-200">
                            Configuration has been parsed and populated in the
                            Manual Setup tab.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Context Parameters Tab */}
                  {activeTab === "tools" && (
                    <div className="space-y-6">
                      {!discoveredTools.length ? (
                        <div className="text-center py-8">
                          <WrenchScrewdriverIcon className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-zinc-300 mb-2">
                            No Context Parameters Set
                          </h3>
                          <p className="text-zinc-400 mb-4">
                            Configure your server in the Manual Setup tab first,
                            then discover tools to set up context parameters.
                          </p>
                          <button
                            type="button"
                            onClick={discoverToolParameters}
                            disabled={isDiscovering || !name || !command}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 disabled:opacity-50"
                          >
                            {isDiscovering
                              ? "Discovering..."
                              : "Discover Tools"}
                          </button>

                          {/* Helpful tips */}
                          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <h4 className="text-blue-300 font-medium mb-2 flex items-center">
                              <InformationCircleIcon className="w-4 h-4 mr-2" />
                              Common Issues & Tips
                            </h4>
                            <ul className="text-sm text-blue-200 space-y-1">
                              <li>
                                • For{" "}
                                <code className="bg-blue-500/20 px-1 rounded">
                                  mcp-server-time
                                </code>
                                : Add{" "}
                                <code className="bg-blue-500/20 px-1 rounded">
                                  --local-timezone America/New_York
                                </code>{" "}
                                to avoid timezone errors
                              </li>
                              <li>
                                • Make sure the server command is installed and
                                available in your PATH
                              </li>
                              <li>
                                • The server will be temporarily started to
                                discover tools, then automatically removed
                              </li>
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-medium text-zinc-300">
                                Configure Context Parameters by Tool
                              </h3>
                              <p className="text-sm text-zinc-400 mt-1">
                                Set default values for tool parameters. These
                                will be pre-filled when executing tools.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={discoverToolParameters}
                              disabled={isDiscovering}
                              className="px-3 py-1 text-sm bg-zinc-700 text-zinc-300 rounded hover:bg-zinc-600 transition-colors duration-200"
                            >
                              {isDiscovering ? "Discovering..." : "Refresh"}
                            </button>
                          </div>

                          {Object.entries(toolConfigs).map(
                            ([toolName, config]) => (
                              <div
                                key={toolName}
                                className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700"
                              >
                                <h4 className="font-medium text-zinc-300 mb-2">
                                  {toolName}
                                </h4>
                                {config.description && (
                                  <p className="text-sm text-zinc-400 mb-3">
                                    {config.description}
                                  </p>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {Object.entries(config.parameters).map(
                                    ([paramName, value]) => (
                                      <div key={paramName}>
                                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                                          {paramName}
                                        </label>
                                        <input
                                          type="text"
                                          value={value}
                                          onChange={(e) =>
                                            updateToolParameter(
                                              toolName,
                                              paramName,
                                              e.target.value
                                            )
                                          }
                                          className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          placeholder={`Enter ${paramName}...`}
                                        />
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </form>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-zinc-700 bg-zinc-900/50">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-300 
                           hover:bg-zinc-800 rounded-lg transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  className="px-6 py-2 text-sm font-medium bg-blue-500 text-white 
                           hover:bg-blue-600 rounded-lg transition-all duration-200 
                           flex items-center space-x-2"
                >
                  <ServerIcon className="w-4 h-4" />
                  <span>Add Server</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AddServerDialog;
