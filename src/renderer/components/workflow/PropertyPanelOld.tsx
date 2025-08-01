import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  XMarkIcon, 
  ChevronDownIcon,
  PlusIcon,
  TrashIcon,
  CodeBracketIcon,
  WrenchScrewdriverIcon
} from "@heroicons/react/24/outline";

interface PropertyPanelProps {
  selectedNode: any;
  selectedEdge: any;
  servers: Array<{
    id: string;
    name: string;
    connected: boolean;
    tools: any[];
  }>;
  onUpdateNodeData: (nodeId: string, newData: any) => void;
  onClose: () => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  selectedNode,
  selectedEdge,
  servers,
  onUpdateNodeData,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'configuration' | 'advanced'>('general');
  const [showParameterForm, setShowParameterForm] = useState(false);
  const [newParameterKey, setNewParameterKey] = useState('');
  const [newParameterValue, setNewParameterValue] = useState('');

  console.log("PropertyPanel rendered with:", {
    selectedNode,
    selectedEdge,
    serversCount: servers.length,
  });

  if (!selectedNode && !selectedEdge) {
    console.log("PropertyPanel returning null - no selection");
    return null;
  }

  const handleUpdateNode = useCallback((field: string, value: any) => {
    if (selectedNode) {
      onUpdateNodeData(selectedNode.id, { [field]: value });
    }
  }, [selectedNode, onUpdateNodeData]);

  const handleAddParameter = useCallback(() => {
    if (newParameterKey && selectedNode) {
      const currentParams = selectedNode.data.parameters || {};
      const updatedParams = {
        ...currentParams,
        [newParameterKey]: newParameterValue
      };
      handleUpdateNode('parameters', updatedParams);
      setNewParameterKey('');
      setNewParameterValue('');
      setShowParameterForm(false);
    }
  }, [newParameterKey, newParameterValue, selectedNode, handleUpdateNode]);

  const handleRemoveParameter = useCallback((key: string) => {
    if (selectedNode) {
      const currentParams = selectedNode.data.parameters || {};
      const { [key]: removed, ...remainingParams } = currentParams;
      handleUpdateNode('parameters', remainingParams);
    }
  }, [selectedNode, handleUpdateNode]);

  const handleUpdateParameter = useCallback((key: string, value: any) => {
    if (selectedNode) {
      const currentParams = selectedNode.data.parameters || {};
      const updatedParams = {
        ...currentParams,
        [key]: value
      };
      handleUpdateNode('parameters', updatedParams);
    }
  }, [selectedNode, handleUpdateNode]);

  const handleToggleSelectedTool = useCallback((toolName: string) => {
    if (selectedNode) {
      const currentTools = selectedNode.data.selectedTools || [];
      const isSelected = currentTools.includes(toolName);
      
      const updatedTools = isSelected
        ? currentTools.filter((t: string) => t !== toolName)
        : [...currentTools, toolName];
      
      handleUpdateNode('selectedTools', updatedTools);
    }
  }, [selectedNode, handleUpdateNode]);

  const selectedServer = selectedNode?.data?.serverId 
    ? servers.find(s => s.id === selectedNode.data.serverId)
    : null;

  const availableTools = selectedServer?.tools || [];

