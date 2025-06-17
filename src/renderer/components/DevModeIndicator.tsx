import React from "react";
import { motion } from "framer-motion";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface DevModeIndicatorProps {
  message?: string;
  position?: "top" | "bottom" | "inline";
  className?: string;
}

const DevModeIndicator: React.FC<DevModeIndicatorProps> = ({
  message = "Development Mode",
  position = "inline",
  className = "",
}) => {
  // Check if we're in development mode - use multiple fallbacks
  let isDev = false;
  try {
    // Manual override for testing (remove this in production)
    const forceDevMode = localStorage.getItem('FORCE_DEV_MODE') === 'true';
    if (forceDevMode) {
      isDev = true;
    } else {
      isDev = process.env.NODE_ENV === "development" || 
             (typeof __DEV__ !== 'undefined' && __DEV__) ||
             window.location.hostname === 'localhost';
    }
  } catch (error) {
    // Fallback for any errors
    isDev = window.location.hostname === 'localhost';
  }
  
  if (!isDev) return null;

  const positionClasses = {
    top: "fixed top-4 left-1/2 transform -translate-x-1/2 z-50",
    bottom: "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50",
    inline: "",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: position === "top" ? -20 : position === "bottom" ? 20 : 0 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        flex items-center gap-2 px-3 py-2 
        bg-amber-500/10 border border-amber-500/20 rounded-lg
        text-amber-400 text-xs font-medium
        ${positionClasses[position]}
        ${className}
      `}
    >
      <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
      <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse ml-1"></div>
    </motion.div>
  );
};

export default DevModeIndicator;
