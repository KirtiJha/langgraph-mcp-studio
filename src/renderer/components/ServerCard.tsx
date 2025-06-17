import React, { useState } from "react";
import {
  PlayIcon,
  StopIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

interface ServerCardProps {
  server: {
    id: string;
    name: string;
    connected: boolean;
    type?: string;
    uptime?: number;
    lastActivity?: Date;
  };
  toolCount?: number;
  contextParamsCount?: number;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

const ServerCard: React.FC<ServerCardProps> = ({
  server,
  toolCount = 0,
  contextParamsCount = 0,
  onConnect,
  onDisconnect,
  onView,
  onEdit,
  onDelete,
  isLoading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatUptime = (seconds: number = 0) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatLastActivity = (date?: Date) => {
    if (!date) return "Never";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg overflow-hidden hover:border-slate-600/50 transition-all duration-300 group">
      {/* Main Card Content */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {/* Status Indicator */}
            <div className="relative">
              {server.connected ? (
                <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-400" />
              )}
              {server.connected && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              )}
            </div>

            <div>
              <h3 className="text-base font-semibold text-white group-hover:text-indigo-300 transition-colors">
                {server.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    server.connected
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-slate-600/50 text-slate-400"
                  }`}
                >
                  {server.connected ? "Connected" : "Disconnected"}
                </span>
                {server.type && (
                  <span className="text-slate-500">• {server.type}</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            {onView && (
              <button
                onClick={() => onView(server.id)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-all duration-200"
                title="View configuration"
              >
                <EyeIcon className="w-4 h-4" />
              </button>
            )}

            {onEdit && (
              <button
                onClick={() => onEdit(server.id)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-all duration-200"
                title="Edit configuration"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            )}

            {onDelete && (
              <button
                onClick={() => onDelete(server.id)}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all duration-200"
                title="Delete server"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}

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

            {server.connected ? (
              <button
                onClick={() => onDisconnect(server.id)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded-md hover:bg-red-500/30 transition-all duration-200 disabled:opacity-50 text-sm"
              >
                <StopIcon className="w-3.5 h-3.5" />
                Disconnect
              </button>
            ) : (
              <button
                onClick={() => onConnect(server.id)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md hover:bg-indigo-500/30 transition-all duration-200 disabled:opacity-50 text-sm"
              >
                <PlayIcon className="w-3.5 h-3.5" />
                Connect
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        {server.connected && (
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="text-center p-2.5 bg-slate-700/30 rounded-md">
              <div className="text-indigo-400 font-semibold">{toolCount}</div>
              <div className="text-slate-400">Tools</div>
            </div>
            <div className="text-center p-2.5 bg-slate-700/30 rounded-md">
              <div className="text-emerald-400 font-semibold">
                {formatUptime(server.uptime)}
              </div>
              <div className="text-slate-400">Uptime</div>
            </div>
            <div className="text-center p-2.5 bg-slate-700/30 rounded-md">
              <div className="text-purple-400 font-semibold">
                {formatLastActivity(server.lastActivity)}
              </div>
              <div className="text-slate-400">Last Activity</div>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-slate-700/50 p-6 bg-slate-800/30">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Server ID:</span>
              <span className="text-slate-300 font-mono text-xs">
                {server.id}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Connection Type:</span>
              <span className="text-slate-300">{server.type || "stdio"}</span>
            </div>
            {server.connected && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400">Available Tools:</span>
                  <span className="text-indigo-300">{toolCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Context Parameters:</span>
                  <span className="text-emerald-300">
                    {contextParamsCount || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Activity:</span>
                  <span className="text-slate-300">
                    {formatLastActivity(server.lastActivity)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerCard;
