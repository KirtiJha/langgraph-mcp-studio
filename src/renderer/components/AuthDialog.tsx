import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  UserCircleIcon,
  KeyIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { AuthService } from "../services/AuthService";
import { AuthUser, AuthProvider } from "../../shared/types";

// Provider Icons
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
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

const GitHubIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const MicrosoftIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#F25022" d="M1 1h10v10H1z" />
    <path fill="#00A4EF" d="M13 1h10v10H13z" />
    <path fill="#7FBA00" d="M1 13h10v10H1z" />
    <path fill="#FFB900" d="M13 13h10v10H13z" />
  </svg>
);

const IBMIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.5 6h9v1.5h-9V6zm-1.5 3h12v1.5H6V9zm0 3h12v1.5H6V12zm1.5 3h9v1.5h-9V15zm3-12h3v1.5h-3V3zm0 18h3v1.5h-3V21zm-6-9h1.5v1.5H4.5V12zm15 0H21v1.5h-1.5V12zM3 9h1.5v1.5H3V9zm18 0h1.5v1.5H21V9zM3 15h1.5v1.5H3V15zm18 0h1.5v1.5H21V15z" />
    <circle cx="12" cy="12" r="2" fill="#1f5182" />
  </svg>
);

const SSOIcon = () => <ShieldCheckIcon className="w-5 h-5" />;

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: AuthUser) => void;
  onAuthError: (error: string) => void;
}

export const AuthDialog: React.FC<AuthDialogProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  onAuthError,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<AuthProvider | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [showSSOConfig, setShowSSOConfig] = useState(false);
  const [ssoConfig, setSSOConfig] = useState({
    organizationName: "",
    authUrl: "",
    tokenUrl: "",
    clientId: "",
    clientSecret: "",
    userInfoUrl: "",
  });

  const authService = AuthService.getInstance();

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsLoading(false);
      setLoadingProvider(null);
    }
  }, [isOpen]);

  const handleProviderLogin = async (provider: AuthProvider) => {
    setIsLoading(true);
    setLoadingProvider(provider);
    setError(null);

    try {
      let user: AuthUser;
      switch (provider) {
        case "google":
          user = await authService.signInWithGoogle();
          break;
        case "github":
          user = await authService.signInWithGitHub();
          break;
        case "microsoft":
          user = await authService.signInWithMicrosoft();
          break;
        case "ibm":
          user = await authService.signInWithIBM();
          break;
        case "sso":
          user = await authService.signInWithSSO();
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      onAuthSuccess(user);
      onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Authentication failed";
      setError(errorMessage);
      onAuthError(errorMessage);
    } finally {
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

  const handleSSOSetup = () => {
    // Update SSO configuration
    authService.updateConfig({
      providers: {
        sso: {
          authUrl: ssoConfig.authUrl,
          tokenUrl: ssoConfig.tokenUrl,
          clientId: ssoConfig.clientId,
          clientSecret: ssoConfig.clientSecret,
          scopes: ["openid", "profile", "email"],
          organizationName: ssoConfig.organizationName,
          userInfoUrl: ssoConfig.userInfoUrl,
        },
      },
    });

    // Trigger SSO login
    handleProviderLogin("sso");
  };

  const providers = [
    {
      id: "ibm" as AuthProvider,
      name: "IBM SSO",
      icon: IBMIcon,
      description: "Sign in with your IBM SSO account",
      color: "from-blue-600 to-blue-800",
      hoverColor: "from-blue-700 to-blue-900",
    },
    {
      id: "google" as AuthProvider,
      name: "Google",
      icon: GoogleIcon,
      description: "Sign in with your Google account",
      color: "from-red-500 to-red-600",
      hoverColor: "from-red-600 to-red-700",
    },
    {
      id: "github" as AuthProvider,
      name: "GitHub",
      icon: GitHubIcon,
      description: "Sign in with your GitHub account",
      color: "from-gray-700 to-gray-800",
      hoverColor: "from-gray-800 to-gray-900",
    },
    {
      id: "microsoft" as AuthProvider,
      name: "Microsoft",
      icon: MicrosoftIcon,
      description: "Sign in with your Microsoft account",
      color: "from-blue-500 to-blue-600",
      hoverColor: "from-blue-600 to-blue-700",
    },
    {
      id: "sso" as AuthProvider,
      name: "Enterprise SSO",
      icon: SSOIcon,
      description: "Sign in with your organization's SSO",
      color: "from-indigo-500 to-indigo-600",
      hoverColor: "from-indigo-600 to-indigo-700",
    },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <KeyIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {showSSOConfig ? "Configure SSO" : "Sign in to MCP Studio"}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {showSSOConfig
                      ? "Configure your organization's SSO settings"
                      : "Choose your preferred authentication method"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {showSSOConfig ? (
              /* SSO Configuration Form */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={ssoConfig.organizationName}
                    onChange={(e) =>
                      setSSOConfig({
                        ...ssoConfig,
                        organizationName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your Organization"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Authorization URL
                  </label>
                  <input
                    type="url"
                    value={ssoConfig.authUrl}
                    onChange={(e) =>
                      setSSOConfig({ ...ssoConfig, authUrl: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://your-sso.com/auth"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Token URL
                  </label>
                  <input
                    type="url"
                    value={ssoConfig.tokenUrl}
                    onChange={(e) =>
                      setSSOConfig({ ...ssoConfig, tokenUrl: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://your-sso.com/token"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Client ID
                  </label>
                  <input
                    type="text"
                    value={ssoConfig.clientId}
                    onChange={(e) =>
                      setSSOConfig({ ...ssoConfig, clientId: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your-client-id"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Client Secret (Optional)
                  </label>
                  <input
                    type="password"
                    value={ssoConfig.clientSecret}
                    onChange={(e) =>
                      setSSOConfig({
                        ...ssoConfig,
                        clientSecret: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your-client-secret"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    User Info URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={ssoConfig.userInfoUrl}
                    onChange={(e) =>
                      setSSOConfig({
                        ...ssoConfig,
                        userInfoUrl: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://your-sso.com/userinfo"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowSSOConfig(false)}
                    className="flex-1 px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSSOSetup}
                    disabled={
                      !ssoConfig.organizationName ||
                      !ssoConfig.authUrl ||
                      !ssoConfig.tokenUrl ||
                      !ssoConfig.clientId ||
                      isLoading
                    }
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isLoading ? "Signing in..." : "Sign in with SSO"}
                  </button>
                </div>
              </div>
            ) : (
              /* Provider Selection */
              <div className="space-y-4">
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => {
                      if (provider.id === "sso") {
                        setShowSSOConfig(true);
                      } else {
                        handleProviderLogin(provider.id);
                      }
                    }}
                    disabled={isLoading}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-600 hover:border-slate-500 bg-gradient-to-r ${
                      loadingProvider === provider.id
                        ? provider.hoverColor
                        : provider.color
                    } hover:${
                      provider.hoverColor
                    } text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                      {loadingProvider === provider.id ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <provider.icon />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="font-medium">{provider.name}</h4>
                      <p className="text-sm text-white/70">
                        {provider.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400"
              >
                <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}

            {/* Security Notice */}
            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <ShieldCheckIcon className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Secure Authentication
                </span>
              </div>
              <p className="text-xs text-slate-400">
                All authentication is performed using industry-standard OAuth
                2.0 protocols with PKCE for enhanced security. Your credentials
                are never stored by MCP Studio.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AuthDialog;
