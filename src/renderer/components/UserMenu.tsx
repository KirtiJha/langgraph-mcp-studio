import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  CogIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";
import { AuthUser } from "../../shared/types";

interface UserMenuProps {
  user?: AuthUser;
  onLogout: () => void;
  onSettings: () => void;
  onSignIn?: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({
  user,
  onLogout,
  onSettings,
  onSignIn,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // If no user, show sign in button
  if (!user) {
    return (
      <motion.button
        onClick={onSignIn}
        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-200 font-medium"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <KeyIcon className="w-4 h-4" />
        <span className="hidden sm:block">Sign In</span>
      </motion.button>
    );
  }

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800/50 transition-colors duration-200"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full flex items-center justify-center overflow-hidden">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <UserIcon className="w-4 h-4 text-white" />
          )}
        </div>
        <span className="text-sm font-medium text-slate-300 hidden sm:block max-w-32 truncate">
          {user.name}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-48 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-3 border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full flex items-center justify-center overflow-hidden">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">
                      {user.name}
                    </div>
                    <div className="text-xs text-slate-400">{user.email}</div>
                  </div>
                </div>
              </div>

              <div className="p-1">
                <motion.button
                  onClick={() => {
                    onSettings();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors duration-200"
                  whileHover={{ x: 2 }}
                >
                  <CogIcon className="w-4 h-4" />
                  Settings
                </motion.button>

                <motion.button
                  onClick={() => {
                    onLogout();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors duration-200"
                  whileHover={{ x: 2 }}
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  Sign Out
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserMenu;
