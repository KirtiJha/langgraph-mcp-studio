import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeftIcon,
  PlayIcon,
  StopIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ClipboardDocumentIcon,
  PaperAirplaneIcon,
  Cog8ToothIcon,
  KeyIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

import {
  PublicAPISpec,
  PublicAPIEndpoint,
  PublicAPITestRequest,
  PublicAPITestResponse,
} from "../../shared/publicApiTypes";
import PublicAPIService from "../services/PublicAPIService";

interface PublicAPITesterProps {
  api: PublicAPISpec;
  onBack: () => void;
  onViewDetails: () => void;
  onConvertToMCP: () => void;
}

const PublicAPITester: React.FC<PublicAPITesterProps> = ({
  api,
  onBack,
  onViewDetails,
  onConvertToMCP,
}) => {
  const [selectedEndpoint, setSelectedEndpoint] =
    useState<PublicAPIEndpoint | null>(null);
  const [requestData, setRequestData] = useState<PublicAPITestRequest>({
    apiId: api.id,
    endpointId: "",
    method: "GET",
    url: "",
    headers: {},
    queryParams: {},
    body: undefined,
    authentication: undefined,
  });
  const [response, setResponse] = useState<PublicAPITestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [authConfig, setAuthConfig] = useState<{
    type: string;
    credentials: Record<string, string>;
  }>({
    type: api.authentication?.type || "none",
    credentials: {},
  });
  const [showRequestBody, setShowRequestBody] = useState(true);
  const [showResponse, setShowResponse] = useState(true);
  const [history, setHistory] = useState<PublicAPITestResponse[]>([]);
  const [endpointsLoaded, setEndpointsLoaded] = useState(false);
  const [actualBaseUrl, setActualBaseUrl] = useState<string>("");
  const [availableEndpoints, setAvailableEndpoints] = useState<
    PublicAPIEndpoint[]
  >([]);
  const [corsProxy, setCorsProxy] = useState(() => {
    const status = PublicAPIService.getCorsProxyStatus();
    return status;
  });

  useEffect(() => {
    const fetchEndpoints = async () => {
      console.log("🔍 PublicAPITester: Setting up endpoints for", api.name);
      setLoading(true);
      setEndpointsLoaded(false);

      try {
        let baseUrl = "";
        let endpoints: PublicAPIEndpoint[] = [];

        // Check if API already has endpoints (from prior detailed fetch)
        if (api.endpoints && api.endpoints.length > 0) {
          console.log("🔍 Using pre-loaded endpoints from API object:", {
            baseUrl: api.baseUrl,
            endpointCount: api.endpoints.length,
          });

          baseUrl = api.baseUrl || "";
          endpoints = api.endpoints;
        } else {
          // Fallback: try to fetch endpoints if not already available
          console.log("🔍 Fetching endpoints from OpenAPI spec...");
          const result = await PublicAPIService.fetchAPIEndpoints(api);
          baseUrl = result.baseUrl;
          endpoints = result.endpoints;

          console.log("🔍 Fetched endpoints:", {
            baseUrl,
            endpointCount: endpoints.length,
          });
        }

        setActualBaseUrl(baseUrl);
        setAvailableEndpoints(endpoints);

        console.log(
          "🔍 Available endpoints with parameters:",
          endpoints.map((ep) => ({
            id: ep.id,
            path: ep.path,
            method: ep.method,
            parameterCount: ep.parameters?.length || 0,
            parameters:
              ep.parameters?.map((p) => ({
                name: p.name,
                in: p.in,
                required: p.required,
                type: p.type,
                hasEnum: !!p.enum,
              })) || [],
          }))
        );

        if (endpoints.length > 0) {
          setSelectedEndpoint(endpoints[0]);
          updateRequestData(endpoints[0], baseUrl);
        }

        setEndpointsLoaded(true);
      } catch (error) {
        console.error("Error setting up endpoints:", error);
        // Fallback to basic endpoint
        const fallbackEndpoint: PublicAPIEndpoint = {
          id: "fallback",
          path: "/",
          method: "GET",
          summary: "Test endpoint",
          description: "Basic test endpoint",
          responses: { "200": { description: "Success" } },
        };

        setAvailableEndpoints([fallbackEndpoint]);
        setSelectedEndpoint(fallbackEndpoint);
        setActualBaseUrl(api.baseUrl || "");
        updateRequestData(fallbackEndpoint, api.baseUrl || "");
        setEndpointsLoaded(true);
      } finally {
        setLoading(false);
      }
    };

    fetchEndpoints();
  }, [api]);

  const updateRequestData = (endpoint: PublicAPIEndpoint, baseUrl?: string) => {
    const effectiveBaseUrl = (
      baseUrl ||
      actualBaseUrl ||
      api.baseUrl ||
      ""
    ).replace(/\/$/, "");
    const path = endpoint.path.startsWith("/")
      ? endpoint.path
      : `/${endpoint.path}`;
    const fullUrl = `${effectiveBaseUrl}${path}`;

    console.log("🔍 UpdateRequestData:", {
      api: api.name,
      baseUrl: effectiveBaseUrl,
      endpointPath: endpoint.path,
      fullUrl,
    });

    setRequestData({
      apiId: api.id,
      endpointId: endpoint.id,
      method: endpoint.method,
      url: fullUrl,
      headers: { "Content-Type": "application/json" },
      queryParams: {},
      body: endpoint.method !== "GET" ? {} : undefined,
      authentication: authConfig.type !== "none" ? authConfig : undefined,
    });
  };

  const handleEndpointChange = (endpoint: PublicAPIEndpoint) => {
    console.log("🔍 Changing endpoint:", {
      newEndpoint: {
        id: endpoint.id,
        path: endpoint.path,
        method: endpoint.method,
        parameterCount: endpoint.parameters?.length || 0,
      },
    });

    setSelectedEndpoint(endpoint);
    updateRequestData(endpoint);
    setResponse(null);
  };

  const handleAuthChange = (field: string, value: string) => {
    const newAuthConfig = {
      ...authConfig,
      credentials: {
        ...authConfig.credentials,
        [field]: value,
      },
    };

    setAuthConfig(newAuthConfig);

    if (newAuthConfig.type !== "none") {
      setRequestData((prev) => ({
        ...prev,
        authentication: newAuthConfig,
      }));
    }
  };

  const addHeader = () => {
    setRequestData((prev) => ({
      ...prev,
      headers: {
        ...prev.headers,
        "": "",
      },
    }));
  };

  const updateHeader = useCallback(
    (oldKey: string, newKey: string, value: string) => {
      setRequestData((prev) => {
        const newHeaders = { ...prev.headers };
        if (oldKey !== newKey && oldKey in newHeaders) {
          delete newHeaders[oldKey];
        }
        if (newKey) {
          newHeaders[newKey] = value;
        }
        return {
          ...prev,
          headers: newHeaders,
        };
      });
    },
    []
  );

  const removeHeader = (key: string) => {
    setRequestData((prev) => {
      const newHeaders = { ...prev.headers };
      delete newHeaders[key];
      return {
        ...prev,
        headers: newHeaders,
      };
    });
  };

  // Extract parameters from the selected endpoint
  const getEndpointParameters = useCallback(() => {
    if (!selectedEndpoint || !selectedEndpoint.parameters) {
      console.log("🔍 No parameters found for selected endpoint:", {
        hasSelectedEndpoint: !!selectedEndpoint,
        hasParameters: !!selectedEndpoint?.parameters,
        parametersLength: selectedEndpoint?.parameters?.length || 0,
      });
      return [];
    }

    // Log all parameter types to understand what we're filtering out
    const allParamTypes = selectedEndpoint.parameters.map((p) => p.in);
    const uniqueParamTypes = [...new Set(allParamTypes)];

    console.log("🔍 All parameter types found:", {
      allTypes: uniqueParamTypes,
      counts: uniqueParamTypes.map((type) => ({
        type,
        count: allParamTypes.filter((t) => t === type).length,
      })),
    });

    const filteredParams = selectedEndpoint.parameters.filter(
      (param) =>
        param.in === "query" ||
        param.in === "path" ||
        param.in === "header" ||
        param.in === "formData"
    );

    console.log("🔍 Endpoint parameters:", {
      endpointId: selectedEndpoint.id,
      endpointPath: selectedEndpoint.path,
      totalParams: selectedEndpoint.parameters.length,
      filteredParams: filteredParams.length,
      parameters: filteredParams.map((p) => ({
        name: p.name,
        in: p.in,
        required: p.required,
        type: p.type,
      })),
    });

    return filteredParams;
  }, [selectedEndpoint]);

  // Validate required parameters
  const validateRequiredParameters = (): {
    isValid: boolean;
    errors: string[];
  } => {
    const errors: string[] = [];
    const parameters = getEndpointParameters();

    parameters.forEach((param) => {
      if (param.required) {
        if (param.in === "query" && !requestData.queryParams?.[param.name]) {
          errors.push(`Required query parameter "${param.name}" is missing`);
        } else if (
          param.in === "header" &&
          !requestData.headers?.[param.name]
        ) {
          errors.push(`Required header parameter "${param.name}" is missing`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  // Initialize parameters when endpoint changes
  useEffect(() => {
    if (selectedEndpoint) {
      const endpointParams = getEndpointParameters();

      setRequestData((prev) => {
        const newQueryParams = { ...prev.queryParams };

        // Initialize all query parameters that aren't already set
        endpointParams.forEach((param) => {
          if (param.in === "query" && !(param.name in newQueryParams)) {
            newQueryParams[param.name] = "";
          }
        });

        return {
          ...prev,
          queryParams: newQueryParams,
        };
      });
    }
  }, [selectedEndpoint, getEndpointParameters]);

  const addQueryParam = () => {
    setRequestData((prev) => ({
      ...prev,
      queryParams: {
        ...prev.queryParams,
        "": "",
      },
    }));
  };

  const updateQueryParam = useCallback(
    (oldKey: string, newKey: string, value: string) => {
      setRequestData((prev) => {
        const newParams = { ...prev.queryParams };

        // If we're renaming a key, delete the old one
        if (oldKey !== newKey && oldKey in newParams) {
          delete newParams[oldKey];
        }

        // Always set the new value if newKey is provided
        if (newKey) {
          newParams[newKey] = value;
        } else if (oldKey === newKey) {
          // If newKey is empty but we're updating the same key, remove it
          delete newParams[oldKey];
        }

        return {
          ...prev,
          queryParams: newParams,
        };
      });
    },
    []
  );

  const removeQueryParam = (key: string) => {
    setRequestData((prev) => {
      const newParams = { ...prev.queryParams };
      delete newParams[key];
      return {
        ...prev,
        queryParams: newParams,
      };
    });
  };

  const handleSendRequest = async () => {
    if (!selectedEndpoint) return;

    // Validate required parameters
    const validation = validateRequiredParameters();
    if (!validation.isValid) {
      setResponse({
        status: 0,
        statusText: "Validation Failed",
        headers: {},
        data: null,
        responseTime: 0,
        size: 0,
        timestamp: new Date().toISOString(),
        error: `❌ Parameter Validation Failed:\n\n${validation.errors
          .map((err) => `• ${err}`)
          .join(
            "\n"
          )}\n\nPlease provide all required parameters before testing.`,
      });
      return;
    }

    console.log("🚀 Sending request:", requestData);
    setLoading(true);
    const startTime = Date.now();

    try {
      const testResponse = await PublicAPIService.testAPI(requestData);
      setResponse(testResponse);
      setHistory((prev) => [testResponse, ...prev.slice(0, 9)]); // Keep last 10 requests
    } catch (error) {
      console.error("Test request failed:", error);
      const responseTime = Date.now() - startTime;

      let errorMessage = "❌ Request Failed";
      let detailedError = "";

      if (error instanceof Error) {
        // Check for common network errors
        if (error.message.includes("CORS")) {
          errorMessage = "🚫 CORS Error";
          detailedError = `CORS policy is blocking this request. This is expected for many public APIs when testing from a browser.\n\n${
            corsProxy.enabled
              ? "CORS proxy is enabled but may not work for all APIs."
              : "Try enabling the CORS proxy in the settings below."
          }\n\nAlternatives:\n• Convert to MCP Server for production use\n• Use a browser extension to disable CORS\n• Test with a proper API client like Postman`;
        } else if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorMessage = "🌐 Network Error";
          detailedError = `Failed to connect to the API endpoint.\n\nPossible causes:\n• API server is down or unreachable\n• Invalid URL or endpoint\n• Network connectivity issues\n• Rate limiting or blocked request\n\nError: ${error.message}`;
        } else if (error.message.includes("timeout")) {
          errorMessage = "⏱️ Request Timeout";
          detailedError = `The request took too long to complete.\n\nThis could indicate:\n• Slow API response\n• Network latency issues\n• Server overload\n\nTry again or contact the API provider.`;
        } else {
          errorMessage = "❌ Request Error";
          detailedError = `An unexpected error occurred:\n\n${error.message}\n\nPlease check your request parameters and try again.`;
        }
      } else {
        detailedError = "An unknown error occurred. Please try again.";
      }

      setResponse({
        status: 0,
        statusText: errorMessage,
        headers: {},
        data: null,
        responseTime,
        size: 0,
        timestamp: new Date().toISOString(),
        error: detailedError,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCorsProxyToggle = (enabled: boolean) => {
    PublicAPIService.setCorsProxy(enabled, corsProxy.url);
    setCorsProxy((prev) => ({ ...prev, enabled }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-green-400 bg-green-400/10";
    if (status >= 300 && status < 400)
      return "text-yellow-400 bg-yellow-400/10";
    if (status >= 400 && status < 500)
      return "text-orange-400 bg-orange-400/10";
    if (status >= 500) return "text-red-400 bg-red-400/10";
    return "text-slate-400 bg-slate-400/10";
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return "text-green-400 bg-green-400/10 border-green-400/20";
      case "POST":
        return "text-blue-400 bg-blue-400/10 border-blue-400/20";
      case "PUT":
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "DELETE":
        return "text-red-400 bg-red-400/10 border-red-400/20";
      case "PATCH":
        return "text-purple-400 bg-purple-400/10 border-purple-400/20";
      default:
        return "text-slate-400 bg-slate-400/10 border-slate-400/20";
    }
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="flex-none bg-slate-800/50 border-b border-slate-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <PlayIcon className="w-6 h-6 text-indigo-400" />
                API Tester - {api.name}
              </h1>
              <p className="text-slate-400 mt-1">
                Test endpoints and explore responses
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onViewDetails}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <DocumentTextIcon className="w-4 h-4" />
              View Details
            </button>

            <button
              onClick={onConvertToMCP}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Convert to MCP
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Request Panel */}
        <div className="w-1/2 border-r border-slate-700/50 flex flex-col">
          <div className="flex-none p-6 border-b border-slate-700/50">
            <h2 className="text-lg font-semibold text-white mb-4">Request</h2>

            {/* Endpoint Selection */}
            {loading ? (
              <div className="mb-4 p-4 bg-slate-700 rounded-lg text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400 mx-auto mb-2"></div>
                <div className="text-slate-300">Loading endpoints...</div>
              </div>
            ) : availableEndpoints.length > 0 ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Endpoint
                </label>
                <select
                  value={selectedEndpoint?.id || ""}
                  onChange={(e) => {
                    const endpoint = availableEndpoints.find(
                      (ep) => ep.id === e.target.value
                    );
                    if (endpoint) handleEndpointChange(endpoint);
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {availableEndpoints.map((endpoint) => (
                    <option key={endpoint.id} value={endpoint.id}>
                      {endpoint.method} {endpoint.path} - {endpoint.summary}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="text-amber-400 text-sm">
                  No endpoints available for this API
                </div>
              </div>
            )}

            {/* URL and Method */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Request URL
              </label>
              <div className="flex gap-2">
                <select
                  value={requestData.method}
                  onChange={(e) =>
                    setRequestData((prev) => ({
                      ...prev,
                      method: e.target.value as any,
                    }))
                  }
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
                <input
                  type="text"
                  value={requestData.url}
                  onChange={(e) =>
                    setRequestData((prev) => ({ ...prev, url: e.target.value }))
                  }
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://api.example.com/endpoint"
                />
              </div>
            </div>

            {/* CORS Proxy Settings */}
            <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-yellow-300 flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  CORS Proxy (Required for browser testing)
                </h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={corsProxy.enabled}
                    onChange={(e) => handleCorsProxyToggle(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                </label>
              </div>
              <p className="text-xs text-yellow-200/80">
                {corsProxy.enabled
                  ? `Using proxy: ${corsProxy.url}`
                  : "Enable to bypass CORS restrictions when testing APIs from browser"}
              </p>
            </div>

            {/* Send Button */}
            {(() => {
              const validation = validateRequiredParameters();
              return (
                <div>
                  {!validation.isValid && (
                    <div className="mb-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-300">
                      <div className="font-medium mb-1">
                        Required parameters missing:
                      </div>
                      <ul className="list-disc list-inside space-y-0.5">
                        {validation.errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button
                    onClick={handleSendRequest}
                    disabled={loading || !requestData.url}
                    className={`w-full px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium ${
                      validation.isValid
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                        : "bg-slate-600 text-slate-300 cursor-not-allowed"
                    } disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-slate-400`}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending Request...
                      </>
                    ) : validation.isValid ? (
                      <>
                        <PaperAirplaneIcon className="w-4 h-4" />
                        Send Request
                      </>
                    ) : (
                      <>
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        Complete Required Fields
                      </>
                    )}
                  </button>
                </div>
              );
            })()}
          </div>

          <div className="flex-1 overflow-auto p-6 space-y-6">
            {/* Authentication */}
            {api.authentication?.type !== "none" && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <KeyIcon className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Authentication
                  </h3>
                </div>
                <div className="space-y-3 bg-slate-800/30 rounded-lg p-4">
                  {authConfig.type === "apiKey" && (
                    <>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">
                          API Key
                        </label>
                        <input
                          type="password"
                          value={authConfig.credentials.key || ""}
                          onChange={(e) =>
                            handleAuthChange("key", e.target.value)
                          }
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Enter your API key"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">
                          Header Name
                        </label>
                        <input
                          type="text"
                          value={
                            authConfig.credentials.headerName ||
                            api.authentication?.keyName ||
                            "X-API-Key"
                          }
                          onChange={(e) =>
                            handleAuthChange("headerName", e.target.value)
                          }
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </>
                  )}

                  {authConfig.type === "bearer" && (
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">
                        Bearer Token
                      </label>
                      <input
                        type="password"
                        value={authConfig.credentials.token || ""}
                        onChange={(e) =>
                          handleAuthChange("token", e.target.value)
                        }
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Enter your bearer token"
                      />
                    </div>
                  )}

                  {authConfig.type === "basic" && (
                    <>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">
                          Username
                        </label>
                        <input
                          type="text"
                          value={authConfig.credentials.username || ""}
                          onChange={(e) =>
                            handleAuthChange("username", e.target.value)
                          }
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Username"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">
                          Password
                        </label>
                        <input
                          type="password"
                          value={authConfig.credentials.password || ""}
                          onChange={(e) =>
                            handleAuthChange("password", e.target.value)
                          }
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Password"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Headers */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Headers</h3>
                <button
                  onClick={addHeader}
                  className="px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded text-xs"
                >
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {Object.entries(requestData.headers || {}).map(
                  ([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <input
                        type="text"
                        value={key || ""}
                        onChange={(e) =>
                          updateHeader(key, e.target.value, value)
                        }
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        placeholder="Header name"
                      />
                      <input
                        type="text"
                        value={value || ""}
                        onChange={(e) => updateHeader(key, key, e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        placeholder="Header value"
                      />
                      <button
                        onClick={() => removeHeader(key)}
                        className="px-2 py-2 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Query Parameters */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-white">
                    Parameters
                  </h3>
                  {(() => {
                    const allParams = getEndpointParameters();
                    const requiredParams = allParams.filter((p) => p.required);
                    const optionalParams = allParams.filter((p) => !p.required);

                    if (allParams.length > 0) {
                      return (
                        <div className="flex items-center gap-2 text-xs">
                          {requiredParams.length > 0 && (
                            <span className="px-2 py-1 bg-red-600/20 text-red-300 rounded-full">
                              {requiredParams.length} required
                            </span>
                          )}
                          {optionalParams.length > 0 && (
                            <span className="px-2 py-1 bg-slate-600/50 text-slate-300 rounded-full">
                              {optionalParams.length} optional
                            </span>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <button
                  onClick={addQueryParam}
                  className="px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded text-xs"
                >
                  Add Custom
                </button>
              </div>

              <div className="space-y-3">
                {/* Endpoint-defined parameters */}
                {getEndpointParameters().map((param) => (
                  <div
                    key={param.name}
                    className={`rounded-lg p-3 border ${
                      param.required
                        ? "bg-red-900/10 border-red-500/30"
                        : "bg-slate-800/50 border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-sm font-medium text-white flex items-center gap-2">
                        {param.name}
                        {param.required && (
                          <span
                            className="text-red-400 text-xs font-bold"
                            title="Required parameter"
                          >
                            *
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            param.in === "query"
                              ? "bg-blue-600/20 text-blue-300"
                              : param.in === "path"
                              ? "bg-green-600/20 text-green-300"
                              : "bg-purple-600/20 text-purple-300"
                          }`}
                        >
                          {param.in}
                        </span>
                        <span className="px-1.5 py-0.5 bg-indigo-600/20 text-indigo-300 rounded text-xs">
                          {param.type || "string"}
                        </span>
                        {!param.required && (
                          <span className="px-1.5 py-0.5 bg-slate-600/50 text-slate-400 rounded text-xs">
                            optional
                          </span>
                        )}
                      </label>
                    </div>

                    {param.description && (
                      <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                        {param.description}
                      </p>
                    )}

                    {param.enum && param.enum.length > 0 && (
                      <div className="mb-2">
                        <span className="text-xs text-slate-400">
                          Allowed values:{" "}
                        </span>
                        <span className="text-xs text-indigo-300">
                          {param.enum.join(", ")}
                        </span>
                      </div>
                    )}

                    {param.in === "query" ? (
                      param.enum && param.enum.length > 0 ? (
                        <select
                          value={requestData.queryParams?.[param.name] || ""}
                          onChange={(e) =>
                            updateQueryParam(
                              param.name,
                              param.name,
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          required={param.required}
                        >
                          <option value="">
                            {param.required
                              ? "Select required value..."
                              : "Select optional value..."}
                          </option>
                          {param.enum.map((enumValue) => (
                            <option key={enumValue} value={enumValue}>
                              {enumValue}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={
                            param.type === "number" || param.type === "integer"
                              ? "number"
                              : param.type === "boolean"
                              ? "checkbox"
                              : "text"
                          }
                          {...(param.type === "boolean"
                            ? {
                                checked:
                                  requestData.queryParams?.[param.name] ===
                                  "true",
                              }
                            : {
                                value:
                                  requestData.queryParams?.[param.name] || "",
                              })}
                          onChange={(e) => {
                            const value =
                              param.type === "boolean"
                                ? e.target.checked.toString()
                                : e.target.value;
                            updateQueryParam(param.name, param.name, value);
                          }}
                          className={`w-full px-3 py-2 bg-slate-700 border rounded-md text-white focus:outline-none focus:ring-2 text-sm ${
                            param.required &&
                            !requestData.queryParams?.[param.name]
                              ? "border-red-500 focus:ring-red-500"
                              : "border-slate-600 focus:ring-indigo-500"
                          }`}
                          placeholder={
                            param.required
                              ? `Required ${param.type || "string"} parameter`
                              : `Optional ${param.type || "string"} parameter`
                          }
                          required={param.required}
                          min={
                            param.type === "number" || param.type === "integer"
                              ? param.minimum
                              : undefined
                          }
                          max={
                            param.type === "number" || param.type === "integer"
                              ? param.maximum
                              : undefined
                          }
                        />
                      )
                    ) : param.in === "path" ? (
                      <div className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-slate-300 text-sm">
                        <span className="text-green-400">✓</span> Path parameter
                        (automatically filled from URL template)
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={requestData.headers?.[param.name] || ""}
                        onChange={(e) =>
                          updateHeader(param.name, param.name, e.target.value)
                        }
                        className={`w-full px-3 py-2 bg-slate-700 border rounded-md text-white focus:outline-none focus:ring-2 text-sm ${
                          param.required && !requestData.headers?.[param.name]
                            ? "border-red-500 focus:ring-red-500"
                            : "border-slate-600 focus:ring-indigo-500"
                        }`}
                        placeholder={`Header: ${param.name}${
                          param.required ? " (required)" : ""
                        }`}
                        required={param.required}
                      />
                    )}
                  </div>
                ))}

                {/* Custom parameters */}
                {Object.entries(requestData.queryParams || {})
                  .filter(
                    ([key]) =>
                      !getEndpointParameters().some(
                        (p) => p.name === key && p.in === "query"
                      )
                  )
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="flex gap-2 bg-slate-800/30 rounded-lg p-2 border border-slate-700/50"
                    >
                      <input
                        type="text"
                        value={key || ""}
                        onChange={(e) =>
                          updateQueryParam(key, e.target.value, value)
                        }
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        placeholder="Custom parameter name"
                      />
                      <input
                        type="text"
                        value={value || ""}
                        onChange={(e) =>
                          updateQueryParam(key, key, e.target.value)
                        }
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        placeholder="Parameter value"
                      />
                      <button
                        onClick={() => removeQueryParam(key)}
                        className="px-2 py-2 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                {getEndpointParameters().length === 0 &&
                  Object.keys(requestData.queryParams || {}).length === 0 && (
                    <div className="text-center py-4 text-slate-400 text-sm">
                      No parameters defined. Click "Add Custom" to add
                      parameters manually.
                    </div>
                  )}
              </div>
            </div>

            {/* Request Body */}
            {requestData.method !== "GET" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">
                    Request Body
                  </h3>
                  <button
                    onClick={() => setShowRequestBody(!showRequestBody)}
                    className="text-slate-400 hover:text-slate-300"
                  >
                    {showRequestBody ? (
                      <EyeSlashIcon className="w-4 h-4" />
                    ) : (
                      <EyeIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {showRequestBody && (
                  <textarea
                    value={
                      typeof requestData.body === "string"
                        ? requestData.body
                        : JSON.stringify(requestData.body, null, 2)
                    }
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setRequestData((prev) => ({ ...prev, body: parsed }));
                      } catch {
                        setRequestData((prev) => ({
                          ...prev,
                          body: e.target.value,
                        }));
                      }
                    }}
                    className="w-full h-40 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm resize-none"
                    placeholder="Enter request body (JSON)"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Response Panel */}
        <div className="w-1/2 flex flex-col">
          <div className="flex-none p-6 border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Response</h2>
              {response && (
                <div className="flex items-center gap-4 text-sm">
                  <span
                    className={`px-2 py-1 rounded ${getStatusColor(
                      response.status
                    )}`}
                  >
                    {response.status} {response.statusText}
                  </span>
                  <span className="text-slate-400">
                    {formatResponseTime(response.responseTime)}
                  </span>
                  <span className="text-slate-400">
                    {formatSize(response.size)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {response ? (
              <div className="space-y-6">
                {/* Response Status */}
                <div className="bg-slate-800/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white">Status</h3>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${response.status} ${response.statusText}`
                        )
                      }
                      className="p-1 text-slate-400 hover:text-slate-300"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded font-medium ${getStatusColor(
                        response.status
                      )}`}
                    >
                      {response.status} {response.statusText}
                    </span>
                    <span className="text-slate-400">
                      {formatResponseTime(response.responseTime)}
                    </span>
                    <span className="text-slate-400">
                      {formatSize(response.size)}
                    </span>
                  </div>
                </div>

                {/* Response Headers */}
                <div className="bg-slate-800/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white">
                      Headers ({Object.keys(response.headers).length})
                    </h3>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          JSON.stringify(response.headers, null, 2)
                        )
                      }
                      className="p-1 text-slate-400 hover:text-slate-300"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {Object.entries(response.headers).map(([key, value]) => (
                      <div key={key} className="flex text-sm">
                        <span className="text-indigo-300 w-1/3 font-medium">
                          {key}:
                        </span>
                        <span className="text-slate-400 flex-1 font-mono break-all">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Response Body */}
                <div className="bg-slate-800/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white">Body</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowResponse(!showResponse)}
                        className="p-1 text-slate-400 hover:text-slate-300"
                      >
                        {showResponse ? (
                          <EyeSlashIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            typeof response.data === "string"
                              ? response.data
                              : JSON.stringify(response.data, null, 2)
                          )
                        }
                        className="p-1 text-slate-400 hover:text-slate-300"
                      >
                        <ClipboardDocumentIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {showResponse && (
                    <pre className="bg-slate-900/50 rounded p-3 text-sm text-slate-300 overflow-auto max-h-96 font-mono">
                      {response.error ? (
                        <span className="text-red-400">{response.error}</span>
                      ) : typeof response.data === "string" ? (
                        response.data
                      ) : (
                        JSON.stringify(response.data, null, 2)
                      )}
                    </pre>
                  )}
                </div>

                {/* Error Details */}
                {response.error && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
                      <h3 className="text-sm font-semibold text-red-300">
                        Error Details
                      </h3>
                    </div>
                    <p className="text-red-200 text-sm">{response.error}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <PlayIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg mb-2">Ready to test</p>
                  <p className="text-sm">
                    Configure your request and click "Send Request" to see the
                    response
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicAPITester;
