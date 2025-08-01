import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  GlobeAltIcon,
  KeyIcon,
  ShieldCheckIcon,
  BoltIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { ServerConfig } from "../../shared/types";

interface AddRemoteServerDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (config: ServerConfig) => void;
}

interface PopularServer {
  name: string;
  url: string;
  description: string;
  authType: "oauth" | "bearer" | "apiKey" | "basic" | "open" | "none";
  category: string;
  isOfficial: boolean;
  officialLink: string;
  note?: string;
  oauthEndpoint?: string;
}

// Popular remote MCP servers from the research
const POPULAR_REMOTE_SERVERS: PopularServer[] = [
  {
    name: "GitHub MCP Server",
    url: "https://api.githubcopilot.com/mcp/",
    description:
      "Official GitHub MCP server for repository management, issues, and pull requests",
    authType: "oauth" as const,
    category: "Development",
    isOfficial: true,
    officialLink: "https://github.com/github/github-mcp-server",
  },
  {
    name: "Sentry",
    url: "https://mcp.sentry.dev/sse",
    description: "Error tracking and performance monitoring for applications",
    authType: "oauth" as const,
    category: "Development",
    isOfficial: true,
    officialLink: "https://docs.sentry.io/product/mcp/",
  },
  {
    name: "Linear",
    url: "https://mcp.linear.app/sse",
    description: "Issue tracking and project management for software teams",
    authType: "oauth" as const,
    category: "Productivity",
    isOfficial: true,
    officialLink: "https://linear.app/docs/mcp",
  },
  {
    name: "DeepWiki",
    url: "https://mcp.deepwiki.com/mcp",
    description: "AI-powered knowledge base and documentation platform",
    authType: "open" as const,
    category: "Knowledge",
    isOfficial: true,
    officialLink: "https://deepwiki.com/mcp",
  },
  {
    name: "Intercom",
    url: "https://mcp.intercom.com/sse",
    description: "Customer support and messaging platform",
    authType: "oauth" as const,
    category: "Communication",
    isOfficial: true,
    officialLink: "https://developers.intercom.com/docs/mcp",
  },
  {
    name: "Neon",
    url: "https://mcp.neon.tech/sse",
    description: "Serverless PostgreSQL database platform",
    authType: "oauth" as const,
    category: "Database",
    isOfficial: true,
    officialLink: "https://neon.tech/docs/mcp",
  },
  {
    name: "PayPal",
    url: "https://mcp.paypal.com/sse",
    description: "Online payment processing and financial services",
    authType: "oauth" as const,
    category: "Finance",
    isOfficial: true,
    officialLink: "https://mcp.paypal.com/",
  },
  {
    name: "Square",
    url: "https://mcp.squareup.com/sse",
    description: "Payment processing and point-of-sale solutions",
    authType: "oauth" as const,
    category: "Finance",
    isOfficial: true,
    officialLink: "https://developer.squareup.com/docs/mcp",
  },
  {
    name: "CoinGecko",
    url: "https://mcp.api.coingecko.com/sse",
    description: "Cryptocurrency market data and analytics",
    authType: "open" as const,
    category: "Finance",
    isOfficial: true,
    officialLink: "https://www.coingecko.com/api/mcp",
  },
  {
    name: "Asana",
    url: "https://mcp.asana.com/sse",
    description: "Team collaboration and project management platform",
    authType: "oauth" as const,
    category: "Productivity",
    isOfficial: true,
    officialLink: "https://developers.asana.com/docs/mcp",
  },
  {
    name: "Atlassian",
    url: "https://mcp.atlassian.com/v1/sse",
    description: "Jira, Confluence, and other development tools",
    authType: "oauth" as const,
    category: "Development",
    isOfficial: true,
    officialLink: "https://developer.atlassian.com/cloud/mcp/",
  },
  {
    name: "Wix",
    url: "https://mcp.wix.com/sse",
    description: "Website building and management platform",
    authType: "oauth" as const,
    category: "Development",
    isOfficial: true,
    officialLink: "https://dev.wix.com/docs/mcp",
  },
  {
    name: "Webflow",
    url: "https://mcp.webflow.com/sse",
    description: "Visual web design and CMS platform",
    authType: "oauth" as const,
    category: "Development",
    isOfficial: true,
    officialLink: "https://developers.webflow.com/docs/mcp",
  },
  {
    name: "Globalping",
    url: "https://mcp.globalping.dev/sse",
    description: "Global network monitoring and performance testing",
    authType: "oauth" as const,
    category: "Infrastructure",
    isOfficial: true,
    officialLink: "https://globalping.io/docs/mcp",
  },
  {
    name: "Semgrep",
    url: "https://mcp.semgrep.ai/sse",
    description: "Static code analysis and security scanning",
    authType: "open" as const,
    category: "Security",
    isOfficial: true,
    officialLink: "https://semgrep.dev/docs/mcp",
  },
  {
    name: "Fetch",
    url: "https://remote.mcpservers.org/fetch/mcp",
    description: "Web content fetching and conversion for LLM usage",
    authType: "open" as const,
    category: "Utility",
    isOfficial: true,
    officialLink:
      "https://github.com/modelcontextprotocol/servers/blob/main/src/fetch",
  },
  {
    name: "Sequential Thinking",
    url: "https://remote.mcpservers.org/sequentialthinking/mcp",
    description: "Dynamic problem-solving through thought sequences",
    authType: "open" as const,
    category: "AI",
    isOfficial: true,
    officialLink:
      "https://github.com/modelcontextprotocol/servers/blob/main/src/sequentialthinking",
  },
  {
    name: "EdgeOne Pages",
    url: "https://remote.mcpservers.org/edgeone-pages/mcp",
    description: "Deploy HTML content to EdgeOne Pages with public URLs",
    authType: "open" as const,
    category: "Deployment",
    isOfficial: true,
    officialLink: "https://github.com/TencentEdgeOne/edgeone-pages-mcp",
  },
];

