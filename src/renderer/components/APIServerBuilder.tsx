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
  MagnifyingGlassIcon,
  BoltIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import {
  APIServerConfig,
  APIEndpoint,
  APIAuthentication,
} from "../../shared/apiServerTypes";
import { API_TEMPLATES } from "../../shared/apiTemplates";
import { PublicAPISpec } from "../../shared/publicApiTypes";
import PrivateAPIService from "../services/PrivateAPIService";
import APIDiscoveryService from "../services/APIDiscoveryService";
import PostmanCollectionService from "../services/PostmanCollectionService";
import { OAuth2FlowComponent } from "./OAuth2FlowComponent";

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

  // Postman Collection import state
  const [postmanCollectionJson, setPostmanCollectionJson] = useState("");
  const [postmanImporting, setPostmanImporting] = useState(false);
  const [postmanImportError, setPostmanImportError] = useState("");
  const [postmanImportMethod, setPostmanImportMethod] = useState<
    "url" | "json" | "file"
  >("json");
  const [postmanUrl, setPostmanUrl] = useState("");

  // Testing state
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [testParameters, setTestParameters] = useState<
    Record<string, Record<string, any>>
  >({});
  const [testing, setTesting] = useState(false);

  // Private API discovery state
  const [discoveryUrl, setDiscoveryUrl] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discoveryResults, setDiscoveryResults] =
    useState<PublicAPISpec | null>(null);
  const [discoveryError, setDiscoveryError] = useState("");

  // Auto-configuration state
  const [autoConfiguring, setAutoConfiguring] = useState(false);
  const [autoConfigResults, setAutoConfigResults] = useState<{
    suggested: APIServerConfig | null;
    detected: any;
  }>({ suggested: null, detected: null });

  const tabs = [
    { id: 0, name: "Templates", icon: DocumentTextIcon },
    { id: 1, name: "Basic Info", icon: CogIcon },
    { id: 2, name: "Import OpenAPI", icon: CloudArrowUpIcon },
    { id: 3, name: "Import Postman", icon: ServerIcon },
    { id: 4, name: "Discover API", icon: MagnifyingGlassIcon },
    { id: 5, name: "Auto-Config", icon: BoltIcon },
    { id: 6, name: "Endpoints", icon: PlusIcon },
    { id: 7, name: "Authentication", icon: LockClosedIcon },
    { id: 8, name: "Advanced", icon: WrenchScrewdriverIcon },
    { id: 9, name: "Monitoring", icon: ChartBarIcon },
    { id: 10, name: "Testing", icon: BeakerIcon },
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

  // Helper function to resolve $ref parameters
  const resolveParameter = (param: any, spec: any) => {
    if (param.$ref) {
      // Extract the reference path (e.g., "#/components/parameters/PathAlbumId")
      const refPath = param.$ref.replace("#/", "").split("/");
      let resolved = spec;

      // Navigate to the referenced parameter
      for (const segment of refPath) {
        resolved = resolved?.[segment];
      }

      return resolved;
    }

    // If not a reference, return the parameter as-is
    return param;
  };

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
        newConfig.name = spec.info.title.includes("API")
          ? spec.info.title
          : `${spec.info.title} API Server`;
        newConfig.description =
          spec.info.description || `MCP server for ${spec.info.title} API`;
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
                      operation.parameters?.map((p: any) => {
                        const resolvedParam = resolveParameter(p, spec);
                        return {
                          name: resolvedParam.name,
                          type: resolvedParam.schema?.type || "string",
                          required: resolvedParam.required || false,
                          description: resolvedParam.description || "",
                        };
                      }) || [],
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
        newConfig.name = spec.info.title.includes("API")
          ? spec.info.title
          : `${spec.info.title} API Server`;
        newConfig.description =
          spec.info.description || `MCP server for ${spec.info.title} API`;
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
                      operation.parameters?.map((p: any) => {
                        const resolvedParam = resolveParameter(p, spec);
                        return {
                          name: resolvedParam.name,
                          type: resolvedParam.schema?.type || "string",
                          required: resolvedParam.required || false,
                          description: resolvedParam.description || "",
                        };
                      }) || [],
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

  // Postman Collection Import Handlers
  const handleImportFromPostmanJson = async () => {
    if (!postmanCollectionJson.trim()) return;

    setPostmanImporting(true);
    setPostmanImportError("");
    try {
      const postmanService = PostmanCollectionService.getInstance();

      // Validate the collection first
      const parsed = JSON.parse(postmanCollectionJson);
      const validation = postmanService.validateCollection(parsed);

      if (!validation.isValid) {
        throw new Error(
          `Invalid Postman collection: ${validation.errors.join(", ")}`
        );
      }

      // Show warnings if any
      if (validation.warnings.length > 0) {
        console.warn("Postman import warnings:", validation.warnings);
      }

      // Parse the collection
      const newConfig = postmanService.parsePostmanCollection(
        postmanCollectionJson
      );

      // Merge with existing config, preserving user changes
      setServerConfig((prev) => ({
        ...newConfig,
        id: prev.id || newConfig.id,
        created: prev.created || newConfig.created,
      }));

      setPostmanImportError("");
      setActiveTab(1); // Switch to Basic Info tab to show imported data
    } catch (error) {
      setPostmanImportError(
        error instanceof Error
          ? error.message
          : "Failed to parse Postman collection"
      );
    } finally {
      setPostmanImporting(false);
    }
  };

  const handleImportFromPostmanUrl = async () => {
    if (!postmanUrl.trim()) return;

    setPostmanImporting(true);
    setPostmanImportError("");
    try {
      const response = await fetch(postmanUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch Postman collection: ${response.status}`
        );
      }

      const collectionJson = await response.text();
      setPostmanCollectionJson(collectionJson);

      // Auto-import after fetching
      const postmanService = PostmanCollectionService.getInstance();
      const newConfig = postmanService.parsePostmanCollection(collectionJson);

      setServerConfig((prev) => ({
        ...newConfig,
        id: prev.id || newConfig.id,
        created: prev.created || newConfig.created,
      }));

      setActiveTab(1); // Switch to Basic Info tab
    } catch (error) {
      setPostmanImportError(
        error instanceof Error
          ? error.message
          : "Failed to fetch or parse Postman collection"
      );
    } finally {
      setPostmanImporting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setPostmanCollectionJson(content);
    };
    reader.onerror = () => {
      setPostmanImportError("Failed to read file");
    };
    reader.readAsText(file);
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

  // Private API discovery handler
  const handleDiscoverAPI = async () => {
    if (!discoveryUrl.trim()) return;

    setDiscovering(true);
    setDiscoveryError("");
    setDiscoveryResults(null);

    try {
      const result = await APIDiscoveryService.discoverAPI(discoveryUrl, {
        includeAuth: true,
        validateEndpoints: true,
      });

      if (result.api) {
        setDiscoveryResults(result.api);

        // Optionally auto-populate the server config with discovered info
        setServerConfig((prev) => ({
          ...prev,
          name: result.api?.name || prev.name,
          description: result.api?.description || prev.description,
          baseUrl: result.api?.baseUrl || prev.baseUrl,
        }));
      }
    } catch (error) {
      setDiscoveryError(
        error instanceof Error ? error.message : "API discovery failed"
      );
    } finally {
      setDiscovering(false);
    }
  };

  // Auto-configuration handler
  const handleAutoConfig = async () => {
    if (!serverConfig.baseUrl.trim()) return;

    setAutoConfiguring(true);
    try {
      // First discover the API
      const discoveryResult = await APIDiscoveryService.discoverAPI(
        serverConfig.baseUrl,
        {
          includeAuth: true,
          validateEndpoints: true,
        }
      );

      if (discoveryResult.api) {
        // Then auto-configure it
        const configResult = await APIDiscoveryService.autoConfigureAPIServer(
          discoveryResult.api,
          {
            includeAuth: true,
            validateEndpoints: true,
            generateDocs: true,
          }
        );

        setAutoConfigResults({
          suggested: configResult,
          detected: discoveryResult,
        });

        // Optionally apply the suggested configuration
        if (configResult) {
          setServerConfig(configResult);
        }
      }
    } catch (error) {
      console.error("Auto-configuration failed:", error);
    } finally {
      setAutoConfiguring(false);
    }
  };

  // Apply discovered configuration
  const applyDiscoveredConfig = () => {
    if (!discoveryResults) return;

    const newConfig: APIServerConfig = {
      ...serverConfig,
      name: discoveryResults.name || serverConfig.name,
      description: discoveryResults.description || serverConfig.description,
      baseUrl: discoveryResults.baseUrl || serverConfig.baseUrl,
      endpoints:
        discoveryResults.endpoints?.map((endpoint) => ({
          id: `endpoint-${Date.now()}-${Math.random()}`,
          path: endpoint.path,
          method: endpoint.method as any,
          toolName:
            endpoint.summary ||
            `${endpoint.method}_${endpoint.path.replace(/[^a-zA-Z0-9]/g, "_")}`,
          description:
            endpoint.description ||
            endpoint.summary ||
            `${endpoint.method} ${endpoint.path}`,
          parameters:
            endpoint.parameters?.map((param) => ({
              name: param.name,
              type: param.type === "integer" ? "number" : (param.type as any),
              required: param.required,
              description: param.description || "",
            })) || [],
          enabled: true,
        })) || serverConfig.endpoints,
    };

    if (
      discoveryResults.authentication &&
      discoveryResults.authentication.type !== "none"
    ) {
      // Convert PublicAPISpec authentication to APIServerConfig authentication
      const convertedAuth: APIAuthentication = {
        type:
          discoveryResults.authentication.type === "apiKey"
            ? "apikey"
            : (discoveryResults.authentication.type as any),
        credentials: discoveryResults.authentication.testCredentials || {},
      };

      // Add specific conversion logic for different auth types
      switch (discoveryResults.authentication.type) {
        case "apiKey":
          convertedAuth.headerName = discoveryResults.authentication.keyName;
          break;
        case "oauth2":
          convertedAuth.oauth2 = {
            scopes: discoveryResults.authentication.scopes,
            flow: discoveryResults.authentication.flow as any,
          };
          break;
      }

      newConfig.authentication = convertedAuth;
    }

    setServerConfig(newConfig);
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

            {/* Import Postman Collection Tab */}
            {activeTab === 3 && (
              <div className="space-y-6">
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-indigo-300 mb-2">
                    Import from Postman Collection
                  </h4>
                  <p className="text-xs text-indigo-200/80">
                    Import your Postman Collection v2.1 JSON from a URL, file
                    upload, or paste JSON directly to automatically generate
                    endpoints with authentication, parameters, and request body
                    schemas.
                  </p>
                </div>

                {/* Import Method Selector */}
                <div className="flex gap-2 p-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <button
                    onClick={() => setPostmanImportMethod("json")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      postmanImportMethod === "json"
                        ? "bg-indigo-600 text-white shadow-lg"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    }`}
                  >
                    <DocumentTextIcon className="w-4 h-4" />
                    Paste JSON
                  </button>
                  <button
                    onClick={() => setPostmanImportMethod("url")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      postmanImportMethod === "url"
                        ? "bg-indigo-600 text-white shadow-lg"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    }`}
                  >
                    <LinkIcon className="w-4 h-4" />
                    From URL
                  </button>
                  <button
                    onClick={() => setPostmanImportMethod("file")}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      postmanImportMethod === "file"
                        ? "bg-indigo-600 text-white shadow-lg"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    }`}
                  >
                    <CloudArrowUpIcon className="w-4 h-4" />
                    Upload File
                  </button>
                </div>

                {/* JSON Import */}
                {postmanImportMethod === "json" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Postman Collection JSON
                    </label>
                    <div className="space-y-3">
                      <textarea
                        value={postmanCollectionJson}
                        onChange={(e) =>
                          setPostmanCollectionJson(e.target.value)
                        }
                        className="w-full h-64 bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                        placeholder={`{
  "info": {
    "name": "My API Collection",
    "description": "A collection of API endpoints",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get Users",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{baseUrl}}/api/users",
          "host": ["{{baseUrl}}"],
          "path": ["api", "users"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "https://api.example.com"
    }
  ]
}`}
                      />
                      <button
                        onClick={handleImportFromPostmanJson}
                        disabled={
                          !postmanCollectionJson.trim() || postmanImporting
                        }
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        {postmanImporting ? (
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                          <DocumentTextIcon className="w-4 h-4" />
                        )}
                        Import Collection
                      </button>
                    </div>
                  </div>
                )}

                {/* URL Import */}
                {postmanImportMethod === "url" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Postman Collection URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={postmanUrl}
                        onChange={(e) => setPostmanUrl(e.target.value)}
                        className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="https://api.postman.com/collections/your-collection-id"
                      />
                      <button
                        onClick={handleImportFromPostmanUrl}
                        disabled={!postmanUrl.trim() || postmanImporting}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        {postmanImporting ? (
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                          <LinkIcon className="w-4 h-4" />
                        )}
                        Import
                      </button>
                    </div>
                  </div>
                )}

                {/* File Upload */}
                {postmanImportMethod === "file" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Upload Postman Collection File
                    </label>
                    <div className="space-y-3">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                      />
                      {postmanCollectionJson && (
                        <button
                          onClick={handleImportFromPostmanJson}
                          disabled={postmanImporting}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                          {postmanImporting ? (
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                          ) : (
                            <CloudArrowUpIcon className="w-4 h-4" />
                          )}
                          Import Collection
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {postmanImportError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <p className="text-sm text-red-300">{postmanImportError}</p>
                  </div>
                )}

                {/* Tips for Postman Collections */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-300 mb-2">
                    Tips for importing Postman Collections
                  </h4>
                  <ul className="text-xs text-blue-200/80 space-y-1">
                    <li>
                      • Ensure your collection uses Postman Collection v2.1
                      format
                    </li>
                    <li>
                      • Set up collection variables (like baseUrl) for easier
                      configuration
                    </li>
                    <li>
                      • Add authentication at the collection level for automatic
                      setup
                    </li>
                    <li>
                      • Use descriptive names for requests - they become tool
                      names
                    </li>
                    <li>• Organize requests in folders for better structure</li>
                    <li>
                      • Include request descriptions for better documentation
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Discover API Tab */}
            {activeTab === 4 && (
              <div className="space-y-6">
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-purple-300 mb-2">
                    <MagnifyingGlassIcon className="w-4 h-4 inline mr-2" />
                    Advanced API Discovery
                  </h4>
                  <p className="text-xs text-purple-200/80 mb-3">
                    Discover and analyze API endpoints without automatic
                    configuration. Perfect for exploring APIs before setting up
                    MCP servers.
                  </p>
                  <ul className="text-xs text-purple-200/60 space-y-1">
                    <li>• Comprehensive endpoint scanning and detection</li>
                    <li>• Response analysis for additional endpoint hints</li>
                    <li>• Domain-specific pattern recognition</li>
                    <li>• Multiple HTTP method discovery</li>
                    <li>• Authentication method detection</li>
                    <li>• Documentation and spec analysis</li>
                  </ul>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    API Base URL *
                  </label>
                  <input
                    type="url"
                    value={discoveryUrl}
                    onChange={(e) => setDiscoveryUrl(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="https://official-joke-api.appspot.com"
                  />
                </div>

                <button
                  onClick={handleDiscoverAPI}
                  disabled={!discoveryUrl.trim() || discovering}
                  className="w-full bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 hover:border-purple-500/50 text-purple-300 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {discovering ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Analyzing & Discovering...
                    </>
                  ) : (
                    <>
                      <MagnifyingGlassIcon className="w-4 h-4" />
                      Discover API Endpoints
                    </>
                  )}
                </button>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-300 mb-2">
                    Difference from Auto-Config:
                  </h4>
                  <div className="space-y-2 text-xs text-blue-200/80">
                    <div>
                      • <strong>Discover API:</strong> Only finds and lists
                      endpoints without creating MCP configuration
                    </div>
                    <div>
                      • <strong>Auto-Config:</strong> Discovers endpoints AND
                      automatically creates a complete MCP server configuration
                    </div>
                  </div>
                  <p className="text-xs text-blue-200/60 mt-2">
                    Use "Discover API" when you want to explore what's available
                    before configuring.
                  </p>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-300 mb-2">
                    💡 Pro Tip:
                  </h4>
                  <p className="text-xs text-green-200/80">
                    After discovery, you can review the found endpoints and then
                    click "Apply to Configuration" to add them to your MCP
                    server setup, or switch to the "Auto-Config" tab for a
                    complete automated setup.
                  </p>
                </div>

                {discoveryError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <p className="text-sm text-red-300">{discoveryError}</p>
                  </div>
                )}

                {discoveryResults && (
                  <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-slate-300">
                        Discovery Results
                      </h4>
                      <button
                        onClick={applyDiscoveredConfig}
                        className="bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 px-3 py-1 rounded text-xs font-medium transition-colors"
                      >
                        Apply to Configuration
                      </button>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-400">API Name:</span>{" "}
                          <span className="text-white">
                            {discoveryResults.name || "Unknown API"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Base URL:</span>{" "}
                          <span className="text-white">
                            {discoveryResults.baseUrl}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">
                            Endpoints Found:
                          </span>{" "}
                          <span className="text-green-300">
                            {discoveryResults.endpoints?.length || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">
                            Authentication:
                          </span>{" "}
                          <span className="text-blue-300">
                            {discoveryResults.authentication?.type ||
                              "None detected"}
                          </span>
                        </div>
                      </div>

                      {discoveryResults.description && (
                        <div>
                          <span className="text-slate-400">Description:</span>{" "}
                          <span className="text-slate-300">
                            {discoveryResults.description}
                          </span>
                        </div>
                      )}

                      {discoveryResults.endpoints &&
                        discoveryResults.endpoints.length > 0 && (
                          <div>
                            <span className="text-slate-400 block mb-2">
                              Discovered Endpoints:
                            </span>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                              {discoveryResults.endpoints
                                .slice(0, 10)
                                .map((endpoint, index) => (
                                  <div
                                    key={index}
                                    className="bg-slate-700/30 rounded px-2 py-1 text-xs"
                                  >
                                    <span className="text-blue-300 font-mono">
                                      {endpoint.method}
                                    </span>{" "}
                                    <span className="text-slate-200">
                                      {endpoint.path}
                                    </span>
                                    {endpoint.summary && (
                                      <span className="text-slate-400 ml-2">
                                        - {endpoint.summary}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              {discoveryResults.endpoints.length > 10 && (
                                <div className="text-xs text-slate-400 italic">
                                  ... and{" "}
                                  {discoveryResults.endpoints.length - 10} more
                                  endpoints
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Auto-Config Tab */}
            {activeTab === 5 && (
              <div className="space-y-6">
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-orange-300 mb-2">
                    <BoltIcon className="w-4 h-4 inline mr-2" />
                    Intelligent Auto-Configuration
                  </h4>
                  <p className="text-xs text-orange-200/80 mb-3">
                    Automatically analyze and configure your API server using
                    advanced discovery techniques:
                  </p>
                  <ul className="text-xs text-orange-200/60 space-y-1">
                    <li>• OpenAPI/Swagger specification detection</li>
                    <li>• Robots.txt and sitemap analysis</li>
                    <li>• Response content analysis for endpoint hints</li>
                    <li>
                      • Domain-specific pattern matching (jokes, weather, news
                      APIs)
                    </li>
                    <li>• HTTP method discovery via OPTIONS requests</li>
                    <li>• Documentation parsing for API structure</li>
                  </ul>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    API Base URL
                  </label>
                  <input
                    type="url"
                    value={serverConfig.baseUrl}
                    onChange={(e) =>
                      setServerConfig({
                        ...serverConfig,
                        baseUrl: e.target.value,
                      })
                    }
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="https://api.example.com"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Auto-configuration will use this URL to discover API
                    capabilities
                  </p>
                </div>

                <button
                  onClick={handleAutoConfig}
                  disabled={!serverConfig.baseUrl.trim() || autoConfiguring}
                  className="w-full bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 hover:border-orange-500/50 text-orange-300 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {autoConfiguring ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Discovering & Configuring...
                    </>
                  ) : (
                    <>
                      <BoltIcon className="w-4 h-4" />
                      Auto-Discover & Configure
                    </>
                  )}
                </button>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-300 mb-2">
                    Perfect for APIs like:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-200/80">
                    <div>• https://official-joke-api.appspot.com</div>
                    <div>• https://api.weather.com</div>
                    <div>• https://newsapi.org</div>
                    <div>• https://jsonplaceholder.typicode.com</div>
                  </div>
                  <p className="text-xs text-blue-200/60 mt-2">
                    The system will automatically detect endpoints like
                    /jokes/programming/random, /jokes/programming/ten, and many
                    more using advanced discovery techniques!
                  </p>
                </div>

                {autoConfigResults.suggested && (
                  <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-slate-300 mb-3">
                      Suggested Configuration
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-slate-400">Name:</span>{" "}
                        <span className="text-white">
                          {autoConfigResults.suggested.name}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Description:</span>{" "}
                        <span className="text-white">
                          {autoConfigResults.suggested.description}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Endpoints:</span>{" "}
                        <span className="text-white">
                          {autoConfigResults.suggested.endpoints?.length || 0}{" "}
                          detected
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Authentication:</span>{" "}
                        <span className="text-white">
                          {autoConfigResults.suggested.authentication?.type ||
                            "none"}
                        </span>
                      </div>
                    </div>

                    {autoConfigResults.detected && (
                      <div className="mt-4 pt-3 border-t border-slate-700/50">
                        <h5 className="text-xs font-medium text-slate-400 mb-2">
                          Detection Details
                        </h5>
                        <div className="space-y-1 text-xs">
                          {autoConfigResults.detected.openApiSpec && (
                            <div className="text-green-400">
                              ✓ OpenAPI specification detected
                            </div>
                          )}
                          {autoConfigResults.detected.graphqlSchema && (
                            <div className="text-green-400">
                              ✓ GraphQL schema detected
                            </div>
                          )}
                          {autoConfigResults.detected.restEndpoints && (
                            <div className="text-green-400">
                              ✓ REST endpoints discovered
                            </div>
                          )}
                          {autoConfigResults.detected.authentication && (
                            <div className="text-green-400">
                              ✓ Authentication method identified
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Endpoints Tab */}
            {activeTab === 6 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">
                    API Endpoints
                  </h3>
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-slate-400">
                      {serverConfig.endpoints?.length || 0} endpoints configured
                    </p>
                    <button
                      onClick={() => {
                        const newEndpoint: APIEndpoint = {
                          id: `endpoint-${Date.now()}`,
                          path: "",
                          method: "GET",
                          toolName: "",
                          description: "",
                          parameters: [],
                          enabled: true,
                        };
                        setServerConfig({
                          ...serverConfig,
                          endpoints: [
                            ...(serverConfig.endpoints || []),
                            newEndpoint,
                          ],
                        });
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Add Endpoint
                    </button>
                  </div>
                </div>

                {serverConfig.endpoints && serverConfig.endpoints.length > 0 ? (
                  <div className="space-y-4">
                    {serverConfig.endpoints.map((endpoint, index) => (
                      <div
                        key={endpoint.id}
                        className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Method
                            </label>
                            <select
                              value={endpoint.method}
                              onChange={(e) => {
                                const updatedEndpoints = [
                                  ...serverConfig.endpoints,
                                ];
                                updatedEndpoints[index] = {
                                  ...endpoint,
                                  method: e.target
                                    .value as APIEndpoint["method"],
                                };
                                setServerConfig({
                                  ...serverConfig,
                                  endpoints: updatedEndpoints,
                                });
                              }}
                              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="GET">GET</option>
                              <option value="POST">POST</option>
                              <option value="PUT">PUT</option>
                              <option value="DELETE">DELETE</option>
                              <option value="PATCH">PATCH</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Path
                            </label>
                            <input
                              type="text"
                              value={endpoint.path}
                              onChange={(e) => {
                                const updatedEndpoints = [
                                  ...serverConfig.endpoints,
                                ];
                                updatedEndpoints[index] = {
                                  ...endpoint,
                                  path: e.target.value,
                                };
                                setServerConfig({
                                  ...serverConfig,
                                  endpoints: updatedEndpoints,
                                });
                              }}
                              placeholder="/api/users"
                              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Tool Name
                            </label>
                            <input
                              type="text"
                              value={endpoint.toolName}
                              onChange={(e) => {
                                const updatedEndpoints = [
                                  ...serverConfig.endpoints,
                                ];
                                updatedEndpoints[index] = {
                                  ...endpoint,
                                  toolName: e.target.value,
                                };
                                setServerConfig({
                                  ...serverConfig,
                                  endpoints: updatedEndpoints,
                                });
                              }}
                              placeholder="get_users"
                              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              onClick={() => {
                                const updatedEndpoints =
                                  serverConfig.endpoints.filter(
                                    (_, i) => i !== index
                                  );
                                setServerConfig({
                                  ...serverConfig,
                                  endpoints: updatedEndpoints,
                                });
                              }}
                              className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                              <TrashIcon className="w-4 h-4" />
                              Remove
                            </button>
                          </div>
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Description
                          </label>
                          <input
                            type="text"
                            value={endpoint.description}
                            onChange={(e) => {
                              const updatedEndpoints = [
                                ...serverConfig.endpoints,
                              ];
                              updatedEndpoints[index] = {
                                ...endpoint,
                                description: e.target.value,
                              };
                              setServerConfig({
                                ...serverConfig,
                                endpoints: updatedEndpoints,
                              });
                            }}
                            placeholder="Get all users from the system"
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="flex items-center gap-3">
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
                            {endpoint.path || "/api/path"}
                          </span>
                          <span className="text-slate-400 text-sm">
                            → {endpoint.toolName || "tool_name"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <PlusIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No endpoints configured</p>
                    <p className="text-sm mb-4">
                      Add endpoints manually or import from OpenAPI spec
                    </p>
                    <button
                      onClick={() => {
                        const newEndpoint: APIEndpoint = {
                          id: `endpoint-${Date.now()}`,
                          path: "/oauth2/v2/userinfo",
                          method: "GET",
                          toolName: "get_user_profile",
                          description:
                            "Get authenticated user's profile information",
                          parameters: [],
                          enabled: true,
                        };
                        setServerConfig({
                          ...serverConfig,
                          endpoints: [newEndpoint],
                        });
                      }}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                    >
                      <PlusIcon className="w-5 h-5" />
                      Add Your First Endpoint
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Authentication Tab */}
            {/* Authentication Tab */}
            {activeTab === 7 && (
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
                    <option value="oauth2">OAuth 2.0</option>
                    <option value="jwt">JWT</option>
                    <option value="digest">Digest Auth</option>
                    <option value="aws-signature">AWS Signature</option>
                    <option value="mutual-tls">Mutual TLS</option>
                    <option value="custom">Custom</option>
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

                {serverConfig.authentication?.type === "bearer" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Bearer Token
                    </label>
                    <input
                      type="password"
                      value={
                        serverConfig.authentication.credentials?.token || ""
                      }
                      onChange={(e) =>
                        setServerConfig({
                          ...serverConfig,
                          authentication: {
                            ...serverConfig.authentication!,
                            credentials: {
                              ...serverConfig.authentication!.credentials,
                              token: e.target.value,
                            },
                          },
                        })
                      }
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="your-bearer-token"
                    />
                  </div>
                )}

                {serverConfig.authentication?.type === "basic" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        value={
                          serverConfig.authentication.credentials?.username ||
                          ""
                        }
                        onChange={(e) =>
                          setServerConfig({
                            ...serverConfig,
                            authentication: {
                              ...serverConfig.authentication!,
                              credentials: {
                                ...serverConfig.authentication!.credentials,
                                username: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Password
                      </label>
                      <input
                        type="password"
                        value={
                          serverConfig.authentication.credentials?.password ||
                          ""
                        }
                        onChange={(e) =>
                          setServerConfig({
                            ...serverConfig,
                            authentication: {
                              ...serverConfig.authentication!,
                              credentials: {
                                ...serverConfig.authentication!.credentials,
                                password: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="password"
                      />
                    </div>
                  </>
                )}

                {serverConfig.authentication?.type === "oauth2" && (
                  <OAuth2FlowComponent
                    serverConfig={serverConfig}
                    setServerConfig={setServerConfig}
                    serverId={serverConfig.id}
                    onTokenReceived={(token) => {
                      console.log("OAuth2 token received:", token);
                      // Token is automatically stored in the serverConfig by the component
                    }}
                  />
                )}

                {serverConfig.authentication?.type === "aws-signature" && (
                  <>
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                      <p className="text-sm text-orange-300">
                        AWS Signature v4 authentication for AWS services.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Access Key ID
                        </label>
                        <input
                          type="text"
                          value={
                            serverConfig.authentication.awsSignature
                              ?.accessKeyId || ""
                          }
                          onChange={(e) =>
                            setServerConfig({
                              ...serverConfig,
                              authentication: {
                                ...serverConfig.authentication!,
                                awsSignature: {
                                  ...serverConfig.authentication!.awsSignature,
                                  accessKeyId: e.target.value,
                                },
                              },
                            })
                          }
                          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="AKIAIOSFODNN7EXAMPLE"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Secret Access Key
                        </label>
                        <input
                          type="password"
                          value={
                            serverConfig.authentication.awsSignature
                              ?.secretAccessKey || ""
                          }
                          onChange={(e) =>
                            setServerConfig({
                              ...serverConfig,
                              authentication: {
                                ...serverConfig.authentication!,
                                awsSignature: {
                                  ...serverConfig.authentication!.awsSignature,
                                  secretAccessKey: e.target.value,
                                },
                              },
                            })
                          }
                          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="secret-key"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Region
                        </label>
                        <input
                          type="text"
                          value={
                            serverConfig.authentication.awsSignature?.region ||
                            ""
                          }
                          onChange={(e) =>
                            setServerConfig({
                              ...serverConfig,
                              authentication: {
                                ...serverConfig.authentication!,
                                awsSignature: {
                                  ...serverConfig.authentication!.awsSignature,
                                  region: e.target.value,
                                },
                              },
                            })
                          }
                          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="us-east-1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Service
                        </label>
                        <input
                          type="text"
                          value={
                            serverConfig.authentication.awsSignature?.service ||
                            ""
                          }
                          onChange={(e) =>
                            setServerConfig({
                              ...serverConfig,
                              authentication: {
                                ...serverConfig.authentication!,
                                awsSignature: {
                                  ...serverConfig.authentication!.awsSignature,
                                  service: e.target.value,
                                },
                              },
                            })
                          }
                          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="execute-api"
                        />
                      </div>
                    </div>
                  </>
                )}

                {serverConfig.authentication?.type === "custom" && (
                  <>
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                      <p className="text-sm text-purple-300">
                        Custom authentication allows you to define custom
                        headers and request processing logic.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Custom Headers (JSON)
                      </label>
                      <textarea
                        value={JSON.stringify(
                          serverConfig.authentication.custom?.headers || {},
                          null,
                          2
                        )}
                        onChange={(e) => {
                          try {
                            const headers = JSON.parse(e.target.value);
                            setServerConfig({
                              ...serverConfig,
                              authentication: {
                                ...serverConfig.authentication!,
                                custom: {
                                  ...serverConfig.authentication!.custom,
                                  headers,
                                },
                              },
                            });
                          } catch (error) {
                            // Invalid JSON, ignore
                          }
                        }}
                        rows={4}
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        placeholder='{"Authorization": "Custom token", "X-Custom-Header": "value"}'
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 8 && (
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
            {activeTab === 9 && (
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
            {activeTab === 10 && (
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
