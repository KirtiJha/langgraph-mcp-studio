import React, { useState } from "react";
import {
  PlayIcon,
  CodeBracketIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  ServerIcon,
} from "@heroicons/react/24/outline";

interface ToolCardProps {
  tool: {
    name: string;
    description: string;
    serverId: string;
    serverName?: string;
    inputSchema?: any;
    lastUsed?: Date;
    usageCount?: number;
  };
  onExecute: (toolName: string, serverId: string) => void;
  isExecuting?: boolean;
}

const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  onExecute,
  isExecuting = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSchema, setShowSchema] = useState(false);

  const formatLastUsed = (date?: Date) => {
    if (!date) return "Never used";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getRequiredParams = () => {
    if (!tool.inputSchema?.properties) return [];
    const required = tool.inputSchema.required || [];
    return Object.entries(tool.inputSchema.properties)
      .filter(([key]) => required.includes(key))
      .map(([key, schema]: [string, any]) => ({
        name: key,
        type: schema.type || "unknown",
        description: schema.description || "",
      }));
  };

  const getOptionalParams = () => {
    if (!tool.inputSchema?.properties) return [];
    const required = tool.inputSchema.required || [];
    return Object.entries(tool.inputSchema.properties)
      .filter(([key]) => !required.includes(key))
      .map(([key, schema]: [string, any]) => ({
        name: key,
        type: schema.type || "unknown",
        description: schema.description || "",
      }));
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg overflow-hidden hover:border-slate-600/50 transition-all duration-300 group">
      {/* Main Card Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-1.5 bg-indigo-500/20 rounded-md">
                <CodeBracketIcon className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white group-hover:text-indigo-300 transition-colors">
                  {tool.name}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <ServerIcon className="w-3.5 h-3.5" />
                  <span>{tool.serverName || tool.serverId}</span>
                </div>
              </div>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed mb-3">
              {tool.description || "No description available"}
            </p>

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs text-slate-400">
              {tool.usageCount !== undefined && (
                <div className="flex items-center gap-1">
                  <span className="text-indigo-400">{tool.usageCount}</span>
                  <span>uses</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                <span>{formatLastUsed(tool.lastUsed)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 ml-3">
            <button
              onClick={() => setShowSchema(!showSchema)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-all duration-200"
              title="View schema"
            >
              <InformationCircleIcon className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-all duration-200"
              title="Show details"
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={() => onExecute(tool.name, tool.serverId)}
              disabled={isExecuting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md hover:bg-indigo-500/30 transition-all duration-200 disabled:opacity-50 text-sm"
            >
              <PlayIcon className="w-3.5 h-3.5" />
              {isExecuting ? "Running..." : "Execute"}
            </button>
          </div>
        </div>

        {/* Parameter Summary */}
        {tool.inputSchema?.properties && (
          <div className="flex gap-2 text-xs">
            {getRequiredParams().length > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full">
                <span className="text-xs">
                  {getRequiredParams().length} required
                </span>
              </div>
            )}
            {getOptionalParams().length > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-600/50 text-slate-400 rounded-full">
                <span className="text-xs">
                  {getOptionalParams().length} optional
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Schema Details */}
      {showSchema && tool.inputSchema && (
        <div className="border-t border-slate-700/50 p-6 bg-slate-800/30">
          <h4 className="text-sm font-semibold text-white mb-3">
            Input Schema
          </h4>
          <div className="bg-slate-900/50 rounded-lg p-4 overflow-auto">
            <pre className="text-xs text-slate-300 font-mono">
              {JSON.stringify(tool.inputSchema, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Parameter Details */}
      {isExpanded && tool.inputSchema?.properties && (
        <div className="border-t border-slate-700/50 p-6 bg-slate-800/30">
          <h4 className="text-sm font-semibold text-white mb-3">Parameters</h4>

          {getRequiredParams().length > 0 && (
            <div className="mb-4">
              <h5 className="text-xs font-medium text-amber-300 mb-2">
                Required Parameters
              </h5>
              <div className="space-y-2">
                {getRequiredParams().map((param) => (
                  <div
                    key={param.name}
                    className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">
                        {param.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-slate-600 text-slate-300 rounded">
                        {param.type}
                      </span>
                    </div>
                    {param.description && (
                      <p className="text-xs text-slate-400">
                        {param.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {getOptionalParams().length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-slate-400 mb-2">
                Optional Parameters
              </h5>
              <div className="space-y-2">
                {getOptionalParams().map((param) => (
                  <div
                    key={param.name}
                    className="p-3 bg-slate-700/20 border border-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">
                        {param.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-slate-600 text-slate-300 rounded">
                        {param.type}
                      </span>
                    </div>
                    {param.description && (
                      <p className="text-xs text-slate-400">
                        {param.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ToolCard;
