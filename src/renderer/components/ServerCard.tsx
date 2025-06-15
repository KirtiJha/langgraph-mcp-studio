import React, { useState } from 'react';
import {
  PlayIcon,
  StopIcon,
  CogIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface ServerCardProps {
  server: {
    id: string;
    name: string;
    connected: boolean;
    type?: string;
    uptime?: number;
    toolCount?: number;
    lastActivity?: Date;
  };
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onConfigure: (id: string) => void;
  isLoading?: boolean;
}

const ServerCard: React.FC<ServerCardProps> = ({
  server,
  onConnect,
  onDisconnect,
  onConfigure,
  isLoading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatUptime = (seconds: number = 0) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatLastActivity = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden hover:border-slate-600/50 transition-all duration-300 group">
      {/* Main Card Content */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Status Indicator */}
            <div className="relative">
              {server.connected ? (
                <CheckCircleIcon className="w-6 h-6 text-emerald-400" />
              ) : (
                <ExclamationTriangleIcon className="w-6 h-6 text-amber-400" />
              )}
              {server.connected && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
              )}
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">
                {server.name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  server.connected 
                    ? 'bg-emerald-500/20 text-emerald-300' 
                    : 'bg-slate-600/50 text-slate-400'
                }`}>
                  {server.connected ? 'Connected' : 'Disconnected'}
                </span>
                {server.type && (
                  <span className="text-slate-500">• {server.type}</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onConfigure(server.id)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all duration-200"
              title="Configure server"
            >
              <CogIcon className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all duration-200"
              title="Show details"
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-5 h-5" />
              ) : (
                <ChevronRightIcon className="w-5 h-5" />
              )}
            </button>

            {server.connected ? (
              <button
                onClick={() => onDisconnect(server.id)}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-all duration-200 disabled:opacity-50"
              >
                <StopIcon className="w-4 h-4" />
                Disconnect
              </button>
            ) : (
              <button
                onClick={() => onConnect(server.id)}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/30 transition-all duration-200 disabled:opacity-50"
              >
                <PlayIcon className="w-4 h-4" />
                Connect
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        {server.connected && (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 bg-slate-700/30 rounded-lg">
              <div className="text-indigo-400 font-semibold">{server.toolCount || 0}</div>
              <div className="text-slate-400">Tools</div>
            </div>
            <div className="text-center p-3 bg-slate-700/30 rounded-lg">
              <div className="text-emerald-400 font-semibold">{formatUptime(server.uptime)}</div>
              <div className="text-slate-400">Uptime</div>
            </div>
            <div className="text-center p-3 bg-slate-700/30 rounded-lg">
              <div className="text-purple-400 font-semibold">{formatLastActivity(server.lastActivity)}</div>
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
              <span className="text-slate-300 font-mono text-xs">{server.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Connection Type:</span>
              <span className="text-slate-300">{server.type || 'stdio'}</span>
            </div>
            {server.connected && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400">Available Tools:</span>
                  <span className="text-indigo-300">{server.toolCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Activity:</span>
                  <span className="text-slate-300">{formatLastActivity(server.lastActivity)}</span>
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
