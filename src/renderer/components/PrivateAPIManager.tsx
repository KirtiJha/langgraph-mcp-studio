import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MagnifyingGlassIcon,
  BoltIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
} from "@heroicons/react/24/outline";
import { PublicAPISpec } from "../../shared/publicApiTypes";
import { APIServerConfig } from "../../shared/apiServerTypes";
import PrivateAPIService from "../services/PrivateAPIService";
import APIDiscoveryService from "../services/APIDiscoveryService";

interface PrivateAPIManagerProps {
  onConvertToMCP?: (api: PublicAPISpec) => void;
  onCreateServer?: (config: APIServerConfig) => void;
}

const PrivateAPIManager: React.FC<PrivateAPIManagerProps> = ({
  onConvertToMCP,
  onCreateServer,
}) => {
  const [privateAPIs, setPrivateAPIs] = useState<PublicAPISpec[]>([]);
  const [loading, setLoading] = useState(false);
  const [discoveryUrl, setDiscoveryUrl] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [autoConfiguring, setAutoConfiguring] = useState<string | null>(null);

  // Load saved private APIs
  useEffect(() => {
    loadPrivateAPIs();
  }, []);

  const loadPrivateAPIs = async () => {
    setLoading(true);
    try {
      // Load from localStorage or other storage
      const saved = localStorage.getItem("private-apis");
      if (saved) {
        setPrivateAPIs(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Failed to load private APIs:", error);
    } finally {
      setLoading(false);
    }
  };

  const savePrivateAPIs = (apis: PublicAPISpec[]) => {
    try {
      localStorage.setItem("private-apis", JSON.stringify(apis));
      setPrivateAPIs(apis);
    } catch (error) {
      console.error("Failed to save private APIs:", error);
    }
  };

  const handleDiscoverAPI = async () => {
    if (!discoveryUrl.trim()) return;

    setDiscovering(true);
    try {
      const result = await APIDiscoveryService.discoverAPI(discoveryUrl, {
        includeAuth: true,
        validateEndpoints: true,
      });

      if (result.api) {
        console.log("🔍 PrivateAPIManager - Discovery result:", result.api);
        console.log(
          "🔍 PrivateAPIManager - Authentication:",
          result.api.authentication
        );

        // Add to private APIs list
        const newAPIs = [...privateAPIs, result.api];
        savePrivateAPIs(newAPIs);
        setDiscoveryUrl("");
      } else {
        console.log("🚨 PrivateAPIManager - No result.api found");
      }
    } catch (error) {
      console.error("API discovery failed:", error);
    } finally {
      setDiscovering(false);
    }
  };

  const handleAutoConfig = async (api: PublicAPISpec) => {
    setAutoConfiguring(api.id);
    try {
      const result = await APIDiscoveryService.autoConfigureAPIServer(api, {
        includeAuth: true,
        validateEndpoints: true,
        generateDocs: true,
      });

      if (result && onCreateServer) {
        onCreateServer(result);
      }
    } catch (error) {
      console.error("Auto-configuration failed:", error);
    } finally {
      setAutoConfiguring(null);
    }
  };

  const handleDeleteAPI = (apiId: string) => {
    const newAPIs = privateAPIs.filter((api) => api.id !== apiId);
    savePrivateAPIs(newAPIs);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-400 bg-green-400/10";
      case "private":
        return "text-blue-400 bg-blue-400/10";
      case "internal":
        return "text-purple-400 bg-purple-400/10";
      case "beta":
        return "text-yellow-400 bg-yellow-400/10";
      case "deprecated":
        return "text-red-400 bg-red-400/10";
      default:
        return "text-slate-400 bg-slate-400/10";
    }
  };

  const getAuthColor = (authType: string) => {
    switch (authType) {
      case "none":
        return "text-slate-400";
      case "apiKey":
        return "text-yellow-400";
      case "oauth2":
        return "text-blue-400";
      case "bearer":
        return "text-green-400";
      case "basic":
        return "text-orange-400";
      default:
        return "text-purple-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Private API Manager</h2>
          <p className="text-slate-400 mt-1">
            Discover, analyze, and manage your private and internal APIs
          </p>
        </div>
        <div className="text-sm text-slate-400">
          {privateAPIs.length} private API{privateAPIs.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Discovery Section */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <MagnifyingGlassIcon className="w-5 h-5" />
          Discover New API
        </h3>

        <div className="flex gap-3">
          <input
            type="url"
            value={discoveryUrl}
            onChange={(e) => setDiscoveryUrl(e.target.value)}
            placeholder="https://api.example.com"
            className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleDiscoverAPI}
            disabled={!discoveryUrl.trim() || discovering}
            className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {discovering ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <MagnifyingGlassIcon className="w-4 h-4" />
            )}
            {discovering ? "Discovering..." : "Discover"}
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-2">
          Enter the base URL of your private API to analyze its structure and
          capabilities
        </p>
      </div>

      {/* APIs Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      ) : privateAPIs.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-white mb-2">
            No Private APIs
          </h3>
          <p className="text-sm">
            Discover your first private API to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {privateAPIs.map((api) => (
            <motion.div
              key={api.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-6 hover:border-slate-600/50 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">{api.name}</h3>
                  <p className="text-sm text-slate-400 line-clamp-2">
                    {api.description}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span
                    className={`px-2 py-1 text-xs rounded font-medium ${getStatusColor(
                      api.status
                    )}`}
                  >
                    {api.status}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Base URL:</span>
                  <span
                    className="text-white font-mono text-xs truncate max-w-40"
                    title={api.baseUrl}
                  >
                    {api.baseUrl}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Authentication:</span>
                  <span
                    className={`font-medium ${getAuthColor(
                      api.authentication?.type || "none"
                    )}`}
                  >
                    {(() => {
                      const authType = api.authentication?.type;
                      switch (authType) {
                        case "apiKey":
                          return "API Key";
                        case "oauth2":
                          return "OAuth 2.0";
                        case "bearer":
                          return "Bearer Token";
                        case "basic":
                          return "Basic Auth";
                        case "none":
                          return "None";
                        default:
                          return authType || "none";
                      }
                    })()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Endpoints:</span>
                  <span className="text-white">
                    {api.endpoints?.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Environment:</span>
                  <span className="text-white capitalize">
                    {api.environment || "production"}
                  </span>
                </div>
              </div>

              {/* Tags */}
              {api.tags && api.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {api.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs bg-slate-700/50 text-slate-300 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {api.tags.length > 3 && (
                    <span className="px-2 py-1 text-xs bg-slate-700/50 text-slate-300 rounded">
                      +{api.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAutoConfig(api)}
                  disabled={autoConfiguring === api.id}
                  className="flex-1 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 px-3 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {autoConfiguring === api.id ? (
                    <ArrowPathIcon className="w-3 h-3 animate-spin" />
                  ) : (
                    <BoltIcon className="w-3 h-3" />
                  )}
                  {autoConfiguring === api.id
                    ? "Configuring..."
                    : "Auto-Config"}
                </button>

                <button
                  onClick={() => onConvertToMCP?.(api)}
                  className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 p-2 rounded transition-colors"
                  title="Convert to MCP Server"
                >
                  <CloudArrowUpIcon className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDeleteAPI(api.id)}
                  className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 p-2 rounded transition-colors"
                  title="Delete API"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PrivateAPIManager;
