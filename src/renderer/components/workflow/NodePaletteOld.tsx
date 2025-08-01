import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ServerIcon,
  WrenchScrewdriverIcon,
  ArrowPathIcon,
  PlayIcon,
  StopIcon,
  Squares2X2Icon,
  FunnelIcon,
  CodeBracketIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SparklesIcon,
  LinkIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface NodePaletteProps {
  servers: Array<{
    id: string;
    name: string;
    connected: boolean;
    tools: any[];
  }>;
  onAddNode: (
    nodeType: string,
    position: { x: number; y: number },
    initialData?: Record<string, any>
  ) => void;
  reactFlowInstance: any;
}

interface NodeTypeDefinition {
  type: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  category: "basic" | "control" | "data" | "advanced" | "servers";
  tags?: string[];
}

const nodeTypes: NodeTypeDefinition[] = [
  {
    type: "start",
    label: "Start",
    description: "Workflow entry point",
    icon: PlayIcon,
    color: "text-emerald-400",
    category: "basic",
    tags: ["entry", "begin"],
  },
  {
    type: "end",
    label: "End",
    description: "Workflow exit point",
    icon: StopIcon,
    color: "text-red-400",
    category: "basic",
    tags: ["exit", "finish"],
  },
  {
    type: "server",
    label: "MCP Server",
    description: "Execute server with all tools",
    icon: ServerIcon,
    color: "text-indigo-400",
    category: "servers",
    tags: ["mcp", "execution"],
  },
  {
    type: "tool",
    label: "Tool",
    description: "Execute specific tool",
    icon: WrenchScrewdriverIcon,
    color: "text-purple-400",
    category: "servers",
    tags: ["specific", "function"],
  },
  {
    type: "conditional",
    label: "Conditional",
    description: "Decision branching based on conditions",
    icon: ArrowPathIcon,
    color: "text-amber-400",
    category: "control",
    tags: ["branch", "decision", "if"],
  },
  {
    type: "loop",
    label: "Loop",
    description: "Iteration and repetition control",
    icon: ClockIcon,
    color: "text-orange-400",
    category: "control",
    tags: ["iterate", "repeat", "for", "while"],
  },
  {
    type: "parallel",
    label: "Parallel",
    description: "Execute multiple branches concurrently",
    icon: Squares2X2Icon,
    color: "text-cyan-400",
    category: "advanced",
    tags: ["concurrent", "async", "multi"],
  },
  {
    type: "aggregator",
    label: "Aggregator",
    description: "Combine and merge multiple inputs",
    icon: FunnelIcon,
    color: "text-teal-400",
    category: "data",
    tags: ["combine", "merge", "collect"],
  },
  {
    type: "transform",
    label: "Transform",
    description: "Data transformation and processing",
    icon: CodeBracketIcon,
    color: "text-pink-400",
    category: "data",
    tags: ["modify", "process", "convert"],
  },
];

const categories = [
  { id: "basic", label: "Basic", color: "text-blue-400", icon: PlayIcon },
  { id: "control", label: "Control Flow", color: "text-amber-400", icon: ArrowPathIcon },
  { id: "data", label: "Data", color: "text-purple-400", icon: CodeBracketIcon },
  { id: "servers", label: "Servers & Tools", color: "text-indigo-400", icon: ServerIcon },
  { id: "advanced", label: "Advanced", color: "text-cyan-400", icon: SparklesIcon },
];

