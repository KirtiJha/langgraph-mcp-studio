import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SparklesIcon,
  ServerIcon,
  CpuChipIcon,
  WrenchScrewdriverIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  ChevronRightIcon,
  UserIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  KeyIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  CogIcon,
  CommandLineIcon,
} from "@heroicons/react/24/outline";
import Logo from "./Logo";
import AuthDialog from "./AuthDialog";
import { AuthService } from "../services/AuthService";
import { AuthUser } from "../../shared/types";

interface LandingPageProps {
  onLogin: (user: AuthUser) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  // console.log("🏠 LandingPage: Component rendering...");

  const [currentFeature, setCurrentFeature] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const authService = AuthService.getInstance();

  // Development mode detection - consistent with DevModeIndicator
  const isDevelopment = (() => {
    try {
      // Check multiple ways to determine dev mode
      return (
        process.env.NODE_ENV === "development" ||
        (typeof __DEV__ !== "undefined" && __DEV__) ||
        window.location.hostname === "localhost" ||
        window.location.protocol === "http:"
      );
    } catch (error) {
      console.error("Error detecting development mode:", error);
      // Fallback for any errors - assume dev if on localhost
      return (
        window.location.hostname === "localhost" ||
        window.location.protocol === "http:"
      );
    }
  })();

  const features = [
    {
      icon: CpuChipIcon,
      title: "Intelligent Workflows",
      description:
        "Create sophisticated multi-step workflows with AI agents that automate complex tasks and integrations",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: GlobeAltIcon,
      title: "Remote MCP Servers",
      description:
        "Instantly connect to 18+ remote servers including GitHub, Linear, Sentry, and Atlassian with one-click setup",
      color: "from-indigo-500 to-purple-500",
    },
    {
      icon: CodeBracketIcon,
      title: "MCP Server Generator",
      description:
        "Generate production-ready MCP servers in TypeScript or Python with tools, resources, prompts, and full VS Code integration",
      color: "from-emerald-500 to-teal-500",
    },
    {
      icon: WrenchScrewdriverIcon,
      title: "Universal Integration",
      description:
        "Works seamlessly with Claude Desktop, GitHub Copilot, and any MCP-compatible AI client or platform",
      color: "from-green-500 to-emerald-500",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [features.length]);

  const handleLogin = async () => {
    setIsLoading(true);
    setIsAuthDialogOpen(true);
  };

  const handleAuthSuccess = (user: AuthUser) => {
    setIsLoading(false);
    setIsAuthDialogOpen(false);
    setAuthError(null);
    onLogin(user);
  };

  const handleAuthError = (error: string) => {
    setIsLoading(false);
    setAuthError(error);
    // Keep dialog open to show error
  };

  const handleAuthDialogClose = () => {
    setIsAuthDialogOpen(false);
    setIsLoading(false);
    setAuthError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-2">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative w-full max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Welcome content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            {/* Logo and Title */}
            <div className="flex items-center justify-center lg:justify-start mb-6">
              <Logo size="lg" className="mr-4" />
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                  MCP Studio
                </h1>
                <p className="text-xl text-slate-400 font-medium">
                  Model Context Protocol Client
                </p>
              </div>
            </div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl lg:text-2xl text-slate-300 mb-6 leading-relaxed"
            >
              Professional AI workflow orchestration with{" "}
              <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent font-semibold">
                intelligent workflows
              </span>
              ,{" "}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-semibold">
                remote MCP servers
              </span>
              ,{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent font-semibold">
                server generation
              </span>
              , and{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent font-semibold">
                enterprise integrations
              </span>{" "}
              for next-generation AI applications
            </motion.p>

            {/* Feature showcase */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mb-6"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentFeature}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="flex items-center justify-center lg:justify-start gap-3 p-3 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30"
                >
                  <div
                    className={`p-2 rounded-lg bg-gradient-to-r ${features[currentFeature].color}`}
                  >
                    {React.createElement(features[currentFeature].icon, {
                      className: "w-5 h-5 text-white",
                    })}
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-semibold text-white mb-1">
                      {features[currentFeature].title}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {features[currentFeature].description}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="grid grid-cols-3 gap-6 mb-10"
            >
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">5+</div>
                <div className="text-sm text-slate-400">AI Models</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">∞</div>
                <div className="text-sm text-slate-400">Code Export</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">v2.1</div>
                <div className="text-sm text-slate-400">Postman Import</div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right side - Login card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex justify-center lg:justify-end"
          >
            <div className="w-full max-w-md">
              <motion.div
                whileHover={{ y: -5 }}
                className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl"
              >
                {/* IBM Logo */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl mb-4">
                    <span className="text-2xl font-bold text-white">IBM</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Welcome Back
                  </h2>
                  <p className="text-slate-400">
                    Sign in with your IBM credentials
                  </p>
                </div>

                {/* Login form */}
                <div className="space-y-6">
                  {/* SSO Login Button */}
                  <motion.button
                    onClick={handleLogin}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-600/50 disabled:to-blue-700/50 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/25 disabled:cursor-not-allowed"
                    whileHover={{ scale: isLoading ? 1 : 1.02 }}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Opening Authentication...</span>
                      </>
                    ) : (
                      <>
                        <KeyIcon className="w-5 h-5" />
                        <span>Sign in to MCP Studio</span>
                        <ArrowRightIcon className="w-4 h-4 ml-auto" />
                      </>
                    )}
                  </motion.button>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-slate-800 text-slate-400">
                        Secure Authentication
                      </span>
                    </div>
                  </div>

                  {/* Security features */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>OAuth 2.0 with PKCE security</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Google, GitHub, Microsoft support</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Enterprise SSO integration</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
                  {/* Development mode notice */}
                  {isDevelopment && (
                    <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 mb-3">
                      <strong>Development Mode:</strong> Authentication is
                      simulated
                    </div>
                  )}

                  <p className="text-xs text-slate-500">
                    By signing in, you agree to our Terms of Service and Privacy
                    Policy
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Bottom feature grid - Made more compact */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              whileHover={{ y: -3 }}
              className={`p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30 cursor-pointer transition-all duration-300 ${
                index === currentFeature ? "ring-2 ring-blue-500/50" : ""
              }`}
              onClick={() => setCurrentFeature(index)}
            >
              <div
                className={`inline-flex p-2 rounded-lg bg-gradient-to-r ${feature.color} mb-3`}
              >
                {React.createElement(feature.icon, {
                  className: "w-5 h-5 text-white",
                })}
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Key Features Highlight - Compact version */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="mt-8 bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm rounded-2xl border border-slate-600/30 p-6"
        >
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-2">
              🚀 Advanced AI Orchestration
            </h2>
            <p className="text-sm text-slate-300">
              Next-generation workflow automation and remote server integration
            </p>
          </div>

          {/* Compact benefits grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center justify-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span className="text-slate-300 text-sm">
                Intelligent Automation
              </span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-slate-300 text-sm">
                Remote Server Ecosystem
              </span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
              <span className="text-slate-300 text-sm">Server Generation</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-slate-300 text-sm">
                Enterprise Integration
              </span>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="mt-8 border-t border-slate-800/50 pt-6"
        >
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-4">
              <span>© 2025 IBM Corporation</span>
              <span>•</span>
              <span>MCP Studio v1.0</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-slate-300 transition-colors">
                Privacy
              </a>
              <span>•</span>
              <a href="#" className="hover:text-slate-300 transition-colors">
                Terms
              </a>
              <span>•</span>
              <a href="#" className="hover:text-slate-300 transition-colors">
                Support
              </a>
            </div>
          </div>
        </motion.footer>
      </div>

      {/* Authentication Dialog */}
      <AuthDialog
        isOpen={isAuthDialogOpen}
        onClose={handleAuthDialogClose}
        onAuthSuccess={handleAuthSuccess}
        onAuthError={handleAuthError}
      />
    </div>
  );
};

export default LandingPage;
