import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCircleIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  CogIcon,
  UserIcon,
  BuildingOfficeIcon,
  KeyIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { AuthUser } from "../../shared/types";

interface UserMenuProps {
  user: AuthUser;
  onSignOut: () => void;
  onSettings?: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onSignOut, onSettings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "google":
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        );
      case "github":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        );
      case "microsoft":
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#F25022" d="M1 1h10v10H1z" />
            <path fill="#00A4EF" d="M13 1h10v10H13z" />
            <path fill="#7FBA00" d="M1 13h10v10H1z" />
            <path fill="#FFB900" d="M13 13h10v10H13z" />
          </svg>
        );
      case "sso":
        return <ShieldCheckIcon className="w-4 h-4" />;
      default:
        return <UserIcon className="w-4 h-4" />;
    }
  };

  const getProviderLabel = (provider: string) => {
    switch (provider) {
      case "google":
        return "Google";
      case "github":
        return "GitHub";
      case "microsoft":
        return "Microsoft";
      case "sso":
        return "Enterprise SSO";
      default:
        return provider;
    }
  };

  const formatTimeRemaining = (expiresAt: number) => {
    const now = Date.now();
    const remaining = expiresAt - now;

    if (remaining <= 0) {
      return "Expired";
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 transition-colors"
      >
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-sm font-medium text-white truncate max-w-32">
            {user.name}
          </p>
          <p className="text-xs text-slate-400 truncate max-w-32">
            {user.email}
          </p>
        </div>
        <ChevronDownIcon
          className={`w-4 h-4 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            {/* User Info Header */}
            <div className="p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserCircleIcon className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-white">{user.name}</h3>
                  <p className="text-sm text-slate-400">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getProviderIcon(user.provider)}
                    <span className="text-xs text-slate-400">
                      {getProviderLabel(user.provider)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* User Details */}
            <div className="p-4 border-b border-slate-700">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300">
                    Session expires in{" "}
                    {user.expiresAt
                      ? formatTimeRemaining(user.expiresAt)
                      : "Unknown"}
                  </span>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              {onSettings && (
                <button
                  onClick={() => {
                    onSettings();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <CogIcon className="w-4 h-4" />
                  <span>Settings</span>
                </button>
              )}

              <button
                onClick={() => {
                  onSignOut();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserMenu;
