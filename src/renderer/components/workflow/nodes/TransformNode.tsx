import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import { CodeBracketIcon } from "@heroicons/react/24/outline";

const TransformNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as any;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`relative bg-slate-900 border-2 rounded-xl p-4 min-w-[160px] shadow-lg ${
        selected
          ? "border-pink-500/50 bg-pink-500/10"
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
        <CodeBracketIcon className="w-6 h-6 text-pink-400" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-200 truncate">
            {nodeData.label || "Transform"}
          </h3>
          <p className="text-xs text-slate-400 truncate">Data transformation</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs">
          <div className="text-slate-400 mb-1">Script:</div>
          <div className="text-slate-300 font-mono bg-slate-800/50 rounded p-1">
            {nodeData.transformScript || "No script defined"}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-slate-600 border-2 border-slate-400"
      />

      {selected && (
        <div className="absolute inset-0 border-2 border-pink-400 rounded-xl pointer-events-none animate-pulse" />
      )}
    </motion.div>
  );
};

export default memo(TransformNode);
