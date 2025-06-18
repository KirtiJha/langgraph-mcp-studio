import React from "react";
import { motion } from "framer-motion";
import {
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
} from "@heroicons/react/24/outline";
import {
  StarIcon as StarIconSolid,
  ShieldCheckIcon as ShieldCheckIconSolid,
} from "@heroicons/react/24/solid";

import { PublicAPISpec } from "../../shared/publicApiTypes";

interface PublicAPICardProps {
  api: PublicAPISpec;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onSelect: () => void;
  onTest: () => void;
  onConvertToMCP: () => void;
}

const PublicAPICard: React.FC<PublicAPICardProps> = ({
  api,
  isFavorite,
  onToggleFavorite,
  onSelect,
  onTest,
  onConvertToMCP,
}) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return CheckCircleIcon;
      case "deprecated":
        return ExclamationTriangleIcon;
      case "beta":
        return ClockIcon;
      default:
        return CheckCircleIcon;
    }
  };

  const StatusIcon = getStatusIcon(api.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/50 transition-all duration-200 group relative overflow-hidden"
    >
      {/* Featured Badge */}
      {api.featured && (
        <div className="absolute top-4 right-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-medium px-2 py-1 rounded-full">
          Featured
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <GlobeAltIcon className="w-5 h-5 text-indigo-400 flex-shrink-0" />
            <h3 className="text-lg font-semibold text-white truncate">
              {api.name}
            </h3>
            <StatusIcon
              className={`w-4 h-4 ${getStatusColor(api.status)} flex-shrink-0`}
            />
          </div>
          <p className="text-sm text-slate-400 mb-2">by {api.provider}</p>
          <p className="text-sm text-slate-300 line-clamp-2">
            {api.description}
          </p>
        </div>

        <button
          onClick={onToggleFavorite}
          className="ml-3 p-2 hover:bg-slate-700/50 rounded-lg transition-colors flex-shrink-0"
        >
          {isFavorite ? (
            <StarIconSolid className="w-5 h-5 text-yellow-400" />
          ) : (
            <StarIcon className="w-5 h-5 text-slate-400 hover:text-yellow-400" />
          )}
        </button>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Category */}
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700/50 text-slate-300 rounded-md text-xs">
          <TagIcon className="w-3 h-3" />
          {api.category}
        </span>

        {/* Pricing */}
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs ${getPricingColor(
            api.pricing || "free"
          )}`}
        >
          <CurrencyDollarIcon className="w-3 h-3" />
          {api.pricing}
        </span>

        {/* Authentication */}
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs ${getAuthColor(
            api.authentication?.type || "none"
          )}`}
        >
          <ShieldCheckIcon className="w-3 h-3" />
          {api.authentication?.type === "none"
            ? "No Auth"
            : api.authentication?.type || "Unknown"}
        </span>

        {/* Version */}
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700/50 text-slate-300 rounded-md text-xs">
          v{api.version}
        </span>
      </div>

      {/* Tags */}
      {api.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {api.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-xs"
            >
              {tag}
            </span>
          ))}
          {api.tags.length > 3 && (
            <span className="px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded text-xs">
              +{api.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {api.popularity && (
            <div className="flex items-center gap-1">
              <StarIcon className="w-3 h-3" />
              {api.popularity}
            </div>
          )}
          {api.endpoints && (
            <div className="flex items-center gap-1">
              <DocumentTextIcon className="w-3 h-3" />
              {api.endpoints.length} endpoints
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Details */}
          <button
            onClick={onSelect}
            className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-md text-xs transition-colors flex items-center gap-1"
          >
            <DocumentTextIcon className="w-3 h-3" />
            Details
          </button>

          {/* Test API */}
          <button
            onClick={onTest}
            className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 rounded-md text-xs transition-colors flex items-center gap-1"
          >
            <BeakerIcon className="w-3 h-3" />
            Test
          </button>

          {/* Convert to MCP */}
          <button
            onClick={onConvertToMCP}
            className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-purple-200 rounded-md text-xs transition-colors flex items-center gap-1"
          >
            <PlusIcon className="w-3 h-3" />
            MCP
          </button>
        </div>
      </div>

      {/* External Link */}
      {api.documentation && (
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <a
            href={api.documentation}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300 transition-colors"
          >
            <ArrowTopRightOnSquareIcon className="w-3 h-3" />
            Documentation
          </a>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl pointer-events-none" />
    </motion.div>
  );
};

export default PublicAPICard;
