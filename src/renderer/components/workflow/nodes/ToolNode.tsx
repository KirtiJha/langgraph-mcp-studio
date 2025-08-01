import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import {
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface ToolNodeData {
  label: string;
  serverId?: string;
  serverName?: string;
  toolName?: string;
  parameters?: Record<string, any>;
  servers?: Array<{
    id: string;
    name: string;
    connected: boolean;
    tools: any[];
  }>;
  isExecuting?: boolean;
  executionStatus?: "pending" | "running" | "completed" | "error" | "skipped";
  executionResult?: any;
  executionError?: string;
  description?: string;
}

const ToolNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as ToolNodeData;
  const server = nodeData.servers?.find((s: any) => s.id === nodeData.serverId);
  const tool = server?.tools?.find((t: any) => t.name === nodeData.toolName);

  const getStatusIcon = () => {
    switch (nodeData.executionStatus) {
      case "running":
        return (
          <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
        );
      case "completed":
        return <CheckCircleIcon className="w-4 h-4 text-emerald-400" />;
      case "error":
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />;
      case "pending":
        return <ClockIcon className="w-4 h-4 text-slate-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (nodeData.executionStatus) {
      case "running":
        return "border-blue-500/50 bg-blue-500/10";
      case "completed":
        return "border-emerald-500/50 bg-emerald-500/10";
      case "error":
        return "border-red-500/50 bg-red-500/10";
      default:
        return selected
          ? "border-purple-500/50 bg-purple-500/10"
          : "border-slate-700/50 bg-slate-800/50";
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`relative bg-slate-900 border-2 rounded-xl p-4 min-w-[180px] shadow-lg ${getStatusColor()}`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-slate-600 border-2 border-slate-400"
      />

      {/* Header */}
      <div className="flex items-center space-x-3 mb-3">
        <WrenchScrewdriverIcon className="w-6 h-6 text-purple-400" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-200 truncate">
            {nodeData.label}
          </h3>
          <p className="text-xs text-slate-400 truncate">
            {nodeData.toolName || "No tool selected"}
          </p>
        </div>
        {getStatusIcon()}
      </div>

      {/* Content */}
      <div className="space-y-2">
        {/* Server Info */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Server:</span>
          <span className="text-slate-300 truncate max-w-[100px]">
            {nodeData.serverName || "None"}
          </span>
        </div>

        {/* Tool Info */}
        {tool && (
          <div className="text-xs">
            <div className="text-slate-400 mb-1">Description:</div>
            <div className="text-slate-300">
              {tool.description || "No description available"}
            </div>
          </div>
        )}

        {/* Parameters Count */}
        {nodeData.parameters && Object.keys(nodeData.parameters).length > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Parameters:</span>
            <span className="text-slate-300">
              {Object.keys(nodeData.parameters).length} configured
            </span>
          </div>
        )}

        {/* Description */}
        {nodeData.description && (
          <div className="text-xs text-slate-400 italic">
            {nodeData.description}
          </div>
        )}

        {/* Execution Result Preview */}
        {nodeData.executionStatus === "completed" &&
          nodeData.executionResult && (
            <div className="text-xs bg-slate-700/30 rounded p-2">
              <div className="text-slate-400 mb-1">Result:</div>
              <div className="text-slate-300 font-mono">
                {typeof nodeData.executionResult === "string"
                  ? nodeData.executionResult.slice(0, 50) +
                    (nodeData.executionResult.length > 50 ? "..." : "")
                  : JSON.stringify(nodeData.executionResult).slice(0, 50) +
                    "..."}
              </div>
            </div>
          )}

        {/* Execution Error */}
        {nodeData.executionStatus === "error" && nodeData.executionError && (
          <div className="text-xs bg-red-500/10 border border-red-500/20 rounded p-2">
            <div className="text-red-400 mb-1">Error:</div>
            <div className="text-red-300 font-mono">
              {nodeData.executionError.slice(0, 50) +
                (nodeData.executionError.length > 50 ? "..." : "")}
            </div>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-slate-600 border-2 border-slate-400"
      />

      {/* Selection Indicator */}
      {selected && (
        <div className="absolute inset-0 border-2 border-purple-400 rounded-xl pointer-events-none animate-pulse" />
      )}
    </motion.div>
  );
};

export default memo(ToolNode);
