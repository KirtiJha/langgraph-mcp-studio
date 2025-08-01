import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

const LoopNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as any;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`relative bg-slate-900 border-2 rounded-xl p-4 min-w-[160px] shadow-lg ${
        selected
          ? "border-orange-500/50 bg-orange-500/10"
          : "border-slate-700/50 bg-slate-800/50"
      }`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-slate-600 border-2 border-slate-400"
      />

      <div className="flex items-center space-x-3 mb-3">
        <ArrowPathIcon className="w-6 h-6 text-orange-400" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-200 truncate">
            {nodeData.label || "Loop"}
          </h3>
          <p className="text-xs text-slate-400 truncate">Iteration control</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs">
          <div className="text-slate-400 mb-1">Max Iterations:</div>
          <div className="text-slate-300">
            {nodeData.maxIterations || "Unlimited"}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-slate-600 border-2 border-slate-400"
      />

      {selected && (
        <div className="absolute inset-0 border-2 border-orange-400 rounded-xl pointer-events-none animate-pulse" />
      )}
    </motion.div>
  );
};

export default memo(LoopNode);
