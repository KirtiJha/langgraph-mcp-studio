import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeftIcon,
  StarIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  TagIcon,
  ArrowTopRightOnSquareIcon,
  PlayIcon,
  PlusIcon,
  BeakerIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CodeBracketIcon,
  ServerIcon,
  KeyIcon,
  UserIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

import { PublicAPISpec, PublicAPIEndpoint } from "../../shared/publicApiTypes";

interface PublicAPIDetailsProps {
  api: PublicAPISpec;
  onBack: () => void;
  onTest: () => void;
  onConvertToMCP: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

const PublicAPIDetails: React.FC<PublicAPIDetailsProps> = ({
  api,
  onBack,
  onTest,
  onConvertToMCP,
  isFavorite,
  onToggleFavorite,
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "endpoints" | "authentication" | "examples"
  >("overview");
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(
    new Set()
  );

  const getPricingColor = (pricing: string) => {
    switch (pricing) {
      case "free":
        return "text-green-400 bg-green-400/10";
      case "freemium":
        return "text-yellow-400 bg-yellow-400/10";
      case "paid":
        return "text-red-400 bg-red-400/10";
      default:
        return "text-slate-400 bg-slate-400/10";
    }
  };

  const getAuthColor = (authType: string) => {
    switch (authType) {
      case "none":
        return "text-green-400 bg-green-400/10";
      case "apiKey":
        return "text-blue-400 bg-blue-400/10";
      case "oauth2":
        return "text-purple-400 bg-purple-400/10";
      case "bearer":
        return "text-indigo-400 bg-indigo-400/10";
      case "basic":
        return "text-orange-400 bg-orange-400/10";
      default:
        return "text-slate-400 bg-slate-400/10";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-400";
      case "deprecated":
        return "text-red-400";
      case "beta":
        return "text-yellow-400";
      default:
        return "text-slate-400";
    }
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

  const toggleEndpoint = (endpointId: string) => {
    const newExpanded = new Set(expandedEndpoints);
    if (newExpanded.has(endpointId)) {
      newExpanded.delete(endpointId);
    } else {
      newExpanded.add(endpointId);
    }
    setExpandedEndpoints(newExpanded);
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="bg-slate-800/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          API Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1">
              Provider
            </label>
            <p className="text-slate-400">{api.provider}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1">
              Version
            </label>
            <p className="text-slate-400">v{api.version}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1">
              Base URL
            </label>
            <p className="text-slate-400 font-mono text-sm break-all">
              {api.baseUrl}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1">
              Status
            </label>
            <div className="flex items-center gap-2">
              {api.status === "active" && (
                <CheckCircleIcon className="w-4 h-4 text-green-400" />
              )}
              {api.status === "deprecated" && (
                <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
              )}
              {api.status === "beta" && (
                <ClockIcon className="w-4 h-4 text-yellow-400" />
              )}
              <span className={`capitalize ${getStatusColor(api.status)}`}>
                {api.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {api.description && (
        <div className="bg-slate-800/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Description</h3>
          <p className="text-slate-300 leading-relaxed">{api.description}</p>
        </div>
      )}

      {/* Tags */}
      {api.tags.length > 0 && (
        <div className="bg-slate-800/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {api.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Contact & License */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {api.contact && (
          <div className="bg-slate-800/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-indigo-400" />
              Contact
            </h3>
            <div className="space-y-2">
              {api.contact.name && (
                <p className="text-slate-300">{api.contact.name}</p>
              )}
              {api.contact.email && (
                <a
                  href={`mailto:${api.contact.email}`}
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2"
                >
                  <EnvelopeIcon className="w-4 h-4" />
                  {api.contact.email}
                </a>
              )}
              {api.contact.url && (
                <a
                  href={api.contact.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2"
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  Website
                </a>
              )}
            </div>
          </div>
        )}

        {api.license && (
          <div className="bg-slate-800/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">License</h3>
            <div className="space-y-2">
              <p className="text-slate-300">{api.license.name}</p>
              {api.license.url && (
                <a
                  href={api.license.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2"
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  View License
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Rate Limits */}
      {api.rateLimit && (
        <div className="bg-slate-800/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Rate Limits</h3>
          <p className="text-slate-300">
            {api.rateLimit.requests} requests per {api.rateLimit.period}
          </p>
        </div>
      )}
    </div>
  );

  const renderEndpointsTab = () => (
    <div className="space-y-4">
      {api.endpoints && api.endpoints.length > 0 ? (
        api.endpoints.map((endpoint) => (
          <div
            key={endpoint.id}
            className="bg-slate-800/30 rounded-lg border border-slate-700/50"
          >
            <button
              onClick={() => toggleEndpoint(endpoint.id)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/20 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span
                  className={`px-2 py-1 rounded border text-xs font-medium ${getMethodColor(
                    endpoint.method
                  )}`}
                >
                  {endpoint.method}
                </span>
                <code className="text-slate-300 font-mono">
                  {endpoint.path}
                </code>
                <span className="text-slate-400">{endpoint.summary}</span>
              </div>
              {expandedEndpoints.has(endpoint.id) ? (
                <ChevronDownIcon className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronRightIcon className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {expandedEndpoints.has(endpoint.id) && (
              <div className="px-6 pb-6 border-t border-slate-700/50 pt-4">
                {endpoint.description && (
                  <p className="text-slate-300 mb-4">{endpoint.description}</p>
                )}

                {/* Parameters */}
                {endpoint.parameters && endpoint.parameters.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-white mb-2">
                      Parameters
                    </h4>
                    <div className="space-y-2">
                      {endpoint.parameters.map((param, index) => (
                        <div
                          key={index}
                          className="bg-slate-700/30 rounded p-3"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-indigo-300">
                              {param.name}
                            </code>
                            <span className="text-xs text-slate-400">
                              ({param.in})
                            </span>
                            {param.required && (
                              <span className="text-xs text-red-400">
                                required
                              </span>
                            )}
                            <span className="text-xs text-slate-500">
                              {param.type}
                            </span>
                          </div>
                          {param.description && (
                            <p className="text-sm text-slate-400">
                              {param.description}
                            </p>
                          )}
                          {param.example && (
                            <code className="text-xs text-slate-500 block mt-1">
                              Example: {JSON.stringify(param.example)}
                            </code>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Request Body */}
                {endpoint.requestBody && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-white mb-2">
                      Request Body
                    </h4>
                    <div className="bg-slate-700/30 rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-slate-300">
                          {endpoint.requestBody.contentType}
                        </span>
                        {endpoint.requestBody.required && (
                          <span className="text-xs text-red-400">required</span>
                        )}
                      </div>
                      {endpoint.requestBody.example && (
                        <pre className="text-xs text-slate-400 bg-slate-900/50 rounded p-2 overflow-x-auto">
                          {JSON.stringify(
                            endpoint.requestBody.example,
                            null,
                            2
                          )}
                        </pre>
                      )}
                    </div>
                  </div>
                )}

                {/* Responses */}
                {endpoint.responses &&
                  Object.keys(endpoint.responses).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-2">
                        Responses
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(endpoint.responses).map(
                          ([status, response]) => (
                            <div
                              key={status}
                              className="bg-slate-700/30 rounded p-3"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`text-sm font-medium ${
                                    status.startsWith("2")
                                      ? "text-green-400"
                                      : status.startsWith("4")
                                      ? "text-yellow-400"
                                      : status.startsWith("5")
                                      ? "text-red-400"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {status}
                                </span>
                                <span className="text-sm text-slate-300">
                                  {response.description}
                                </span>
                              </div>
                              {response.example && (
                                <pre className="text-xs text-slate-400 bg-slate-900/50 rounded p-2 overflow-x-auto mt-2">
                                  {JSON.stringify(response.example, null, 2)}
                                </pre>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-slate-400">
          <DocumentTextIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No endpoint information available</p>
        </div>
      )}
    </div>
  );

  const renderAuthenticationTab = () => (
    <div className="space-y-6">
      <div className="bg-slate-800/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <KeyIcon className="w-5 h-5 text-indigo-400" />
          Authentication Method
        </h3>
        <div className="flex items-center gap-3 mb-4">
          <span
            className={`px-3 py-1 rounded-md text-sm font-medium ${getAuthColor(
              api.authentication?.type || "none"
            )}`}
          >
            {api.authentication?.type === "none"
              ? "No Authentication"
              : api.authentication?.type || "Unknown"}
          </span>
        </div>

        {api.authentication?.description && (
          <p className="text-slate-300 mb-4">
            {api.authentication.description}
          </p>
        )}

        {api.authentication?.type === "apiKey" && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1">
                Key Name
              </label>
              <p className="text-slate-400">
                {api.authentication.keyName || "API-Key"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1">
                Location
              </label>
              <p className="text-slate-400 capitalize">
                {api.authentication.keyLocation || "header"}
              </p>
            </div>
          </div>
        )}

        {api.authentication?.type === "oauth2" && api.authentication.scopes && (
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-2">
              Scopes
            </label>
            <div className="space-y-1">
              {api.authentication.scopes.map((scope, index) => (
                <span
                  key={index}
                  className="inline-block px-2 py-1 bg-slate-700/50 text-slate-300 rounded text-sm mr-2 mb-1"
                >
                  {scope}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderExamplesTab = () => (
    <div className="space-y-6">
      <div className="bg-slate-800/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Code Examples</h3>
        <p className="text-slate-400 mb-4">
          Here are some examples of how to use this API:
        </p>

        <div className="space-y-4">
          {/* JavaScript Example */}
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-2">
              JavaScript (fetch)
            </h4>
            <pre className="bg-slate-900/50 rounded p-4 text-sm text-slate-300 overflow-x-auto">
              {`fetch('${api.baseUrl}/endpoint', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    ${
      api.authentication?.type === "apiKey"
        ? `'${api.authentication.keyName || "API-Key"}': 'your-api-key'`
        : "// Add authentication headers"
    }
  }
})
.then(response => response.json())
.then(data => console.log(data));`}
            </pre>
          </div>

          {/* cURL Example */}
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-2">cURL</h4>
            <pre className="bg-slate-900/50 rounded p-4 text-sm text-slate-300 overflow-x-auto">
              {`curl -X GET "${api.baseUrl}/endpoint" \\
  -H "Content-Type: application/json" \\
  ${
    api.authentication?.type === "apiKey"
      ? `-H "${api.authentication.keyName || "API-Key"}: your-api-key"`
      : "# Add authentication headers"
  }`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );

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
              <div className="flex items-center gap-3">
                <GlobeAltIcon className="w-6 h-6 text-indigo-400" />
                <h1 className="text-xl font-bold text-white">{api.name}</h1>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-medium ${getPricingColor(
                      api.pricing || "free"
                    )}`}
                  >
                    <CurrencyDollarIcon className="w-3 h-3 inline mr-1" />
                    {api.pricing}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-medium ${getAuthColor(
                      api.authentication?.type || "none"
                    )}`}
                  >
                    <ShieldCheckIcon className="w-3 h-3 inline mr-1" />
                    {api.authentication?.type === "none"
                      ? "No Auth"
                      : api.authentication?.type}
                  </span>
                </div>
              </div>
              <p className="text-slate-400 mt-1">by {api.provider}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onToggleFavorite}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              {isFavorite ? (
                <StarIconSolid className="w-5 h-5 text-yellow-400" />
              ) : (
                <StarIcon className="w-5 h-5 text-slate-400 hover:text-yellow-400" />
              )}
            </button>

            <button
              onClick={onTest}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <BeakerIcon className="w-4 h-4" />
              Test API
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

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4">
          {[
            { id: "overview", label: "Overview", icon: DocumentTextIcon },
            { id: "endpoints", label: "Endpoints", icon: ServerIcon },
            { id: "authentication", label: "Authentication", icon: KeyIcon },
            { id: "examples", label: "Examples", icon: CodeBracketIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "overview" && renderOverviewTab()}
        {activeTab === "endpoints" && renderEndpointsTab()}
        {activeTab === "authentication" && renderAuthenticationTab()}
        {activeTab === "examples" && renderExamplesTab()}
      </div>
    </div>
  );
};

export default PublicAPIDetails;
