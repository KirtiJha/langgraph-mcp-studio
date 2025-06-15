import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CpuChipIcon,
  ClockIcon,
  SignalIcon,
  CommandLineIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/80 backdrop-blur-xl border-t border-slate-800/50 px-6 py-3"
    >
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-6">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <span className="text-slate-400">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Server Status */}
          <div className="flex items-center space-x-2">
            <CpuChipIcon className="w-4 h-4 text-slate-500" />
            <span className="text-slate-400">
              {connectedServers}/{serverCount} servers
            </span>
          </div>

          {/* Tool Count */}
          <div className="flex items-center space-x-2">
            <CommandLineIcon className="w-4 h-4 text-slate-500" />
            <span className="text-slate-400">
              {toolCount} tools
            </span>
          </div>

          {/* Signal Strength */}
          <div className="flex items-center space-x-2">
            <SignalIcon className="w-4 h-4 text-slate-500" />
            <div className="flex space-x-0.5">
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={`w-1 rounded-full transition-colors duration-300 ${
                    bar <= (connectedServers / Math.max(serverCount, 1)) * 4
                      ? 'bg-emerald-400'
                      : 'bg-slate-600'
                  }`}
                  style={{ height: `${bar * 3 + 3}px` }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {/* Last Update */}
          {lastUpdate && (
            <div className="flex items-center space-x-2">
              <ClockIcon className="w-4 h-4 text-slate-500" />
              <span className="text-slate-400">
                Updated {formatTime(lastUpdate)}
              </span>
            </div>
          )}

          {/* Current Time */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">
              {formatTime(currentTime)}
            </span>
          </div>

          {/* Version Info */}
          <div className="flex items-center space-x-2 px-2 py-1 bg-slate-800/50 rounded border border-slate-700/50">
            <InformationCircleIcon className="w-4 h-4 text-slate-500" />
            <span className="text-slate-400 text-xs">
              v1.0.0
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StatusBar;
