import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CpuChipIcon,
  ClockIcon,
  SignalIcon,
  CommandLineIcon,
  InformationCircleIcon,
  WifiIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface StatusBarProps {
  serverCount: number;
  connectedServers: number;
  toolCount: number;
  lastUpdate?: Date;
  isOnline?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  serverCount,
  connectedServers,
  toolCount,
  lastUpdate,
  isOnline = true,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setUptime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${seconds % 60}s`;
  };

  const getConnectionStatus = () => {
    if (connectedServers === 0)
      return {
        text: "No connections",
        color: "text-red-400",
        icon: ExclamationTriangleIcon,
      };
    if (connectedServers === serverCount)
      return {
        text: "All connected",
        color: "text-emerald-400",
        icon: CheckCircleIcon,
      };
    return {
      text: "Partial connection",
      color: "text-yellow-400",
      icon: ExclamationTriangleIcon,
    };
  };

  const connectionStatus = getConnectionStatus();
  const ConnectionIcon = connectionStatus.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/80 backdrop-blur-xl border-t border-slate-800/50 px-4 py-2 relative"
    >
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-6">
          {/* Connection Status with Tooltip */}
          <div
            className="flex items-center space-x-1.5 cursor-help relative"
            onMouseEnter={() => setShowTooltip("connection")}
            onMouseLeave={() => setShowTooltip(null)}
          >
            <div className="flex items-center space-x-1">
              <WifiIcon
                className={`w-3.5 h-3.5 ${
                  isOnline ? "text-emerald-500" : "text-red-500"
                }`}
              />
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  isOnline ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                }`}
              />
            </div>
            <span
              className={`${isOnline ? "text-emerald-400" : "text-red-400"}`}
            >
              {isOnline ? "Online" : "Offline"}
            </span>

            {showTooltip === "connection" && (
              <div className="absolute bottom-full mb-2 left-0 bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50 border border-slate-700">
                Network connection status
              </div>
            )}
          </div>

          {/* Server Status with Enhanced Info */}
          <div
            className="flex items-center space-x-1.5 cursor-help relative"
            onMouseEnter={() => setShowTooltip("servers")}
            onMouseLeave={() => setShowTooltip(null)}
          >
            <CpuChipIcon className="w-3.5 h-3.5 text-slate-500" />
            <div className="flex items-center space-x-1">
              <ConnectionIcon className={`w-3 h-3 ${connectionStatus.color}`} />
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  connectedServers > 0 ? "bg-emerald-400" : "bg-slate-500"
                }`}
              />
              <span
                className={`${
                  connectedServers > 0 ? "text-emerald-400" : "text-slate-400"
                }`}
              >
                {connectedServers}/{serverCount} servers
              </span>
            </div>

            {showTooltip === "servers" && (
              <div className="absolute bottom-full mb-2 left-0 bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50 border border-slate-700">
                {connectionStatus.text} • Click to manage servers
              </div>
            )}
          </div>

          {/* Tool Count with Enhanced Info */}
          <div
            className="flex items-center space-x-1.5 cursor-help relative"
            onMouseEnter={() => setShowTooltip("tools")}
            onMouseLeave={() => setShowTooltip(null)}
          >
            <CommandLineIcon className="w-3.5 h-3.5 text-slate-500" />
            <div className="flex items-center space-x-1">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  toolCount > 0 ? "bg-blue-400" : "bg-slate-500"
                }`}
              />
              <span
                className={`${
                  toolCount > 0 ? "text-blue-400" : "text-slate-400"
                }`}
              >
                {toolCount} tools
              </span>
            </div>

            {showTooltip === "tools" && (
              <div className="absolute bottom-full mb-2 left-0 bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50 border border-slate-700">
                Available MCP tools • Click to view tools
              </div>
            )}
          </div>

          {/* Enhanced Signal Strength */}
          <div
            className="flex items-center space-x-1.5 cursor-help relative"
            onMouseEnter={() => setShowTooltip("signal")}
            onMouseLeave={() => setShowTooltip(null)}
          >
            <SignalIcon className="w-3.5 h-3.5 text-slate-500" />
            <div className="flex space-x-0.5">
              {[1, 2, 3, 4].map((bar) => {
                const connectionRatio =
                  connectedServers / Math.max(serverCount, 1);
                const isActive = bar <= connectionRatio * 4;
                return (
                  <div
                    key={bar}
                    className={`w-1 rounded-full transition-all duration-300 ${
                      isActive
                        ? connectedServers > 0
                          ? "bg-emerald-400 shadow-sm shadow-emerald-400/50"
                          : "bg-slate-600"
                        : "bg-slate-700"
                    }`}
                    style={{ height: `${bar * 3 + 4}px` }}
                  />
                );
              })}
            </div>

            {showTooltip === "signal" && (
              <div className="absolute bottom-full mb-2 left-0 bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50 border border-slate-700">
                Connection strength:{" "}
                {Math.round(
                  (connectedServers / Math.max(serverCount, 1)) * 100
                )}
                %
              </div>
            )}
          </div>

          {/* System Uptime */}
          <div
            className="flex items-center space-x-1.5 cursor-help relative"
            onMouseEnter={() => setShowTooltip("uptime")}
            onMouseLeave={() => setShowTooltip(null)}
          >
            <div className="w-3.5 h-3.5 flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            </div>
            <span className="text-blue-400">{formatUptime(uptime)}</span>

            {showTooltip === "uptime" && (
              <div className="absolute bottom-full mb-2 left-0 bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50 border border-slate-700">
                Application uptime
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {/* Memory Usage Indicator */}
          <div
            className="flex items-center space-x-1.5 cursor-help relative"
            onMouseEnter={() => setShowTooltip("memory")}
            onMouseLeave={() => setShowTooltip(null)}
          >
            <div className="flex items-center space-x-1">
              <div className="w-3.5 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-1000"
                  style={{
                    width: `${Math.min(
                      connectedServers * 20 + toolCount * 5,
                      100
                    )}%`,
                  }}
                />
              </div>
              <span className="text-slate-400 text-xs">
                {Math.min(connectedServers * 20 + toolCount * 5, 100)}%
              </span>
            </div>

            {showTooltip === "memory" && (
              <div className="absolute bottom-full mb-2 right-0 bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50 border border-slate-700">
                Estimated resource usage
              </div>
            )}
          </div>

          {/* Last Update with Better Formatting */}
          {lastUpdate && (
            <div
              className="flex items-center space-x-1.5 cursor-help relative"
              onMouseEnter={() => setShowTooltip("update")}
              onMouseLeave={() => setShowTooltip(null)}
            >
              <ClockIcon className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-400">{formatTime(lastUpdate)}</span>

              {showTooltip === "update" && (
                <div className="absolute bottom-full mb-2 right-0 bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50 border border-slate-700">
                  Last server update: {lastUpdate.toLocaleDateString()}
                </div>
              )}
            </div>
          )}

          {/* Current Time with Date */}
          <div
            className="flex items-center space-x-1.5 cursor-help relative"
            onMouseEnter={() => setShowTooltip("time")}
            onMouseLeave={() => setShowTooltip(null)}
          >
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-slate-300 font-mono">
                {formatTime(currentTime)}
              </span>
            </div>

            {showTooltip === "time" && (
              <div className="absolute bottom-full mb-2 right-0 bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50 border border-slate-700">
                {currentTime.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            )}
          </div>

          {/* Enhanced Version Info with Environment */}
          <div
            className="flex items-center space-x-1.5 px-2 py-1 bg-slate-800/50 rounded border border-slate-700/50 cursor-help relative hover:bg-slate-700/50 transition-colors duration-200"
            onMouseEnter={() => setShowTooltip("version")}
            onMouseLeave={() => setShowTooltip(null)}
          >
            <InformationCircleIcon className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400 text-xs font-medium">v1.0.0</span>
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                process.env.NODE_ENV === "development"
                  ? "bg-yellow-400"
                  : "bg-emerald-400"
              }`}
            />

            {showTooltip === "version" && (
              <div className="absolute bottom-full mb-2 right-0 bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50 border border-slate-700">
                MCP Studio v1.0.0 •{" "}
                {process.env.NODE_ENV === "development"
                  ? "Development"
                  : "Production"}{" "}
                mode
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StatusBar;