const NodePalette: React.FC<NodePaletteProps> = ({
  servers,
  onAddNode,
  reactFlowInstance,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("basic");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());
  const [showServerTools, setShowServerTools] = useState(true);

  // Enhanced filtering with tag support
  const filteredNodeTypes = useMemo(() => {
    return nodeTypes.filter((nodeType) => {
      const matchesCategory =
        selectedCategory === "all" || nodeType.category === selectedCategory;
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        nodeType.label.toLowerCase().includes(searchLower) ||
        nodeType.description.toLowerCase().includes(searchLower) ||
        (nodeType.tags && nodeType.tags.some(tag => tag.includes(searchLower)));
      
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchTerm]);

  // Group tools by category for better organization
  const serversByCategory = useMemo(() => {
    const categories: Record<string, any[]> = {};
    servers.forEach(server => {
      server.tools?.forEach(tool => {
        const category = tool.category || tool.type || 'General';
        if (!categories[category]) categories[category] = [];
        categories[category].push({ ...tool, serverId: server.id, serverName: server.name });
      });
    });
    return categories;
  }, [servers]);

  const handleNodeDragStart = (event: React.DragEvent, nodeType: string, initialData?: any) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.setData("application/json", JSON.stringify(initialData || {}));
    event.dataTransfer.effectAllowed = "move";
  };

  const handleAddNode = (nodeType: string, initialData?: any) => {
    const position = {
      x: Math.random() * 400 + 200,
      y: Math.random() * 300 + 100,
    };
    onAddNode(nodeType, position, initialData);
  };

  const toggleServerExpanded = (serverId: string) => {
    const newExpanded = new Set(expandedServers);
    if (newExpanded.has(serverId)) {
      newExpanded.delete(serverId);
    } else {
      newExpanded.add(serverId);
    }
    setExpandedServers(newExpanded);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/50 border-r border-slate-800">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-800">
        <h3 className="text-lg font-semibold text-slate-200 mb-3 flex items-center space-x-2">
          <Squares2X2Icon className="w-5 h-5" />
          <span>Node Palette</span>
        </h3>

        {/* Search */}
        <div className="relative mb-3">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search nodes and tools..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center space-x-1 ${
              selectedCategory === "all"
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                : "bg-slate-800 text-slate-400 hover:text-slate-300 hover:bg-slate-700"
            }`}
          >
            <span>All</span>
          </button>
          {categories.map((category) => {
            const Icon = category.icon;
            const nodeCount = filteredNodeTypes.filter(n => n.category === category.id).length;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center space-x-1 ${
                  selectedCategory === category.id
                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                    : "bg-slate-800 text-slate-400 hover:text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{category.label}</span>
                {nodeCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-slate-600 rounded text-xs">
                    {nodeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Standard Node Types */}
        {filteredNodeTypes.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center space-x-2">
              <CodeBracketIcon className="w-4 h-4" />
              <span>Node Types</span>
            </h4>
            <div className="space-y-2">
              {filteredNodeTypes.map((nodeType) => {
                const Icon = nodeType.icon;
                return (
                  <motion.div
                    key={nodeType.type}
                    className="group p-3 bg-slate-800/30 border border-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-800/60 hover:border-slate-600 transition-all duration-200"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    draggable
                    onDragStart={(e) => handleNodeDragStart(e as any, nodeType.type)}
                    onClick={() => handleAddNode(nodeType.type)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Icon className={`w-5 h-5 ${nodeType.color} transition-transform group-hover:scale-110`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-slate-200 truncate">
                          {nodeType.label}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {nodeType.description}
                        </p>
                        {nodeType.tags && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {nodeType.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="text-xs px-1.5 py-0.5 bg-slate-700/50 text-slate-400 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Server Quick Add Section */}
        {servers.length > 0 && (selectedCategory === "all" || selectedCategory === "servers") && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-slate-300 flex items-center space-x-2">
                <ServerIcon className="w-4 h-4" />
                <span>Connected Servers</span>
                <span className="text-xs px-2 py-1 bg-slate-700 rounded">
                  {servers.length}
                </span>
              </h4>
              <button
                onClick={() => setShowServerTools(!showServerTools)}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center space-x-1"
              >
                {showServerTools ? (
                  <ChevronDownIcon className="w-3 h-3" />
                ) : (
                  <ChevronRightIcon className="w-3 h-3" />
                )}
                <span>Tools</span>
              </button>
            </div>
            
            <div className="space-y-2">
              {servers.map((server) => (
                <div key={server.id} className="border border-slate-700/30 rounded-lg overflow-hidden">
                  {/* Server Header */}
                  <motion.div
                    className="p-3 bg-slate-800/30 cursor-pointer hover:bg-slate-800/50 transition-all duration-200"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      const position = {
                        x: Math.random() * 400 + 200,
                        y: Math.random() * 300 + 100,
                      };
                      onAddNode("server", position, {
                        serverId: server.id,
                        serverName: server.name,
                        selectedTools: server.tools?.map((t: any) => t.name) || [],
                      });
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <ServerIcon className="w-4 h-4 text-indigo-400" />
                        <div
                          className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                            server.connected ? "bg-emerald-400" : "bg-red-400"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-200 truncate">
                          {server.name}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center space-x-2">
                          <span>{server.tools?.length || 0} tools</span>
                          <span className={`w-2 h-2 rounded-full ${server.connected ? "bg-emerald-400" : "bg-red-400"}`} />
                          <span>{server.connected ? "Connected" : "Disconnected"}</span>
                        </div>
                      </div>
                      {server.tools?.length > 0 && showServerTools && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleServerExpanded(server.id);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          {expandedServers.has(server.id) ? (
                            <ChevronDownIcon className="w-4 h-4" />
                          ) : (
                            <ChevronRightIcon className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>

                  {/* Server Tools */}
                  <AnimatePresence>
                    {showServerTools && expandedServers.has(server.id) && server.tools?.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-700/50 bg-slate-900/30"
                      >
                        <div className="p-3 space-y-1 max-h-48 overflow-y-auto">
                          {server.tools.slice(0, 10).map((tool: any) => (
                            <motion.div
                              key={tool.name}
                              className="group p-2 bg-slate-800/20 hover:bg-slate-800/40 rounded cursor-pointer transition-all duration-150"
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              draggable
                              onDragStart={(e) => 
                                handleNodeDragStart(e as any, "tool", {
                                  serverId: server.id,
                                  serverName: server.name,
                                  toolName: tool.name,
                                  parameters: tool.parameters || {},
                                })
                              }
                              onClick={() => 
                                handleAddNode("tool", {
                                  serverId: server.id,
                                  serverName: server.name,
                                  toolName: tool.name,
                                  parameters: tool.parameters || {},
                                })
                              }
                            >
                              <div className="flex items-center space-x-2">
                                <WrenchScrewdriverIcon className="w-3 h-3 text-purple-400 group-hover:text-purple-300" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium text-slate-300 truncate">
                                    {tool.name}
                                  </div>
                                  {tool.description && (
                                    <div className="text-xs text-slate-500 truncate">
                                      {tool.description}
                                    </div>
                                  )}
                                </div>
                                <LinkIcon className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </motion.div>
                          ))}
                          {server.tools.length > 10 && (
                            <div className="text-xs text-slate-400 text-center py-1">
                              +{server.tools.length - 10} more tools...
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="p-3 bg-slate-800/20 border border-slate-700/30 rounded-lg">
          <h4 className="text-xs font-medium text-slate-300 mb-2 flex items-center space-x-1">
            <SparklesIcon className="w-3 h-3" />
            <span>Quick Tips</span>
          </h4>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• Click to add node at random position</li>
            <li>• Drag to position precisely on canvas</li>
            <li>• Use handles to connect nodes</li>
            <li>• Click node to configure in property panel</li>
            <li>• Expand servers to access individual tools</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {filteredNodeTypes.map((nodeType) => {
            const Icon = nodeType.icon;
            return (
              <motion.div
                key={nodeType.type}
                className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-800 hover:border-slate-600 transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                draggable
                onDragStart={(e) =>
                  handleNodeDragStart(e as any, nodeType.type)
                }
                onClick={() => handleAddNode(nodeType.type)}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-6 h-6 ${nodeType.color}`} />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-slate-200">
                      {nodeType.label}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {nodeType.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Server Quick Add Section */}
        {servers.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-slate-300 mb-3">
              Quick Add Servers
            </h4>
            <div className="space-y-2">
              {servers.slice(0, 5).map((server) => (
                <motion.div
                  key={server.id}
                  className="p-2 bg-slate-800/30 border border-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-all duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const position = {
                      x: Math.random() * 400 + 200,
                      y: Math.random() * 300 + 100,
                    };
                    onAddNode("server", position, {
                        serverId: server.id,
                        serverName: server.name,
                        selectedTools: server.tools?.map((t: any) => t.name) || [],
                      });
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <ServerIcon className="w-4 h-4 text-indigo-400" />
                      <div
                        className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                          server.connected ? "bg-emerald-400" : "bg-red-400"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-200 truncate">
                        {server.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {server.tools?.length || 0} tools
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg">
          <h4 className="text-xs font-medium text-slate-300 mb-2">
            How to use:
          </h4>
          <ul className="text-xs text-slate-400 space-y-1">
        {/* Instructions */}
        <div className="p-3 bg-slate-800/20 border border-slate-700/30 rounded-lg">
          <h4 className="text-xs font-medium text-slate-300 mb-2 flex items-center space-x-1">
            <SparklesIcon className="w-3 h-3" />
            <span>Quick Tips</span>
          </h4>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• Click to add node at random position</li>
            <li>• Drag to position precisely on canvas</li>
            <li>• Use handles to connect nodes</li>
            <li>• Click node to configure in property panel</li>
            <li>• Expand servers to access individual tools</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NodePalette;
