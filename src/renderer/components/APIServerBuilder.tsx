import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  CloudArrowUpIcon,
  CogIcon,
  PlusIcon,
  TrashIcon,
  LockClosedIcon,
  BeakerIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  LinkIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  WrenchScrewdriverIcon,
  ServerIcon,
} from "@heroicons/react/24/outline";
import { APIServerConfig, APIEndpoint } from "../../shared/apiServerTypes";
import { API_TEMPLATES } from "../../shared/apiTemplates";

interface APIServerBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: APIServerConfig) => void;
  editingServer?: APIServerConfig;
}

const APIServerBuilder: React.FC<APIServerBuilderProps> = ({
  isOpen,
  onClose,
  onSave,
  editingServer,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [serverConfig, setServerConfig] = useState<APIServerConfig>({
    id: "",
    name: "",
    description: "",
    baseUrl: "",
    endpoints: [],
    authentication: { type: "none", credentials: {} },
    globalHeaders: {},
    timeout: 30000,
    retries: 3,
    created: new Date(),
    updated: new Date(),
  });

  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importMethod, setImportMethod] = useState<"url" | "json">("url");
  const [jsonSpec, setJsonSpec] = useState("");

  // Testing state
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [testParameters, setTestParameters] = useState<
    Record<string, Record<string, any>>
  >({});
  const [testing, setTesting] = useState(false);

  const tabs = [
    { id: 0, name: "Templates", icon: DocumentTextIcon },
    { id: 1, name: "Basic Info", icon: CogIcon },
    { id: 2, name: "Import OpenAPI", icon: CloudArrowUpIcon },
    { id: 3, name: "Endpoints", icon: PlusIcon },
    { id: 4, name: "Authentication", icon: LockClosedIcon },
    { id: 5, name: "Advanced", icon: WrenchScrewdriverIcon },
    { id: 6, name: "Monitoring", icon: ChartBarIcon },
    { id: 7, name: "Testing", icon: BeakerIcon },
  ];

  useEffect(() => {
    if (editingServer) {
      setServerConfig(editingServer);
    } else {
      setServerConfig({
        id: `api-server-${Date.now()}`,
        name: "",
        description: "",
        baseUrl: "",
        endpoints: [],
        authentication: { type: "none", credentials: {} },
        globalHeaders: {},
        timeout: 30000,
        retries: 3,
        created: new Date(),
        updated: new Date(),
        // Initialize optional fields with proper defaults
        caching: {
          enabled: false,
          defaultTtl: 300,
          maxSize: 1000,
        },
        monitoring: {
          enabled: false,
          healthCheck: {
            endpoint: "/health",
            interval: 30,
          },
          metrics: {
            enabled: false,
            retention: 7,
          },
        },
        logging: {
          level: "info",
          requests: false,
          responses: false,
          errors: true,
        },
      });
    }
  }, [editingServer, isOpen]);

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) return;

    setImporting(true);
    setImportError("");
    try {
      const response = await fetch(importUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const spec = await response.json();

      // Extract basic info
      const newConfig = { ...serverConfig };
      if (spec.info?.title) {
        newConfig.name = spec.info.title;
        newConfig.description = spec.info.description || "";
      }

      // Extract base URL
      if (spec.servers?.[0]?.url) {
        newConfig.baseUrl = spec.servers[0].url;
      }

      // Extract endpoints
      if (spec.paths) {
        const endpoints: APIEndpoint[] = [];
        Object.entries(spec.paths).forEach(
          ([path, pathItem]: [string, any]) => {
            Object.entries(pathItem).forEach(
              ([method, operation]: [string, any]) => {
                if (
                  ["get", "post", "put", "delete", "patch"].includes(method)
                ) {
                  endpoints.push({
                    id: `endpoint-${Date.now()}-${Math.random()
                      .toString(36)
                      .substr(2, 9)}`,
                    path,
                    method: method.toUpperCase() as
                      | "GET"
                      | "POST"
                      | "PUT"
                      | "DELETE"
                      | "PATCH",
                    toolName:
                      operation.operationId ||
                      `${method}_${path.replace(/[^a-zA-Z0-9]/g, "_")}`,
                    description:
                      operation.summary ||
                      operation.description ||
                      `${method.toUpperCase()} ${path}`,
                    parameters:
                      operation.parameters?.map((p: any) => ({
                        name: p.name,
                        type: p.schema?.type || "string",
                        required: p.required || false,
                        description: p.description || "",
                      })) || [],
                    enabled: true,
                  });
                }
              }
            );
          }
        );
        newConfig.endpoints = [...newConfig.endpoints, ...endpoints];
      }

      setServerConfig(newConfig);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleImportFromJson = async () => {
    if (!jsonSpec.trim()) return;

    setImporting(true);
    setImportError("");
    try {
      const spec = JSON.parse(jsonSpec);

      // Extract basic info
      const newConfig = { ...serverConfig };
      if (spec.info?.title) {
        newConfig.name = spec.info.title;
        newConfig.description = spec.info.description || "";
      }

      // Extract base URL
      if (spec.servers?.[0]?.url) {
        newConfig.baseUrl = spec.servers[0].url;
      }

      // Extract endpoints
      if (spec.paths) {
        const endpoints: APIEndpoint[] = [];
        Object.entries(spec.paths).forEach(
          ([path, pathItem]: [string, any]) => {
            Object.entries(pathItem).forEach(
              ([method, operation]: [string, any]) => {
                if (
                  ["get", "post", "put", "delete", "patch"].includes(method)
                ) {
                  endpoints.push({
                    id: `endpoint-${Date.now()}-${Math.random()
                      .toString(36)
                      .substr(2, 9)}`,
                    path,
                    method: method.toUpperCase() as
                      | "GET"
                      | "POST"
                      | "PUT"
                      | "DELETE"
                      | "PATCH",
                    toolName:
                      operation.operationId ||
                      `${method}_${path.replace(/[^a-zA-Z0-9]/g, "_")}`,
                    description:
                      operation.summary ||
                      operation.description ||
                      `${method.toUpperCase()} ${path}`,
                    parameters:
                      operation.parameters?.map((p: any) => ({
                        name: p.name,
                        type: p.schema?.type || "string",
                        required: p.required || false,
                        description: p.description || "",
                      })) || [],
                    enabled: true,
                  });
                }
              }
            );
          }
        );
        newConfig.endpoints = [...newConfig.endpoints, ...endpoints];
      }

      setServerConfig(newConfig);
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Invalid JSON or import failed"
      );
    } finally {
      setImporting(false);
    }
  };

  const handleSave = () => {
    onSave(serverConfig);
    onClose();
  };

  // Template loading function
  const loadTemplate = (templateId: string) => {
    const template = API_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    const newConfig: APIServerConfig = {
      id: editingServer?.id || `api-server-${Date.now()}`,
      baseUrl: template.config.baseUrl || "https://api.example.com",
      name: template.config.name || "API Server",
      description: template.config.description || "",
      authentication: template.config.authentication || {
        type: "none",
        credentials: {},
      },
      endpoints: template.endpoints.map((endpoint) => ({
        ...endpoint,
        id: `endpoint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      })),
      globalHeaders: template.config.globalHeaders || {},
      timeout: template.config.timeout || 30000,
      retries: template.config.retries || 3,
      created: editingServer?.created || new Date(),
      updated: new Date(),
      // Add optional configurations if they exist in template
      ...(template.config.caching && { caching: template.config.caching }),
      ...(template.config.monitoring && {
        monitoring: template.config.monitoring,
      }),
      ...(template.config.logging && { logging: template.config.logging }),
      ...(template.config.rateLimit && {
        rateLimit: template.config.rateLimit,
      }),
    };

    setServerConfig(newConfig);
    setActiveTab(1); // Move to Basic Info tab
  };

  // Testing functions
  const updateTestParameter = (
    endpointId: string,
    paramName: string,
    value: any
  ) => {
    setTestParameters((prev) => ({
      ...prev,
      [endpointId]: {
        ...prev[endpointId],
        [paramName]: value,
      },
    }));
  };

  const testSingleEndpoint = async (endpoint: APIEndpoint) => {
    if (!serverConfig.baseUrl) return;

    setTesting(true);
    const startTime = Date.now();

    try {
      const params = testParameters[endpoint.id] || {};

      // Build URL
      let url = endpoint.path;
      if (endpoint.method === "GET" && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== "") {
            searchParams.append(key, String(value));
          }
        });
        url += "?" + searchParams.toString();
      }

      const fullUrl = new URL(url, serverConfig.baseUrl).toString();

      // Build headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...serverConfig.globalHeaders,
      };

      // Add authentication
      if (
        serverConfig.authentication.type === "bearer" &&
        serverConfig.authentication.credentials?.token
      ) {
        headers.Authorization = `Bearer ${serverConfig.authentication.credentials.token}`;
      } else if (
        serverConfig.authentication.type === "apikey" &&
        serverConfig.authentication.credentials?.apikey
      ) {
        const headerName =
          serverConfig.authentication.headerName || "X-API-Key";
        headers[headerName] = serverConfig.authentication.credentials.apikey;
      }

      // Make request
      const requestOptions: RequestInit = {
        method: endpoint.method,
        headers,
      };

      if (endpoint.method !== "GET" && Object.keys(params).length > 0) {
        requestOptions.body = JSON.stringify(params);
      }

      const response = await fetch(fullUrl, requestOptions);
      const responseTime = Date.now() - startTime;

      let data;
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }

      setTestResults((prev) => ({
        ...prev,
        [endpoint.id]: {
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          data,
          responseTime,
          timestamp: new Date(),
        },
      }));
    } catch (error) {
      const responseTime = Date.now() - startTime;
      setTestResults((prev) => ({
        ...prev,
        [endpoint.id]: {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          responseTime,
          timestamp: new Date(),
        },
      }));
    } finally {
      setTesting(false);
    }
  };

  const testAllEndpoints = async () => {
    if (!serverConfig.baseUrl || serverConfig.endpoints.length === 0) return;

    setTesting(true);
    const enabledEndpoints = serverConfig.endpoints.filter((e) => e.enabled);

    for (const endpoint of enabledEndpoints) {
      await testSingleEndpoint(endpoint);
      // Small delay between tests
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setTesting(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-slate-700/50 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {editingServer
                  ? "Edit API to MCP Server"
                  : "Create API to MCP Server"}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Convert REST API endpoints into MCP tools
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-700/50 bg-slate-800/30">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-blue-400 border-b-2 border-blue-400 bg-slate-800/50"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Templates Tab */}
            {activeTab === 0 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <DocumentTextIcon className="w-5 h-5" />
                  API Templates
                </h3>
                <p className="text-slate-400">
                  Start with a pre-configured template to quickly set up your
                  API server
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {API_TEMPLATES.map((template) => (
                    <div
                      key={template.id}
                      className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors cursor-pointer"
                      onClick={() => loadTemplate(template.id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <ServerIcon className="w-5 h-5 text-blue-400" />
                          <h4 className="font-medium text-white">
                            {template.name}
                          </h4>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded font-medium ${
                            template.category === "rest"
                              ? "bg-green-600/20 text-green-400"
                              : template.category === "graphql"
                              ? "bg-purple-600/20 text-purple-400"
                              : template.category === "webhook"
                              ? "bg-orange-600/20 text-orange-400"
                              : "bg-blue-600/20 text-blue-400"
                          }`}
                        >
                          {template.category}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mb-3">
                        {template.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {template.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 text-xs text-slate-500">
                        {template.endpoints.length} endpoint
                        {template.endpoints.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                  <h4 className="font-medium text-slate-300 mb-2">
                    Custom Configuration
                  </h4>
                  <p className="text-sm text-slate-400 mb-3">
                    Or start from scratch with a blank configuration
                  </p>
                  <button
                    onClick={() => setActiveTab(1)}
                    className="px-4 py-2 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
                  >
                    Start from Scratch
                  </button>
                </div>
              </div>
            )}

            {/* Basic Info Tab */}
            {activeTab === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Server Name *
                  </label>
                  <input
                    type="text"
                    value={serverConfig.name || ""}
                    onChange={(e) =>
                      setServerConfig({ ...serverConfig, name: e.target.value })
                    }
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="My API Server"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Base URL *
                  </label>
                  <input
                    type="url"
                    value={serverConfig.baseUrl || ""}
                    onChange={(e) =>
                      setServerConfig({
                        ...serverConfig,
                        baseUrl: e.target.value,
                      })
                    }
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="http://localhost:3001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={serverConfig.description || ""}
                    onChange={(e) =>
                      setServerConfig({
                        ...serverConfig,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Describe what this API server does..."
                  />
                </div>
              </div>
            )}

            {/* Import OpenAPI Tab */}
            {activeTab === 2 && (
              <div className="space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-300 mb-2">
                    Import from OpenAPI/Swagger
                  </h4>
                  <p className="text-xs text-blue-200/80">
                    Import your OpenAPI specification from a URL or paste JSON
                    directly to automatically generate endpoints.
                  </p>
                </div>

                {/* Import Method Selector */}
                <div className="flex gap-2 p-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <button
                    onClick={() => setImportMethod("url")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      importMethod === "url"
                        ? "bg-blue-600 text-white shadow-lg"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    }`}
                  >
                    <LinkIcon className="w-4 h-4" />
                    From URL
                  </button>
                  <button
                    onClick={() => setImportMethod("json")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      importMethod === "json"
                        ? "bg-blue-600 text-white shadow-lg"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    }`}
                  >
                    <DocumentTextIcon className="w-4 h-4" />
                    Paste JSON
                  </button>
                </div>

                {/* URL Import */}
                {importMethod === "url" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      OpenAPI Spec URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="http://localhost:3001/openapi.json"
                      />
                      <button
                        onClick={handleImportFromUrl}
                        disabled={!importUrl.trim() || importing}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        {importing ? (
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                          <LinkIcon className="w-4 h-4" />
                        )}
                        Import
                      </button>
                    </div>
                  </div>
                )}

                {/* JSON Import */}
                {importMethod === "json" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      OpenAPI JSON Specification
                    </label>
                    <div className="space-y-3">
                      <textarea
                        value={jsonSpec}
                        onChange={(e) => setJsonSpec(e.target.value)}
                        className="w-full h-64 bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        placeholder={`{
  "openapi": "3.0.0",
  "info": {
    "title": "My API",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://api.example.com"
    }
  ],
  "paths": {
    "/users": {
      "get": {
        "summary": "Get users",
        "operationId": "getUsers"
      }
    }
  }
}`}
                      />
                      <button
                        onClick={handleImportFromJson}
                        disabled={!jsonSpec.trim() || importing}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        {importing ? (
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                          <DocumentTextIcon className="w-4 h-4" />
                        )}
                        Import from JSON
                      </button>
                    </div>
                  </div>
                )}

                {importError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <p className="text-sm text-red-300">{importError}</p>
                  </div>
                )}
              </div>
            )}

            {/* Endpoints Tab */}
            {activeTab === 3 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">
                    API Endpoints
                  </h3>
                  <p className="text-sm text-slate-400">
                    {serverConfig.endpoints?.length || 0} endpoints configured
                  </p>
                </div>

                {serverConfig.endpoints && serverConfig.endpoints.length > 0 ? (
                  <div className="space-y-4">
                    {serverConfig.endpoints.map((endpoint) => (
                      <div
                        key={endpoint.id}
                        className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              endpoint.method === "GET"
                                ? "bg-green-500/20 text-green-400"
                                : endpoint.method === "POST"
                                ? "bg-blue-500/20 text-blue-400"
                                : endpoint.method === "PUT"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : endpoint.method === "DELETE"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-gray-500/20 text-gray-400"
                            }`}
                          >
                            {endpoint.method}
                          </span>
                          <span className="text-white font-mono">
                            {endpoint.path}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300">
                          {endpoint.description}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Tool: {endpoint.toolName}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <PlusIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No endpoints configured</p>
                    <p className="text-sm">
                      Import from OpenAPI spec to get started
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Authentication Tab */}
            {activeTab === 4 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">
                  Authentication
                </h3>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Authentication Type
                  </label>
                  <select
                    value={serverConfig.authentication?.type || "none"}
                    onChange={(e) =>
                      setServerConfig({
                        ...serverConfig,
                        authentication: {
                          type: e.target.value as any,
                          credentials: {},
                        },
                      })
                    }
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white"
                  >
                    <option value="none">No Authentication</option>
                    <option value="apikey">API Key</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth</option>
                  </select>
                </div>

                {serverConfig.authentication?.type === "apikey" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        API Key
                      </label>
                      <input
                        type="password"
                        value={
                          serverConfig.authentication.credentials?.apikey || ""
                        }
                        onChange={(e) =>
                          setServerConfig({
                            ...serverConfig,
                            authentication: {
                              ...serverConfig.authentication!,
                              credentials: {
                                ...serverConfig.authentication!.credentials,
                                apikey: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="test-api-key-123"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Header Name
                      </label>
                      <input
                        type="text"
                        value={
                          serverConfig.authentication.headerName || "X-API-Key"
                        }
                        onChange={(e) =>
                          setServerConfig({
                            ...serverConfig,
                            authentication: {
                              ...serverConfig.authentication!,
                              headerName: e.target.value,
                            },
                          })
                        }
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="X-API-Key"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 5 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">
                  Advanced Configuration
                </h3>

                {/* Rate Limiting */}
                <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">
                    Rate Limiting
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Requests per window
                      </label>
                      <input
                        type="number"
                        value={serverConfig.rateLimit?.requests || 100}
                        onChange={(e) =>
                          setServerConfig({
                            ...serverConfig,
                            rateLimit: {
                              ...serverConfig.rateLimit,
                              requests: parseInt(e.target.value),
                              windowMs:
                                serverConfig.rateLimit?.windowMs || 60000,
                            },
                          })
                        }
                        className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white text-sm"
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Window (ms)
                      </label>
                      <input
                        type="number"
                        value={serverConfig.rateLimit?.windowMs || 60000}
                        onChange={(e) =>
                          setServerConfig({
                            ...serverConfig,
                            rateLimit: {
                              ...serverConfig.rateLimit,
                              windowMs: parseInt(e.target.value),
                              requests: serverConfig.rateLimit?.requests || 100,
                            },
                          })
                        }
                        className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white text-sm"
                        placeholder="60000"
                      />
                    </div>
                  </div>
                </div>

                {/* Timeout & Retries */}
                <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">
                    Request Settings
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Timeout (ms)
                      </label>
                      <input
                        type="number"
                        value={serverConfig.timeout || 30000}
                        onChange={(e) =>
                          setServerConfig({
                            ...serverConfig,
                            timeout: parseInt(e.target.value),
                          })
                        }
                        className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white text-sm"
                        placeholder="30000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Max Retries
                      </label>
                      <input
                        type="number"
                        value={serverConfig.retries || 3}
                        onChange={(e) =>
                          setServerConfig({
                            ...serverConfig,
                            retries: parseInt(e.target.value),
                          })
                        }
                        className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white text-sm"
                        placeholder="3"
                      />
                    </div>
                  </div>
                </div>

                {/* Caching */}
                <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">
                    Caching
                  </h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={serverConfig.caching?.enabled || false}
                        onChange={(e) =>
                          setServerConfig({
                            ...serverConfig,
                            caching: {
                              ...serverConfig.caching,
                              enabled: e.target.checked,
                            },
                          })
                        }
                        className="rounded"
                      />
                      <span className="text-sm text-slate-300">
                        Enable caching
                      </span>
                    </label>
                    {serverConfig.caching?.enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
                            Default TTL (seconds)
                          </label>
                          <input
                            type="number"
                            value={serverConfig.caching?.defaultTtl || 300}
                            onChange={(e) =>
                              setServerConfig({
                                ...serverConfig,
                                caching: {
                                  enabled:
                                    serverConfig.caching?.enabled || false,
                                  defaultTtl: parseInt(e.target.value),
                                  maxSize:
                                    serverConfig.caching?.maxSize || 1000,
                                },
                              })
                            }
                            className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white text-sm"
                            placeholder="300"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
                            Max cache size (MB)
                          </label>
                          <input
                            type="number"
                            value={serverConfig.caching?.maxSize || 100}
                            onChange={(e) =>
                              setServerConfig({
                                ...serverConfig,
                                caching: {
                                  enabled:
                                    serverConfig.caching?.enabled || false,
                                  defaultTtl:
                                    serverConfig.caching?.defaultTtl || 300,
                                  maxSize: parseInt(e.target.value),
                                },
                              })
                            }
                            className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white text-sm"
                            placeholder="100"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Monitoring Tab */}
            {activeTab === 6 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">
                  Monitoring & Logging
                </h3>

                {/* Health Monitoring */}
                <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">
                    Health Monitoring
                  </h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={serverConfig.monitoring?.enabled || false}
                        onChange={(e) =>
                          setServerConfig({
                            ...serverConfig,
                            monitoring: {
                              ...serverConfig.monitoring,
                              enabled: e.target.checked,
                            },
                          })
                        }
                        className="rounded"
                      />
                      <span className="text-sm text-slate-300">
                        Enable health monitoring
                      </span>
                    </label>
                    {serverConfig.monitoring?.enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
                            Health check endpoint
                          </label>
                          <input
                            type="text"
                            value={
                              serverConfig.monitoring?.healthCheck?.endpoint ||
                              "/health"
                            }
                            onChange={(e) =>
                              setServerConfig({
                                ...serverConfig,
                                monitoring: {
                                  enabled:
                                    serverConfig.monitoring?.enabled || false,
                                  healthCheck: {
                                    endpoint: e.target.value,
                                    interval:
                                      serverConfig.monitoring?.healthCheck
                                        ?.interval || 30,
                                  },
                                  metrics: serverConfig.monitoring?.metrics || {
                                    enabled: false,
                                    retention: 7,
                                  },
                                },
                              })
                            }
                            className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white text-sm"
                            placeholder="/health"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
                            Check interval (seconds)
                          </label>
                          <input
                            type="number"
                            value={
                              serverConfig.monitoring?.healthCheck?.interval ||
                              30
                            }
                            onChange={(e) =>
                              setServerConfig({
                                ...serverConfig,
                                monitoring: {
                                  enabled:
                                    serverConfig.monitoring?.enabled || false,
                                  healthCheck: {
                                    endpoint:
                                      serverConfig.monitoring?.healthCheck
                                        ?.endpoint || "/health",
                                    interval: parseInt(e.target.value),
                                  },
                                  metrics: serverConfig.monitoring?.metrics || {
                                    enabled: false,
                                    retention: 7,
                                  },
                                },
                              })
                            }
                            className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white text-sm"
                            placeholder="30"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Logging */}
                <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">
                    Logging
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Log Level
                      </label>
                      <select
                        value={serverConfig.logging?.level || "info"}
                        onChange={(e) =>
                          setServerConfig({
                            ...serverConfig,
                            logging: {
                              level: e.target.value as
                                | "debug"
                                | "info"
                                | "warn"
                                | "error",
                              requests: serverConfig.logging?.requests || false,
                              responses:
                                serverConfig.logging?.responses || false,
                              errors: serverConfig.logging?.errors || true,
                            },
                          })
                        }
                        className="w-full bg-slate-700/50 border border-slate-600/50 rounded px-3 py-2 text-white text-sm"
                      >
                        <option value="debug">Debug</option>
                        <option value="info">Info</option>
                        <option value="warn">Warning</option>
                        <option value="error">Error</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={serverConfig.logging?.requests || false}
                          onChange={(e) =>
                            setServerConfig({
                              ...serverConfig,
                              logging: {
                                level: serverConfig.logging?.level || "info",
                                requests: e.target.checked,
                                responses:
                                  serverConfig.logging?.responses || false,
                                errors: serverConfig.logging?.errors || true,
                              },
                            })
                          }
                          className="rounded"
                        />
                        <span className="text-xs text-slate-300">
                          Log requests
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={serverConfig.logging?.responses || false}
                          onChange={(e) =>
                            setServerConfig({
                              ...serverConfig,
                              logging: {
                                level: serverConfig.logging?.level || "info",
                                requests:
                                  serverConfig.logging?.requests || false,
                                responses: e.target.checked,
                                errors: serverConfig.logging?.errors || true,
                              },
                            })
                          }
                          className="rounded"
                        />
                        <span className="text-xs text-slate-300">
                          Log responses
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={serverConfig.logging?.errors || true}
                          onChange={(e) =>
                            setServerConfig({
                              ...serverConfig,
                              logging: {
                                level: serverConfig.logging?.level || "info",
                                requests:
                                  serverConfig.logging?.requests || false,
                                responses:
                                  serverConfig.logging?.responses || false,
                                errors: e.target.checked,
                              },
                            })
                          }
                          className="rounded"
                        />
                        <span className="text-xs text-slate-300">
                          Log errors
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Testing Tab */}
            {activeTab === 7 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <BeakerIcon className="w-5 h-5" />
                  Endpoint Testing
                </h3>

                <div className="space-y-4">
                  {/* Test All Endpoints */}
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-slate-300">
                        Test All Endpoints
                      </h4>
                      <button
                        onClick={() => testAllEndpoints()}
                        disabled={
                          !serverConfig.baseUrl ||
                          serverConfig.endpoints.length === 0 ||
                          testing
                        }
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {testing && (
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        )}
                        Run All Tests
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">
                      Tests all enabled endpoints with sample data
                    </p>
                  </div>

                  {/* Individual Endpoint Tests */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-slate-300">
                      Individual Endpoint Tests
                    </h4>
                    {serverConfig.endpoints.filter((e) => e.enabled).length ===
                    0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <BeakerIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No enabled endpoints to test</p>
                        <p className="text-xs">
                          Add and enable endpoints in the Endpoints tab
                        </p>
                      </div>
                    ) : (
                      serverConfig.endpoints
                        .filter((e) => e.enabled)
                        .map((endpoint) => (
                          <div
                            key={endpoint.id}
                            className="bg-slate-800/50 p-4 rounded-lg border border-slate-700"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded ${
                                    endpoint.method === "GET"
                                      ? "bg-green-600 text-white"
                                      : endpoint.method === "POST"
                                      ? "bg-blue-600 text-white"
                                      : endpoint.method === "PUT"
                                      ? "bg-yellow-600 text-white"
                                      : endpoint.method === "DELETE"
                                      ? "bg-red-600 text-white"
                                      : "bg-purple-600 text-white"
                                  }`}
                                >
                                  {endpoint.method}
                                </span>
                                <span className="text-sm text-slate-300 font-mono">
                                  {endpoint.path}
                                </span>
                              </div>
                              <button
                                onClick={() => testSingleEndpoint(endpoint)}
                                disabled={testing}
                                className="px-3 py-1 bg-slate-700 text-slate-300 text-sm rounded hover:bg-slate-600 disabled:opacity-50 flex items-center gap-2"
                              >
                                {testing && (
                                  <ArrowPathIcon className="w-3 h-3 animate-spin" />
                                )}
                                Test
                              </button>
                            </div>
                            <p className="text-xs text-slate-400 mb-2">
                              {endpoint.description}
                            </p>

                            {/* Test Parameters */}
                            {endpoint.parameters.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <h5 className="text-xs font-medium text-slate-400">
                                  Test Parameters:
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {endpoint.parameters.map((param) => (
                                    <div
                                      key={param.name}
                                      className="flex items-center gap-2"
                                    >
                                      <label className="text-xs text-slate-400 min-w-[80px] text-right">
                                        {param.name}{" "}
                                        {param.required && (
                                          <span className="text-red-400">
                                            *
                                          </span>
                                        )}
                                        :
                                      </label>
                                      <input
                                        type={
                                          param.type === "number"
                                            ? "number"
                                            : "text"
                                        }
                                        placeholder={
                                          param.example?.toString() ||
                                          `Enter ${param.name}`
                                        }
                                        className="px-2 py-1 bg-slate-900 border border-slate-600 rounded text-xs text-white flex-1"
                                        onChange={(e) =>
                                          updateTestParameter(
                                            endpoint.id,
                                            param.name,
                                            e.target.value
                                          )
                                        }
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Test Results */}
                            {testResults[endpoint.id] && (
                              <div className="mt-3 p-3 bg-slate-900 rounded border border-slate-600">
                                <div className="flex items-center gap-2 mb-2">
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      testResults[endpoint.id].success
                                        ? "bg-green-500"
                                        : "bg-red-500"
                                    }`}
                                  ></span>
                                  <span className="text-xs font-medium text-slate-300">
                                    {testResults[endpoint.id].success
                                      ? "Success"
                                      : "Failed"}
                                  </span>
                                  {testResults[endpoint.id].status && (
                                    <span className="text-xs text-slate-400">
                                      ({testResults[endpoint.id].status})
                                    </span>
                                  )}
                                  <span className="text-xs text-slate-400">
                                    {testResults[endpoint.id].responseTime}ms
                                  </span>
                                  <span className="ml-auto text-xs text-slate-500">
                                    {new Date(
                                      testResults[endpoint.id].timestamp
                                    ).toLocaleTimeString()}
                                  </span>
                                </div>
                                <pre className="text-xs text-slate-300 overflow-auto max-h-32 bg-slate-800 p-2 rounded">
                                  {testResults[endpoint.id].error ||
                                    JSON.stringify(
                                      testResults[endpoint.id].data,
                                      null,
                                      2
                                    )}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700/50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!serverConfig.name || !serverConfig.baseUrl}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {editingServer ? "Update Server" : "Create Server"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default APIServerBuilder;
