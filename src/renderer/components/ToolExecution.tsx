import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlayIcon,
  StopIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

interface ToolExecutionProps {
  tools: Tool[];
  servers: ServerStatus[];
  onExecuteTool?: (
    toolName: string,
    args: any,
    serverId: string
  ) => Promise<any>;
}

interface Tool {
  name: string;
  description: string;
  serverId: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

interface ServerStatus {
  id: string;
  name: string;
  connected: boolean;
  toolConfigs?: Record<string, Record<string, any>>; // Pre-configured tool parameters
}

interface ToolExecution {
  id: string;
  toolName: string;
  args: any;
  status: "running" | "completed" | "error";
  startTime: Date;
  endTime?: Date;
  result?: any;
  error?: string;
}

export const ToolExecution: React.FC<ToolExecutionProps> = ({
  tools,
  servers,
  onExecuteTool,
}) => {
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [toolArgs, setToolArgs] = useState<Record<string, any>>({});
  const [executions, setExecutions] = useState<ToolExecution[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [expandedExecution, setExpandedExecution] = useState<string | null>(
    null
  );

  // Populate default values when tool is selected
  const selectTool = (tool: Tool) => {
    setSelectedTool(tool);

    // Set default values for arguments - first from tool schema defaults, then from server tool configs
    const defaultArgs: Record<string, any> = {};

    // Get server configuration for this tool
    const server = servers.find((s) => s.id === tool.serverId);
    const serverToolConfig = server?.toolConfigs?.[tool.name];

    if (tool.inputSchema?.properties) {
      Object.entries(tool.inputSchema.properties).forEach(
        ([argName, argSchema]) => {
          // Prioritize server-configured values over schema defaults
          if (serverToolConfig && serverToolConfig[argName] !== undefined) {
            defaultArgs[argName] = serverToolConfig[argName];
          } else if ((argSchema as any).default !== undefined) {
            defaultArgs[argName] = (argSchema as any).default;
          }
        }
      );
    }

    // Also include any additional server-configured parameters not in schema
    if (serverToolConfig) {
      Object.entries(serverToolConfig).forEach(([paramName, value]) => {
        if (defaultArgs[paramName] === undefined) {
          defaultArgs[paramName] = value;
        }
      });
    }

    setToolArgs(defaultArgs);
  };

  // Check if all required arguments are provided
  const canExecuteTool = (tool: Tool) => {
    if (!tool.inputSchema?.required) return true;

    return tool.inputSchema.required.every(
      (argName) =>
        toolArgs[argName] !== undefined &&
        toolArgs[argName] !== null &&
        toolArgs[argName] !== ""
    );
  };

  const executeTool = async (tool: Tool) => {
    if (!onExecuteTool) return;

    // Validate required arguments
    if (tool.inputSchema?.required) {
      const missingArgs = tool.inputSchema.required.filter(
        (argName) =>
          !toolArgs[argName] &&
          toolArgs[argName] !== 0 &&
          toolArgs[argName] !== false
      );

      if (missingArgs.length > 0) {
        alert(`Missing required arguments: ${missingArgs.join(", ")}`);
        return;
      }
    }

    const executionId = Date.now().toString();
    const execution: ToolExecution = {
      id: executionId,
      toolName: tool.name,
      args: toolArgs,
      status: "running",
      startTime: new Date(),
    };

    setExecutions((prev) => [execution, ...prev]);
    setIsExecuting(true);

    try {
      const result = await onExecuteTool(tool.name, toolArgs, tool.serverId);
      setExecutions((prev) =>
        prev.map((ex) =>
          ex.id === executionId
            ? {
                ...ex,
                status: "completed",
                endTime: new Date(),
                result,
              }
            : ex
        )
      );
    } catch (error) {
      setExecutions((prev) =>
        prev.map((ex) =>
          ex.id === executionId
            ? {
                ...ex,
                status: "error",
                endTime: new Date(),
                error: error instanceof Error ? error.message : "Unknown error",
              }
            : ex
        )
      );
    } finally {
      setIsExecuting(false);
    }
  };

  const renderArgInput = (argName: string, argSchema: any) => {
    const value = toolArgs[argName] || "";

    // Check if this parameter is pre-configured from server settings
    const server = servers.find((s) => s.id === selectedTool?.serverId);
    const isPreConfigured =
      selectedTool &&
      server?.toolConfigs?.[selectedTool.name]?.[argName] !== undefined;

    // Handle enum types with select dropdown
    if (argSchema.enum) {
      return (
        <div className="space-y-2">
          <select
            value={value}
            onChange={(e) =>
              setToolArgs({ ...toolArgs, [argName]: e.target.value })
            }
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select {argName}...</option>
            {argSchema.enum.map((option: any, idx: number) => (
              <option key={idx} value={option}>
                {String(option)}
              </option>
            ))}
          </select>
          {isPreConfigured && (
            <p className="text-xs text-blue-400 flex items-center space-x-1">
              <span>🔧</span>
              <span>Pre-configured from server settings</span>
            </p>
          )}
        </div>
      );
    }

    switch (argSchema.type) {
      case "string":
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={value}
              onChange={(e) =>
                setToolArgs({ ...toolArgs, [argName]: e.target.value })
              }
              placeholder={argSchema.description || `Enter ${argName}`}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {isPreConfigured && (
              <p className="text-xs text-blue-400 flex items-center space-x-1">
                <span>🔧</span>
                <span>Pre-configured from server settings</span>
              </p>
            )}
          </div>
        );

      case "number":
      case "integer":
        return (
          <div className="space-y-2">
            <input
              type="number"
              value={value}
              onChange={(e) =>
                setToolArgs({
                  ...toolArgs,
                  [argName]:
                    argSchema.type === "integer"
                      ? parseInt(e.target.value) || 0
                      : parseFloat(e.target.value) || 0,
                })
              }
              placeholder={argSchema.description || `Enter ${argName}`}
              step={argSchema.type === "integer" ? "1" : "any"}
              min={argSchema.minimum}
              max={argSchema.maximum}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {isPreConfigured && (
              <p className="text-xs text-blue-400 flex items-center space-x-1">
                <span>🔧</span>
                <span>Pre-configured from server settings</span>
              </p>
            )}
          </div>
        );

      case "boolean":
        return (
          <div className="space-y-2">
            <label className="relative inline-flex cursor-pointer">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) =>
                  setToolArgs({ ...toolArgs, [argName]: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
            {isPreConfigured && (
              <p className="text-xs text-blue-400 flex items-center space-x-1">
                <span>🔧</span>
                <span>Pre-configured from server settings</span>
              </p>
            )}
          </div>
        );

      case "object":
        return (
          <div className="space-y-2">
            <textarea
              value={
                typeof value === "string"
                  ? value
                  : JSON.stringify(value, null, 2)
              }
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setToolArgs({ ...toolArgs, [argName]: parsed });
                } catch {
                  setToolArgs({ ...toolArgs, [argName]: e.target.value });
                }
              }}
              placeholder={`Enter JSON for ${argName}`}
              rows={4}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
            />
            {isPreConfigured && (
              <p className="text-xs text-blue-400 flex items-center space-x-1">
                <span>🔧</span>
                <span>Pre-configured from server settings</span>
              </p>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={value}
              onChange={(e) =>
                setToolArgs({ ...toolArgs, [argName]: e.target.value })
              }
              placeholder={argSchema.description || `Enter ${argName}`}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {isPreConfigured && (
              <p className="text-xs text-blue-400 flex items-center space-x-1">
                <span>🔧</span>
                <span>Pre-configured from server settings</span>
              </p>
            )}
          </div>
        );
    }
  };

  const formatExecutionTime = (execution: ToolExecution) => {
    if (!execution.endTime) return "Running...";
    const duration =
      execution.endTime.getTime() - execution.startTime.getTime();
    return `${duration}ms`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 p-8 pb-4">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent mb-3">
          Tool Execution
        </h2>
        <p className="text-slate-400 text-lg">
          Execute tools from your connected MCP servers
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tool Selection & Configuration */}
          <div className="space-y-6">
            {/* Tool List */}
            <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-6">
              <h3 className="text-xl font-semibold text-slate-200 mb-4">
                Available Tools
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {tools.map((tool) => {
                  const server = servers.find((s) => s.id === tool.serverId);
                  return (
                    <motion.button
                      key={`${tool.serverId}-${tool.name}`}
                      onClick={() => selectTool(tool)}
                      className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
                        selectedTool?.name === tool.name
                          ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300"
                          : "bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600"
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start space-x-3">
                        <WrenchScrewdriverIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium">{tool.name}</h4>
                          <p className="text-sm opacity-75 mt-1">
                            {tool.description}
                          </p>
                          <div className="flex items-center mt-2">
                            <span className="text-xs px-2 py-1 bg-slate-700/50 rounded">
                              {server?.name || "Unknown Server"}
                            </span>
                            <div
                              className={`w-2 h-2 rounded-full ml-2 ${
                                server?.connected
                                  ? "bg-emerald-400"
                                  : "bg-slate-500"
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}

                {tools.length === 0 && (
                  <div className="text-center py-8">
                    <WrenchScrewdriverIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No tools available</p>
                    <p className="text-slate-500 text-sm">
                      Connect to MCP servers to see tools
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Tool Configuration */}
            {selectedTool && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-6 max-h-[600px] overflow-y-auto"
              >
                <h3 className="text-xl font-semibold text-slate-200 mb-4">
                  Configure Tool
                </h3>

                <div className="mb-6">
                  <div className="flex items-start space-x-3 mb-4">
                    <WrenchScrewdriverIcon className="w-6 h-6 text-indigo-400 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-slate-300">
                        {selectedTool.name}
                      </h4>
                      <p className="text-slate-400 text-sm mt-1">
                        {selectedTool.description || "No description available"}
                      </p>
                      <div className="flex items-center mt-2 space-x-3">
                        <span className="text-xs px-2 py-1 bg-slate-700/50 rounded">
                          Server:{" "}
                          {servers.find((s) => s.id === selectedTool.serverId)
                            ?.name || "Unknown"}
                        </span>
                        {selectedTool.inputSchema?.required &&
                          selectedTool.inputSchema.required.length > 0 && (
                            <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded">
                              {selectedTool.inputSchema.required.length}{" "}
                              required args
                            </span>
                          )}
                        {selectedTool.inputSchema?.properties && (
                          <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                            {
                              Object.keys(selectedTool.inputSchema.properties)
                                .length
                            }{" "}
                            total args
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Show schema info if no properties */}
                  {(!selectedTool.inputSchema ||
                    !selectedTool.inputSchema.properties) && (
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 mb-4">
                      <div className="flex items-center space-x-2 text-slate-400">
                        <InformationCircleIcon className="w-5 h-5" />
                        <span className="text-sm">
                          {!selectedTool.inputSchema
                            ? "This tool has no input schema defined. It may not require arguments or the schema is not available."
                            : "This tool has no input parameters defined."}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {selectedTool.inputSchema?.properties && (
                  <div className="space-y-4">
                    <h5 className="text-md font-medium text-slate-300 border-b border-slate-700/50 pb-2">
                      Tool Parameters
                    </h5>
                    {Object.entries(selectedTool.inputSchema.properties).map(
                      ([argName, argSchema]) => (
                        <div
                          key={argName}
                          className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <label className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-slate-300">
                                {argName}
                              </span>
                              {selectedTool.inputSchema?.required?.includes(
                                argName
                              ) && (
                                <span className="text-red-400 text-xs px-1.5 py-0.5 bg-red-500/20 rounded">
                                  Required
                                </span>
                              )}
                              <span className="text-xs px-1.5 py-0.5 bg-slate-600/50 text-slate-400 rounded">
                                {(argSchema as any).type || "any"}
                              </span>
                            </label>
                          </div>

                          {(argSchema as any).description && (
                            <p className="text-xs text-slate-400 mb-3 italic">
                              {(argSchema as any).description}
                            </p>
                          )}

                          {/* Show enum options if available */}
                          {(argSchema as any).enum && (
                            <div className="mb-3">
                              <span className="text-xs text-slate-500">
                                Allowed values:
                              </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(argSchema as any).enum.map(
                                  (value: any, idx: number) => (
                                    <span
                                      key={idx}
                                      className="text-xs px-2 py-1 bg-slate-700/50 text-slate-300 rounded"
                                    >
                                      {String(value)}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                          {/* Show default value if available */}
                          {(argSchema as any).default !== undefined && (
                            <div className="mb-3">
                              <span className="text-xs text-slate-500">
                                Default:
                              </span>
                              <span className="text-xs ml-2 px-2 py-1 bg-slate-700/50 text-slate-300 rounded font-mono">
                                {JSON.stringify((argSchema as any).default)}
                              </span>
                            </div>
                          )}

                          {renderArgInput(argName, argSchema)}
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* JSON Preview */}
                {Object.keys(toolArgs).length > 0 && (
                  <div className="mt-6 bg-slate-800/30 rounded-lg border border-slate-700/30 overflow-hidden">
                    <div className="px-4 py-2 bg-slate-700/30 border-b border-slate-700/30">
                      <h6 className="text-sm font-medium text-slate-300 flex items-center space-x-2">
                        <span>Arguments JSON Preview</span>
                        <button
                          onClick={() =>
                            copyToClipboard(JSON.stringify(toolArgs, null, 2))
                          }
                          className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          <ClipboardDocumentIcon className="w-4 h-4" />
                        </button>
                      </h6>
                    </div>
                    <pre className="p-4 text-xs text-slate-300 font-mono overflow-x-auto">
                      {JSON.stringify(toolArgs, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={() => executeTool(selectedTool)}
                    disabled={isExecuting || !canExecuteTool(selectedTool)}
                    className={`flex-1 px-6 py-3 rounded-lg flex items-center justify-center space-x-2 transition-all duration-200 ${
                      isExecuting || !canExecuteTool(selectedTool)
                        ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                    }`}
                  >
                    {isExecuting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Executing...</span>
                      </>
                    ) : !canExecuteTool(selectedTool) ? (
                      <>
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        <span>Missing Required Args</span>
                      </>
                    ) : (
                      <>
                        <PlayIcon className="w-4 h-4" />
                        <span>Execute Tool</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setToolArgs({})}
                    className="px-4 py-3 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors duration-200"
                  >
                    Clear
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Execution History */}
          <div className="space-y-6">
            <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-6 max-h-[600px] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-slate-200">
                  Execution History
                </h3>
                <button
                  onClick={() => setExecutions([])}
                  className="text-sm text-slate-400 hover:text-slate-300 transition-colors duration-200"
                >
                  Clear History
                </button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {executions.map((execution) => (
                  <motion.div
                    key={execution.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setExpandedExecution(
                          expandedExecution === execution.id
                            ? null
                            : execution.id
                        )
                      }
                      className="w-full p-4 text-left hover:bg-slate-800/70 transition-colors duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              execution.status === "running"
                                ? "bg-blue-400 animate-pulse"
                                : execution.status === "completed"
                                ? "bg-emerald-400"
                                : "bg-red-400"
                            }`}
                          />
                          <div>
                            <h4 className="font-medium text-slate-200">
                              {execution.toolName}
                            </h4>
                            <p className="text-sm text-slate-400">
                              {execution.startTime.toLocaleTimeString()} •{" "}
                              {formatExecutionTime(execution)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {execution.status === "completed" && (
                            <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                          )}
                          {execution.status === "error" && (
                            <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
                          )}
                          {execution.status === "running" && (
                            <InformationCircleIcon className="w-5 h-5 text-blue-400" />
                          )}
                          {expandedExecution === execution.id ? (
                            <ChevronDownIcon className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronRightIcon className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>
                    </button>

                    <AnimatePresence>
                      {expandedExecution === execution.id && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 border-t border-slate-700/50 space-y-4">
                            {/* Arguments */}
                            <div>
                              <h5 className="text-sm font-medium text-slate-300 mb-2">
                                Arguments
                              </h5>
                              <div className="relative">
                                <pre className="bg-slate-700/50 p-3 rounded text-xs font-mono text-slate-300 overflow-x-auto">
                                  {JSON.stringify(execution.args, null, 2)}
                                </pre>
                                <button
                                  onClick={() =>
                                    copyToClipboard(
                                      JSON.stringify(execution.args, null, 2)
                                    )
                                  }
                                  className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-200 transition-colors duration-200"
                                >
                                  <ClipboardDocumentIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Result or Error */}
                            {execution.result && (
                              <div>
                                <h5 className="text-sm font-medium text-slate-300 mb-2">
                                  Result
                                </h5>
                                <div className="relative">
                                  <pre className="bg-slate-700/50 p-3 rounded text-xs font-mono text-slate-300 overflow-x-auto max-h-40 overflow-y-auto">
                                    {typeof execution.result === "string"
                                      ? execution.result
                                      : JSON.stringify(
                                          execution.result,
                                          null,
                                          2
                                        )}
                                  </pre>
                                  <button
                                    onClick={() =>
                                      copyToClipboard(
                                        typeof execution.result === "string"
                                          ? execution.result
                                          : JSON.stringify(
                                              execution.result,
                                              null,
                                              2
                                            )
                                      )
                                    }
                                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-200 transition-colors duration-200"
                                  >
                                    <ClipboardDocumentIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {execution.error && (
                              <div>
                                <h5 className="text-sm font-medium text-red-300 mb-2">
                                  Error
                                </h5>
                                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded">
                                  <p className="text-red-300 text-sm font-mono">
                                    {execution.error}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}

                {executions.length === 0 && (
                  <div className="text-center py-8">
                    <PlayIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No executions yet</p>
                    <p className="text-slate-500 text-sm">
                      Select and execute a tool to see results here
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolExecution;