export function AddRemoteServerDialog({
  open,
  onClose,
  onAdd,
}: AddRemoteServerDialogProps) {
  const [activeTab, setActiveTab] = useState("popular");
  const [formData, setFormData] = useState<Partial<ServerConfig>>({
    name: "",
    url: "",
    type: "remote",
    authType: "none",
    description: "",
    category: "Other",
    enabled: true,
    autoRestart: true,
    timeout: 30000,
    headers: {},
  });
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
    capabilities?: string[];
  } | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: "",
        url: "",
        type: "remote",
        authType: "none",
        description: "",
        category: "Other",
        enabled: true,
        autoRestart: true,
        timeout: 30000,
        headers: {},
      });
      setValidationResult(null);
    }
  }, [open]);

  const handlePopularServerSelect = (server: PopularServer) => {
    setFormData({
      ...formData,
      name: server.name,
      url: server.url,
      description: server.description,
      category: server.category,
      isOfficial: server.isOfficial,
      authType: server.authType === "open" ? "none" : server.authType,
      ...(server.oauthEndpoint && {
        oauthTokenEndpoint: server.oauthEndpoint,
      }),
    });
    setActiveTab("manual");
  };

  const validateRemoteServer = async () => {
    if (!formData.url) {
      setValidationResult({
        isValid: false,
        message: "Please enter a server URL",
      });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      // Use Electron API to test the connection (bypasses CORS)
      if (window.electronAPI) {
        const testResult = await window.electronAPI.testRemoteServerConnection({
          url: formData.url,
          authType: formData.authType,
          accessToken: formData.accessToken,
          apiKey: formData.apiKey,
          apiKeyHeader: formData.apiKeyHeader,
          username: formData.username,
          password: formData.password,
          headers: formData.headers,
        });

        if (testResult.success) {
          setValidationResult({
            isValid: true,
            message: "Successfully connected to MCP server",
            capabilities: testResult.capabilities || [],
          });
        } else {
          setValidationResult({
            isValid: false,
            message: testResult.error || "Connection failed",
          });
        }
      } else {
        // Fallback for browser mode - show info about CORS limitation
        setValidationResult({
          isValid: false,
          message:
            "Connection testing is not available in browser mode. Please use the desktop application for full functionality.",
        });
      }
    } catch (error) {
      setValidationResult({
        isValid: false,
        message:
          error instanceof Error ? error.message : "Connection test failed",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.url) {
      return;
    }

    const config: ServerConfig = {
      id: Date.now().toString(),
      name: formData.name,
      type: "remote",
      url: formData.url,
      enabled: formData.enabled ?? true,
      autoRestart: formData.autoRestart ?? true,
      timeout: formData.timeout ?? 30000,
      authType: formData.authType || "none",
      headers: formData.headers || {},
      description: formData.description,
      category: formData.category,
      isOfficial: formData.isOfficial,
      ...(formData.authType === "bearer" && {
        accessToken: formData.accessToken,
      }),
      ...(formData.authType === "apiKey" && {
        apiKey: formData.apiKey,
        apiKeyHeader: formData.apiKeyHeader || "X-API-Key",
      }),
      ...(formData.authType === "basic" && {
        username: formData.username,
        password: formData.password,
      }),
      ...(formData.authType === "oauth" && {
        oauthClientId: formData.oauthClientId,
        oauthClientSecret: formData.oauthClientSecret,
        oauthScopes: formData.oauthScopes,
        oauthTokenEndpoint: formData.oauthTokenEndpoint,
      }),
    };

    onAdd(config);
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-slate-900/50 to-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                  <GlobeAltIcon className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                    Add Remote MCP Server
                  </h2>
                  <p className="text-sm text-slate-400">
                    Connect to remote Model Context Protocol servers that
                    provide tools, resources, and capabilities.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                title="Close dialog"
                className="text-slate-400 hover:text-slate-200 transition-colors p-2 hover:bg-slate-800/50 rounded-lg"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="px-6 pt-4">
            <div className="flex border-b border-slate-700/50">
              <button
                onClick={() => setActiveTab("popular")}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                  activeTab === "popular"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <BoltIcon className="h-4 w-4" />
                Popular Servers
              </button>
              <button
                onClick={() => setActiveTab("manual")}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                  activeTab === "manual"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <KeyIcon className="h-4 w-4" />
                Manual Configuration
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "popular" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {POPULAR_REMOTE_SERVERS.map((server, index) => (
                    <div
                      key={index}
                      onClick={() => handlePopularServerSelect(server)}
                      className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4 cursor-pointer hover:bg-slate-700/50 transition-all duration-200 hover:border-slate-600/50 group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-slate-100 group-hover:text-white transition-colors">
                          {server.name}
                        </h3>
                        <div className="flex gap-2">
                          {server.isOfficial && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs rounded-full">
                              <CheckIcon className="h-3 w-3" />
                              Official
                            </span>
                          )}
                          <span className="inline-flex items-center px-2 py-1 bg-slate-700/50 border border-slate-600/50 text-slate-300 text-xs rounded-full">
                            {server.category}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400 mb-3 group-hover:text-slate-300 transition-colors">
                        {server.description}
                      </p>
                      {server.officialLink && (
                        <div className="mb-3">
                          <a
                            href={server.officialLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                            Official Documentation
                          </a>
                        </div>
                      )}
                      {server.note && (
                        <p className="text-xs text-amber-400 mb-2 bg-amber-500/10 border border-amber-500/20 rounded p-2">
                          💡 {server.note}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <ShieldCheckIcon className="h-3 w-3" />
                        {server.authType === "none"
                          ? "No authentication"
                          : server.authType === "oauth"
                          ? "OAuth required"
                          : server.authType === "bearer"
                          ? "Bearer token required"
                          : server.authType === "apiKey"
                          ? "API key required"
                          : server.authType === "basic"
                          ? "Basic auth required"
                          : server.authType === "open"
                          ? "Open access"
                          : "Authentication required"}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4">
                  <div className="flex gap-3">
                    <InformationCircleIcon className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-300">
                      Click on any server above to automatically configure it,
                      then switch to the Manual tab to complete the setup.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "manual" && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                    Basic Configuration
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        Server Name
                      </label>
                      <input
                        type="text"
                        value={formData.name || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="My Remote Server"
                        required
                        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-slate-100 placeholder-slate-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value })
                        }
                        title="Select server category"
                        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-slate-100"
                      >
                        <option value="Development">Development</option>
                        <option value="Productivity">Productivity</option>
                        <option value="Database">Database</option>
                        <option value="Finance">Finance</option>
                        <option value="Communication">Communication</option>
                        <option value="Security">Security</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Server URL
                    </label>
                    <input
                      type="url"
                      value={formData.url || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, url: e.target.value })
                      }
                      placeholder="https://mcp.example.com/sse"
                      required
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-slate-100 placeholder-slate-400"
                    />
                    <p className="text-xs text-slate-500">
                      The HTTP/SSE endpoint for the remote MCP server
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Description (Optional)
                    </label>
                    <textarea
                      value={formData.description || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Brief description of what this server provides..."
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-slate-100 placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* Authentication Configuration */}
                <div className="space-y-4 border-t border-slate-700/50 pt-6">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                      Authentication
                    </h3>
                    <ShieldCheckIcon className="h-5 w-5 text-slate-500" />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Authentication Type
                    </label>
                    <select
                      value={formData.authType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          authType: e.target.value as any,
                        })
                      }
                      title="Select authentication type"
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-slate-100"
                    >
                      <option value="none">No Authentication</option>
                      <option value="bearer">Bearer Token</option>
                      <option value="apiKey">API Key</option>
                      <option value="basic">Basic Auth</option>
                      <option value="oauth">OAuth 2.0</option>
                    </select>
                  </div>

                  {/* Conditional auth fields */}
                  {formData.authType === "bearer" && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        Bearer Token
                      </label>
                      <input
                        type="password"
                        value={formData.accessToken || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            accessToken: e.target.value,
                          })
                        }
                        placeholder={
                          formData.name === "GitHub"
                            ? "github_pat_..."
                            : "your-bearer-token"
                        }
                        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-slate-100 placeholder-slate-400"
                      />
                      {formData.name === "GitHub" && (
                        <p className="text-xs text-slate-500">
                          Create a GitHub Personal Access Token at{" "}
                          <a
                            href="https://github.com/settings/personal-access-tokens/new"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 underline"
                          >
                            github.com/settings/personal-access-tokens/new
                          </a>
                        </p>
                      )}
                    </div>
                  )}

                  {formData.authType === "apiKey" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">
                          API Key
                        </label>
                        <input
                          type="password"
                          value={formData.apiKey || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, apiKey: e.target.value })
                          }
                          placeholder="your-api-key"
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-slate-100 placeholder-slate-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">
                          Header Name
                        </label>
                        <input
                          type="text"
                          value={formData.apiKeyHeader || "X-API-Key"}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              apiKeyHeader: e.target.value,
                            })
                          }
                          placeholder="X-API-Key"
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-slate-100 placeholder-slate-400"
                        />
                      </div>
                    </div>
                  )}

                  {formData.authType === "basic" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">
                          Username
                        </label>
                        <input
                          type="text"
                          value={formData.username || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              username: e.target.value,
                            })
                          }
                          placeholder="username"
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-slate-100 placeholder-slate-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">
                          Password
                        </label>
                        <input
                          type="password"
                          value={formData.password || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              password: e.target.value,
                            })
                          }
                          placeholder="password"
                          className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-slate-100 placeholder-slate-400"
                        />
                      </div>
                    </div>
                  )}

                  {formData.authType === "oauth" && (
                    <div className="space-y-4">
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                        <div className="flex gap-3">
                          <ExclamationTriangleIcon className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-amber-300 font-medium">
                              OAuth 2.0 Setup Required
                            </p>
                            <p className="text-xs text-amber-400/80 mt-1">
                              You'll need to complete OAuth authentication after
                              adding the server. Make sure you have the correct
                              client credentials.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-300">
                            Client ID
                          </label>
                          <input
                            type="text"
                            value={formData.oauthClientId || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                oauthClientId: e.target.value,
                              })
                            }
                            placeholder="your-client-id"
                            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-slate-100 placeholder-slate-400"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-300">
                            Client Secret
                          </label>
                          <input
                            type="password"
                            value={formData.oauthClientSecret || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                oauthClientSecret: e.target.value,
                              })
                            }
                            placeholder="your-client-secret"
                            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-md shadow-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-slate-100 placeholder-slate-400"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Connection Test */}
                <div className="space-y-4 border-t border-slate-700/50 pt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                      Connection Test
                    </h3>
                    <button
                      type="button"
                      onClick={validateRemoteServer}
                      disabled={!formData.url || isValidating}
                      className="px-4 py-2 bg-emerald-600/80 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-md transition-colors duration-200 border border-emerald-500/50 disabled:border-slate-600"
                    >
                      {isValidating ? "Testing..." : "Test Connection"}
                    </button>
                  </div>

                  {validationResult && (
                    <div
                      className={`border rounded-lg p-4 backdrop-blur-sm ${
                        validationResult.isValid
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : "bg-red-500/10 border-red-500/30"
                      }`}
                    >
                      <div className="flex gap-3">
                        {validationResult.isValid ? (
                          <CheckIcon className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p
                            className={`text-sm ${
                              validationResult.isValid
                                ? "text-emerald-200"
                                : "text-red-200"
                            }`}
                          >
                            {validationResult.message}
                          </p>
                          {validationResult.capabilities &&
                            validationResult.capabilities.length > 0 && (
                              <div className="mt-2">
                                <strong className="text-emerald-300">
                                  Capabilities:
                                </strong>
                                <span className="ml-2 text-emerald-400">
                                  {validationResult.capabilities.join(", ")}
                                </span>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-sm font-medium rounded-md text-slate-300 hover:text-slate-100 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.name || !formData.url}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-700 disabled:to-slate-700 text-white text-sm font-medium rounded-md transition-all duration-200 disabled:opacity-50 shadow-md hover:shadow-emerald-500/25"
                  >
                    Add Remote Server
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default AddRemoteServerDialog;