  const renderTabContent = () => {
    if (!selectedNode) return null;

    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-4">
            {/* Node Label */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Node Label
              </label>
              <input
                type="text"
                value={selectedNode.data.label || ""}
                onChange={(e) => handleUpdateNode('label', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter node label"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description
              </label>
              <textarea
                value={selectedNode.data.description || ""}
                onChange={(e) => handleUpdateNode('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Describe what this node does..."
              />
            </div>

            {/* Node Type Specific Fields */}
            {selectedNode.type === 'server' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Select Server
                  </label>
                  <select
                    value={selectedNode.data.serverId || ""}
                    onChange={(e) => {
                      handleUpdateNode('serverId', e.target.value);
                      const server = servers.find(s => s.id === e.target.value);
                      handleUpdateNode('serverName', server?.name || '');
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    title="Select MCP Server"
                  >
                    <option value="">Select a server...</option>
                    {servers.map((server) => (
                      <option key={server.id} value={server.id}>
                        {server.name} ({server.connected ? 'Connected' : 'Disconnected'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tool Selection for Server Node */}
                {selectedServer && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Select Tools (leave empty to use all)
                    </label>
                    <div className="max-h-40 overflow-y-auto border border-slate-700 rounded-lg p-2 space-y-2">
                      {availableTools.map((tool: any, index: number) => (
                        <label key={index} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(selectedNode.data.selectedTools || []).includes(tool.name)}
                            onChange={() => handleToggleSelectedTool(tool.name)}
                            className="text-indigo-500 focus:ring-indigo-500 border-slate-600 bg-slate-700"
                          />
                          <div className="flex-1">
                            <div className="text-sm text-slate-200">{tool.name}</div>
                            {tool.description && (
                              <div className="text-xs text-slate-400">{tool.description}</div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedNode.type === 'tool' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Select Server
                  </label>
                  <select
                    value={selectedNode.data.serverId || ""}
                    onChange={(e) => {
                      handleUpdateNode('serverId', e.target.value);
                      const server = servers.find(s => s.id === e.target.value);
                      handleUpdateNode('serverName', server?.name || '');
                      handleUpdateNode('toolName', ''); // Reset tool selection
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    title="Select MCP Server"
                  >
                    <option value="">Select a server...</option>
                    {servers.map((server) => (
                      <option key={server.id} value={server.id}>
                        {server.name} ({server.connected ? 'Connected' : 'Disconnected'})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedServer && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Select Tool
                    </label>
                    <select
                      value={selectedNode.data.toolName || ""}
                      onChange={(e) => handleUpdateNode('toolName', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      title="Select Tool"
                    >
                      <option value="">Select a tool...</option>
                      {availableTools.map((tool: any, index: number) => (
                        <option key={index} value={tool.name}>
                          {tool.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {selectedNode.type === 'conditional' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Condition Type
                  </label>
                  <select
                    value={selectedNode.data.conditionType || 'javascript'}
                    onChange={(e) => handleUpdateNode('conditionType', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    title="Select Condition Type"
                  >
                    <option value="javascript">JavaScript Expression</option>
                    <option value="simple">Simple Comparison</option>
                    <option value="jq">JQ Expression</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Condition
                  </label>
                  <textarea
                    value={selectedNode.data.condition || ""}
                    onChange={(e) => handleUpdateNode('condition', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={
                      selectedNode.data.conditionType === 'javascript' 
                        ? 'results.previousNode.status === "success"'
                        : selectedNode.data.conditionType === 'simple'
                        ? 'status equals success'
                        : '.status == "success"'
                    }
                  />
                </div>
              </div>
            )}

            {selectedNode.type === 'loop' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Max Iterations
                  </label>
                  <input
                    type="number"
                    value={selectedNode.data.maxIterations || 10}
                    onChange={(e) => handleUpdateNode('maxIterations', parseInt(e.target.value) || 10)}
                    min="1"
                    max="1000"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Loop Condition (optional)
                  </label>
                  <textarea
                    value={selectedNode.data.loopCondition || ""}
                    onChange={(e) => handleUpdateNode('loopCondition', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="context.iterationCount < 5"
                  />
                </div>
              </div>
            )}

            {selectedNode.type === 'transform' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Transform Script
                </label>
                <textarea
                  value={selectedNode.data.transformScript || ""}
                  onChange={(e) => handleUpdateNode('transformScript', e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="{ ...input, processed: true, timestamp: new Date() }"
                />
              </div>
            )}

            {selectedNode.type === 'aggregator' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Aggregation Type
                  </label>
                  <select
                    value={selectedNode.data.aggregationType || 'merge'}
                    onChange={(e) => handleUpdateNode('aggregationType', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    title="Select Aggregation Type"
                  >
                    <option value="merge">Merge Objects</option>
                    <option value="array">Combine as Array</option>
                    <option value="first">Use First Result</option>
                    <option value="last">Use Last Result</option>
                    <option value="custom">Custom Script</option>
                  </select>
                </div>

                {selectedNode.data.aggregationType === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Aggregation Script
                    </label>
                    <textarea
                      value={selectedNode.data.aggregationScript || ""}
                      onChange={(e) => handleUpdateNode('aggregationScript', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="return results.reduce((acc, curr) => ({ ...acc, ...curr }), {})"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'configuration':
        return (
          <div className="space-y-4">
            {/* Parameters Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-slate-300">
                  Parameters
                </label>
                <button
                  onClick={() => setShowParameterForm(!showParameterForm)}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                >
                  <PlusIcon className="w-3 h-3" />
                  <span>Add</span>
                </button>
              </div>

              {/* Add Parameter Form */}
              {showParameterForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg"
                >
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newParameterKey}
                      onChange={(e) => setNewParameterKey(e.target.value)}
                      placeholder="Parameter name"
                      className="w-full px-2 py-1 text-sm bg-slate-700 border border-slate-600 rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      value={newParameterValue}
                      onChange={(e) => setNewParameterValue(e.target.value)}
                      placeholder="Parameter value"
                      className="w-full px-2 py-1 text-sm bg-slate-700 border border-slate-600 rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={handleAddParameter}
                        className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setShowParameterForm(false)}
                        className="px-2 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Existing Parameters */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {Object.entries(selectedNode.data.parameters || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2 p-2 bg-slate-800/30 border border-slate-700 rounded">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-200">{key}</div>
                      <input
                        type="text"
                        value={String(value)}
                        onChange={(e) => handleUpdateParameter(key, e.target.value)}
                        className="w-full mt-1 px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveParameter(key)}
                      className="p-1 text-red-400 hover:text-red-300 transition-colors"
                      title="Remove parameter"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {Object.keys(selectedNode.data.parameters || {}).length === 0 && (
                  <div className="text-sm text-slate-400 text-center py-4">
                    No parameters configured
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'advanced':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Timeout (seconds)
              </label>
              <input
                type="number"
                value={selectedNode.data.timeout || 30}
                onChange={(e) => handleUpdateNode('timeout', parseInt(e.target.value) || 30)}
                min="1"
                max="3600"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Retry Count
              </label>
              <input
                type="number"
                value={selectedNode.data.retryCount || 0}
                onChange={(e) => handleUpdateNode('retryCount', parseInt(e.target.value) || 0)}
                min="0"
                max="10"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="continueOnError"
                checked={selectedNode.data.continueOnError || false}
                onChange={(e) => handleUpdateNode('continueOnError', e.target.checked)}
                className="text-indigo-500 focus:ring-indigo-500 border-slate-600 bg-slate-700"
              />
              <label htmlFor="continueOnError" className="text-sm text-slate-300">
                Continue workflow on error
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full bg-slate-900/50 border-l border-slate-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-200">
          {selectedNode ? "Node Properties" : "Edge Properties"}
        </h3>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
          title="Close properties panel"
          aria-label="Close properties panel"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedNode && (
          <div className="space-y-4">
            {/* Basic Properties */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Label
              </label>
              <input
                type="text"
                value={selectedNode.data.label || ""}
                onChange={(e) => handleUpdateNode("label", e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter node label"
                aria-label="Node label"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description
              </label>
              <textarea
                value={selectedNode.data.description || ""}
                onChange={(e) =>
                  handleUpdateNode("description", e.target.value)
                }
                rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter node description"
                aria-label="Node description"
              />
            </div>

            {/* Node-specific properties */}
            {(selectedNode.type === "server" ||
              selectedNode.type === "tool") && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Server
                </label>
                <select
                  value={selectedNode.data.serverId?.toString() || ""}
                  onChange={(e) => {
                    const server = servers.find((s) => s.id.toString() === e.target.value);
                    handleUpdateNode("serverId", e.target.value.toString());
                    handleUpdateNode("serverName", server?.name || "");
                  }}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Select server"
                >
                  <option value="">Select server...</option>
                  {servers.map((server) => (
                    <option key={server.id} value={server.id.toString()}>
                      {server.name} (
                      {server.connected ? "Connected" : "Disconnected"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedNode.type === "tool" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tool
                </label>
                <select
                  value={selectedNode.data.toolName || ""}
                  onChange={(e) => handleUpdateNode("toolName", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Select tool"
                >
                  <option value="">{selectedNode.data.serverId ? "Select tool..." : "Select server first"}</option>
                  {servers
                    .find((s) => s.id === selectedNode.data.serverId)
                    ?.tools?.map((tool: any) => (
                      <option key={tool.name} value={tool.name}>
                        {tool.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Tool parameters */}
            {selectedNode.type === "tool" && selectedNode.data.toolName && (
              <div className="space-y-4 mt-4">
                <h4 className="text-sm font-medium text-slate-300">Parameters</h4>
                {(() => {
                  const server = servers.find((s) => s.id === selectedNode.data.serverId);
                  const tool = server?.tools?.find((t: any) => t.name === selectedNode.data.toolName);
                  if (!tool || !tool.inputSchema?.properties) {
                    return (
                      <p className="text-xs text-slate-500">No parameter schema available.</p>
                    );
                  }
                  const properties = tool.inputSchema.properties;
                  const required: string[] = tool.inputSchema.required || [];
                  return Object.keys(properties).map((key) => {
                    const prop: any = properties[key];
                    const value = (selectedNode.data.parameters || {})[key] ?? "";
                    const isRequired = required.includes(key);
                    const onChangeValue = (val: any) => {
                      const newParams = { ...(selectedNode.data.parameters || {}), [key]: val };
                      handleUpdateNode("parameters", newParams);
                    };
                    // choose control based on type/enum
                    if (prop.enum) {
                      return (
                        <div key={key} className="flex flex-col gap-1">
                          <label className="text-xs text-slate-300">
                            {key}{isRequired && <span className="text-red-400">*</span>}
                          </label>
                          <select
                            className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 text-sm"
                            value={value}
                            onChange={(e) => onChangeValue(e.target.value)}
                          >
                            <option value="">Select...</option>
                            {prop.enum.map((opt: any) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          {prop.description && (
                            <p className="text-xs text-slate-500">{prop.description}</p>
                          )}
                        </div>
                      );
                    } else if (prop.type === "object") {
                      return (
                        <div key={key} className="flex flex-col gap-1">
                          <label className="text-xs text-slate-300">
                            {key}{isRequired && <span className="text-red-400">*</span>}
                          </label>
                          <textarea
                            value={JSON.stringify(value, null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value || "{}");
                                onChangeValue(parsed);
                              } catch {
                                // ignore invalid JSON typing
                              }
                            }}
                            rows={6}
                            placeholder='{"query": "hello"}'
                            aria-label="Tool parameters JSON"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          {prop.description && (
                            <p className="text-xs text-slate-500">{prop.description}</p>
                          )}
                        </div>
                      );
                    } else if (prop.type === "array") {
                      return (
                        <div key={key} className="flex flex-col gap-1">
                          <label className="text-xs text-slate-300">
                            {key}{isRequired && <span className="text-red-400">*</span>}
                          </label>
                          <textarea
                            value={JSON.stringify(value, null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value || "[]");
                                onChangeValue(parsed);
                              } catch {
                                // ignore invalid JSON typing
                              }
                            }}
                            rows={6}
                            placeholder='["item1", "item2"]'
                            aria-label="Tool parameters JSON"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          {prop.description && (
                            <p className="text-xs text-slate-500">{prop.description}</p>
                          )}
                        </div>
                      );
                    } else {
                      return (
                        <div key={key} className="flex flex-col gap-1">
                          <label className="text-xs text-slate-300">
                            {key}{isRequired && <span className="text-red-400">*</span>}
                          </label>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => onChangeValue(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder={prop.type === "boolean" ? "true/false" : "Enter value"}
                            aria-label={prop.type === "boolean" ? "Boolean value" : "Text value"}
                          />
                          {prop.description && (
                            <p className="text-xs text-slate-500">{prop.description}</p>
                          )}
                        </div>
                      );
                    }
                  });
                })()}
              </div>
            )}

            {selectedNode.type === "conditional" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Condition
                </label>
                <textarea
                  value={selectedNode.data.condition || ""}
                  onChange={(e) =>
                    handleUpdateNode("condition", e.target.value)
                  }
                  placeholder="Enter JavaScript condition..."
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {selectedNode.type === "loop" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Max Iterations
                </label>
                <input
                  type="number"
                  value={selectedNode.data.maxIterations || ""}
                  onChange={(e) =>
                    handleUpdateNode(
                      "maxIterations",
                      parseInt(e.target.value) || undefined
                    )
                  }
                  min="1"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter max iterations"
                  aria-label="Maximum iterations"
                />
              </div>
            )}

            {selectedNode.type === "transform" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Transform Script
                </label>
                <textarea
                  value={selectedNode.data.transformScript || ""}
                  onChange={(e) =>
                    handleUpdateNode("transformScript", e.target.value)
                  }
                  placeholder="Enter JavaScript transformation..."
                  rows={6}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {selectedNode.type === "aggregator" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Aggregation Type
                </label>
                <select
                  value={selectedNode.data.aggregationType || "merge"}
                  onChange={(e) =>
                    handleUpdateNode("aggregationType", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Select aggregation type"
                >
                  <option value="merge">Merge Objects</option>
                  <option value="array">Combine to Array</option>
                  <option value="first">Take First</option>
                  <option value="last">Take Last</option>
                  <option value="custom">Custom Script</option>
                </select>
              </div>
            )}

            {/* Advanced Settings */}
            <div className="pt-4 border-t border-slate-800">
              <h4 className="text-sm font-medium text-slate-300 mb-3">
                Advanced Settings
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    value={selectedNode.data.timeout || ""}
                    onChange={(e) =>
                      handleUpdateNode(
                        "timeout",
                        parseInt(e.target.value) || undefined
                      )
                    }
                    min="1"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter timeout in seconds"
                    aria-label="Timeout in seconds"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Retry Count
                  </label>
                  <input
                    type="number"
                    value={selectedNode.data.retryCount || 0}
                    onChange={(e) =>
                      handleUpdateNode(
                        "retryCount",
                        parseInt(e.target.value) || 0
                      )
                    }
                    min="0"
                    max="5"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter retry count"
                    aria-label="Number of retries"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="continueOnError"
                    checked={selectedNode.data.continueOnError || false}
                    onChange={(e) =>
                      handleUpdateNode("continueOnError", e.target.checked)
                    }
                    className="w-4 h-4 text-indigo-600 bg-slate-800 border-slate-600 rounded focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="continueOnError"
                    className="text-sm text-slate-300"
                  >
                    Continue on error
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedEdge && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Edge Label
              </label>
              <input
                type="text"
                value={selectedEdge.data?.label || ""}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                readOnly
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyPanel;
