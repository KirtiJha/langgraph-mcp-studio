import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  CodeBracketIcon,
  ServerIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  LightBulbIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";
import { MCPServerConfig } from "../../shared/types";

interface MCPServerGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (config: MCPServerConfig) => Promise<void>;
}

interface ToolConfig {
  name: string;
  description: string;
}

interface ResourceConfig {
  name: string;
  description: string;
}

interface PromptConfig {
  name: string;
  description: string;
}

export default function MCPServerGeneratorDialog({
  open,
  onOpenChange,
  onGenerate,
}: MCPServerGeneratorDialogProps) {
  const [config, setConfig] = useState<MCPServerConfig>({
    name: "",
    description: "",
    version: "1.0.0",
    language: "typescript",
    transport: "stdio",
    authentication: "none",
    includeTools: true,
    includeResources: false,
    includePrompts: false,
  });

  const [tools, setTools] = useState<ToolConfig[]>([
    {
      name: "example_tool",
      description: "An example tool that demonstrates MCP functionality",
    },
  ]);

  const [resources, setResources] = useState<ResourceConfig[]>([]);
  const [prompts, setPrompts] = useState<PromptConfig[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = async () => {
    if (!config.name.trim()) return;

    setIsGenerating(true);
    try {
      const finalConfig = {
        ...config,
        toolNames: config.includeTools ? tools.map((t) => t.name) : undefined,
        resourceNames: config.includeResources
          ? resources.map((r) => r.name)
          : undefined,
        promptNames: config.includePrompts
          ? prompts.map((p) => p.name)
          : undefined,
      };

      await onGenerate(finalConfig);
      onOpenChange(false);

      // Reset form
      setConfig({
        name: "",
        description: "",
        version: "1.0.0",
        language: "typescript",
        transport: "stdio",
        authentication: "none",
        includeTools: true,
        includeResources: false,
        includePrompts: false,
      });
      setTools([
        {
          name: "example_tool",
          description: "An example tool that demonstrates MCP functionality",
        },
      ]);
      setResources([]);
      setPrompts([]);
    } catch (error) {
      console.error("Failed to generate MCP server:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const addTool = () => {
    setTools([...tools, { name: "", description: "" }]);
  };

  const removeTool = (index: number) => {
    setTools(tools.filter((_, i) => i !== index));
  };

  const updateTool = (
    index: number,
    field: keyof ToolConfig,
    value: string
  ) => {
    const newTools = [...tools];
    newTools[index] = { ...newTools[index], [field]: value };
    setTools(newTools);
  };

  const addResource = () => {
    setResources([...resources, { name: "", description: "" }]);
  };

  const removeResource = (index: number) => {
    setResources(resources.filter((_, i) => i !== index));
  };

  const updateResource = (
    index: number,
    field: keyof ResourceConfig,
    value: string
  ) => {
    const newResources = [...resources];
    newResources[index] = { ...newResources[index], [field]: value };
    setResources(newResources);
  };

  const addPrompt = () => {
    setPrompts([...prompts, { name: "", description: "" }]);
  };

  const removePrompt = (index: number) => {
    setPrompts(prompts.filter((_, i) => i !== index));
  };

  const updatePrompt = (
    index: number,
    field: keyof PromptConfig,
    value: string
  ) => {
    const newPrompts = [...prompts];
    newPrompts[index] = { ...newPrompts[index], [field]: value };
    setPrompts(newPrompts);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        />

        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-slate-900/50 to-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                  <CodeBracketIcon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                    Generate MCP Server
                  </h2>
                  <p className="text-sm text-slate-400">
                    Create a new Model Context Protocol server with boilerplate
                    code
                  </p>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-2 hover:bg-slate-800/50 rounded-lg"
                aria-label="Close dialog"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto space-y-6">
            {/* Basic Configuration */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <ServerIcon className="w-5 h-5 text-slate-400" />
                <h3 className="text-lg font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                  Basic Information
                </h3>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Configure the basic properties of your MCP server
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    placeholder="my-mcp-server"
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-slate-100 placeholder-slate-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Version
                  </label>
                  <input
                    type="text"
                    value={config.version}
                    onChange={(e) =>
                      setConfig({ ...config, version: e.target.value })
                    }
                    placeholder="1.0.0"
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-slate-100 placeholder-slate-400"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={config.description}
                    onChange={(e) =>
                      setConfig({ ...config, description: e.target.value })
                    }
                    placeholder="A description of what your MCP server does"
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-slate-100 placeholder-slate-400 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Language
                  </label>
                  <select
                    value={config.language}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        language: e.target.value as "typescript" | "python",
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-slate-100"
                    aria-label="Programming Language"
                  >
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Transport
                  </label>
                  <select
                    value={config.transport}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        transport: e.target.value as
                          | "stdio"
                          | "sse"
                          | "streamable-http",
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-slate-100"
                    aria-label="Transport Protocol"
                  >
                    <option value="stdio">Standard I/O</option>
                    <option value="sse">Server-Sent Events</option>
                    <option value="streamable-http">HTTP</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Authentication
                  </label>
                  <select
                    value={config.authentication}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        authentication: e.target.value as
                          | "none"
                          | "oauth"
                          | "bearer"
                          | "apikey",
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-slate-100"
                    aria-label="Authentication Method"
                  >
                    <option value="none">None</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="apikey">API Key</option>
                    <option value="oauth">OAuth 2.0</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
              <h3 className="text-lg font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent mb-2">
                Server Features
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Choose what capabilities to include in your MCP server
              </p>

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config.includeTools}
                    onChange={(e) =>
                      setConfig({ ...config, includeTools: e.target.checked })
                    }
                    className="rounded border-slate-600/50 text-blue-500 focus:ring-blue-500/50 bg-slate-800/50"
                  />
                  <div className="flex items-center gap-2">
                    <WrenchScrewdriverIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-300">
                      Tools
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config.includeResources}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        includeResources: e.target.checked,
                      })
                    }
                    className="rounded border-slate-600/50 text-blue-500 focus:ring-blue-500/50 bg-slate-800/50"
                  />
                  <div className="flex items-center gap-2">
                    <DocumentTextIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-300">
                      Resources
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config.includePrompts}
                    onChange={(e) =>
                      setConfig({ ...config, includePrompts: e.target.checked })
                    }
                    className="rounded border-slate-600/50 text-blue-500 focus:ring-blue-500/50 bg-slate-800/50"
                  />
                  <div className="flex items-center gap-2">
                    <LightBulbIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-300">
                      Prompts
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Tools Configuration */}
            {config.includeTools && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <WrenchScrewdriverIcon className="w-5 h-5 text-slate-400" />
                    <h3 className="text-lg font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                      Tools
                    </h3>
                  </div>
                  <button
                    onClick={addTool}
                    className="px-3 py-1.5 text-sm bg-blue-600/80 hover:bg-blue-600 text-white rounded-md transition-colors duration-200 border border-blue-500/50"
                  >
                    <PlusIcon className="w-4 h-4 inline mr-1" />
                    Add Tool
                  </button>
                </div>
                <p className="text-sm text-slate-400 mb-4">
                  Define the tools your MCP server will provide
                </p>

                <div className="space-y-3">
                  {tools.map((tool, index) => (
                    <div
                      key={index}
                      className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Tool Name
                          </label>
                          <input
                            type="text"
                            value={tool.name}
                            onChange={(e) =>
                              updateTool(index, "name", e.target.value)
                            }
                            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-slate-100 placeholder-slate-400"
                            placeholder="Tool name"
                          />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                              Tool Description
                            </label>
                            <input
                              type="text"
                              value={tool.description}
                              onChange={(e) =>
                                updateTool(index, "description", e.target.value)
                              }
                              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-slate-100 placeholder-slate-400"
                              placeholder="Tool description"
                            />
                          </div>
                          {tools.length > 1 && (
                            <button
                              onClick={() => removeTool(index)}
                              className="mt-6 p-2 text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                              aria-label="Remove tool"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resources Configuration */}
            {config.includeResources && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-slate-400" />
                    <h3 className="text-lg font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                      Resources
                    </h3>
                  </div>
                  <button
                    onClick={addResource}
                    className="px-3 py-1.5 text-sm bg-blue-600/80 hover:bg-blue-600 text-white rounded-md transition-colors duration-200 border border-blue-500/50"
                  >
                    <PlusIcon className="w-4 h-4 inline mr-1" />
                    Add Resource
                  </button>
                </div>
                <p className="text-sm text-slate-400 mb-4">
                  Define the resources your MCP server will expose
                </p>

                {resources.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      No resources configured. Click "Add Resource" to get
                      started.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {resources.map((resource, index) => (
                      <div
                        key={index}
                        className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                              Resource Name
                            </label>
                            <input
                              type="text"
                              value={resource.name}
                              onChange={(e) =>
                                updateResource(index, "name", e.target.value)
                              }
                              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-slate-100 placeholder-slate-400"
                              placeholder="Resource name"
                            />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-slate-400 mb-1">
                                Resource Description
                              </label>
                              <input
                                type="text"
                                value={resource.description}
                                onChange={(e) =>
                                  updateResource(
                                    index,
                                    "description",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-slate-100 placeholder-slate-400"
                                placeholder="Resource description"
                              />
                            </div>
                            <button
                              onClick={() => removeResource(index)}
                              className="mt-6 p-2 text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                              aria-label="Remove resource"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Prompts Configuration */}
            {config.includePrompts && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <LightBulbIcon className="w-5 h-5 text-slate-400" />
                    <h3 className="text-lg font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                      Prompts
                    </h3>
                  </div>
                  <button
                    onClick={addPrompt}
                    className="px-3 py-1.5 text-sm bg-blue-600/80 hover:bg-blue-600 text-white rounded-md transition-colors duration-200 border border-blue-500/50"
                  >
                    <PlusIcon className="w-4 h-4 inline mr-1" />
                    Add Prompt
                  </button>
                </div>
                <p className="text-sm text-slate-400 mb-4">
                  Define the prompts your MCP server will provide
                </p>

                {prompts.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <LightBulbIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      No prompts configured. Click "Add Prompt" to get started.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {prompts.map((prompt, index) => (
                      <div
                        key={index}
                        className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                              Prompt Name
                            </label>
                            <input
                              type="text"
                              value={prompt.name}
                              onChange={(e) =>
                                updatePrompt(index, "name", e.target.value)
                              }
                              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-slate-100 placeholder-slate-400"
                              placeholder="Prompt name"
                            />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-slate-400 mb-1">
                                Prompt Description
                              </label>
                              <input
                                type="text"
                                value={prompt.description}
                                onChange={(e) =>
                                  updatePrompt(
                                    index,
                                    "description",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-slate-100 placeholder-slate-400"
                                placeholder="Prompt description"
                              />
                            </div>
                            <button
                              onClick={() => removePrompt(index)}
                              className="mt-6 p-2 text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                              aria-label="Remove prompt"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Documentation Links */}
          <div className="bg-slate-800/30 backdrop-blur-sm border-t border-slate-700/50 p-6">
            <div className="flex items-center gap-2 mb-4">
              <DocumentTextIcon className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                Helpful Resources
              </h3>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Learn more about building MCP servers and using the SDKs
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <a
                href="https://modelcontextprotocol.io/quickstart/server"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-slate-600/50 rounded-lg transition-all duration-200 group"
              >
                <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30 group-hover:bg-blue-500/30 transition-colors">
                  <WrenchScrewdriverIcon className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                    Build MCP Server
                  </h4>
                  <p className="text-xs text-slate-400">
                    Official quickstart guide
                  </p>
                </div>
                <LinkIcon className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition-colors" />
              </a>

              <a
                href="https://github.com/modelcontextprotocol/typescript-sdk"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-slate-600/50 rounded-lg transition-all duration-200 group"
              >
                <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30 group-hover:bg-indigo-500/30 transition-colors">
                  <CodeBracketIcon className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                    TypeScript SDK
                  </h4>
                  <p className="text-xs text-slate-400">GitHub repository</p>
                </div>
                <LinkIcon className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition-colors" />
              </a>

              <a
                href="https://github.com/modelcontextprotocol/python-sdk"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-slate-600/50 rounded-lg transition-all duration-200 group"
              >
                <div className="p-2 bg-green-500/20 rounded-lg border border-green-500/30 group-hover:bg-green-500/30 transition-colors">
                  <CodeBracketIcon className="w-4 h-4 text-green-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                    Python SDK
                  </h4>
                  <p className="text-xs text-slate-400">GitHub repository</p>
                </div>
                <LinkIcon className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition-colors" />
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-slate-700/50">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-sm font-medium rounded-md text-slate-300 hover:text-slate-100 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!config.name.trim() || isGenerating}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-700 disabled:to-slate-700 text-white text-sm font-medium rounded-md transition-all duration-200 disabled:opacity-50 shadow-md hover:shadow-blue-500/25"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4 inline mr-2" />
                  Generate Server
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
