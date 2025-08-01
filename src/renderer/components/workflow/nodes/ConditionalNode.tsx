import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

const ConditionalNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as any;

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
          ? "border-amber-500/50 bg-amber-500/10"
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
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-slate-600 border-2 border-slate-400"
      />

      <div className="flex items-center space-x-3 mb-3">
        <ArrowPathIcon className="w-6 h-6 text-amber-400" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-200 truncate">
            {nodeData.label || "Conditional"}
          </h3>
          <p className="text-xs text-slate-400 truncate">Decision point</p>
        </div>
        {getStatusIcon()}
      </div>

      <div className="space-y-2">
        <div className="text-xs">
          <div className="text-slate-400 mb-1">Condition:</div>
          <div className="text-slate-300 font-mono bg-slate-800/50 rounded p-1">
            {nodeData.condition || "No condition set"}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="w-3 h-3 bg-emerald-500 border-2 border-emerald-400"
        style={{ left: "25%" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="w-3 h-3 bg-red-500 border-2 border-red-400"
        style={{ left: "75%" }}
      />

      {selected && (
        <div className="absolute inset-0 border-2 border-amber-400 rounded-xl pointer-events-none animate-pulse" />
      )}
    </motion.div>
  );
};

export default memo(ConditionalNode);
