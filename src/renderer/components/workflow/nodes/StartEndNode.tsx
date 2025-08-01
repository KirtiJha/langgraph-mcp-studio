import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import { PlayIcon, StopIcon } from "@heroicons/react/24/outline";

const StartEndNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as any;
  const isStart =
    nodeData.type === "start" ||
    nodeData.label?.toLowerCase().includes("start");

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`relative bg-slate-900 border-2 rounded-full p-4 w-24 h-24 shadow-lg flex items-center justify-center ${
        selected
          ? isStart
            ? "border-emerald-500/50 bg-emerald-500/10"
            : "border-red-500/50 bg-red-500/10"
          : "border-slate-700/50 bg-slate-800/50"
      }`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {!isStart && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 bg-slate-600 border-2 border-slate-400"
        />
      )}

      <div className="text-center">
        {isStart ? (
          <PlayIcon className="w-8 h-8 text-emerald-400 mx-auto" />
        ) : (
          <StopIcon className="w-8 h-8 text-red-400 mx-auto" />
        )}
        <div className="text-xs text-slate-300 mt-1 font-medium">
          {isStart ? "Start" : "End"}
        </div>
      </div>

      {isStart && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 bg-slate-600 border-2 border-slate-400"
        />
      )}

      {selected && (
        <div
          className={`absolute inset-0 border-2 rounded-full pointer-events-none animate-pulse ${
            isStart ? "border-emerald-400" : "border-red-400"
          }`}
        />
      )}
    </motion.div>
  );
};

export default memo(StartEndNode);
