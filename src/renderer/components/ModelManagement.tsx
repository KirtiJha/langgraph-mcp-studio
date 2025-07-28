import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  StarIcon,
  CloudIcon,
  ServerIcon,
  CpuChipIcon,
  SparklesIcon,
  GlobeAltIcon,
  CogIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { ModelConfig, LLMProvider, AvailableModel } from "../../shared/types";
import { ModelConfigModal } from "./ModelConfigModal";
import ConfirmDialog from "./ConfirmDialog";

const PROVIDER_INFO = {
  watsonx: {
    name: "IBM Watsonx",
    icon: CpuChipIcon,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  openai: {
    name: "OpenAI",
    icon: SparklesIcon,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
  },
  anthropic: {
    name: "Anthropic",
    icon: CloudIcon,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  ollama: {
    name: "Ollama",
    icon: ServerIcon,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
  },
  azure: {
    name: "Azure OpenAI",
    icon: CloudIcon,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
  },
  cohere: {
    name: "Cohere",
    icon: GlobeAltIcon,
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
  },
  groq: {
    name: "Groq",
    icon: CpuChipIcon,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
  },
} as const;

interface ModelManagementProps {
  className?: string;
}

export const ModelManagement: React.FC<ModelManagementProps> = ({ className = "" }) => {
  const [modelConfigs, setModelConfigs] = useState<ModelConfig[]>([]);
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ModelConfig | undefined>();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<ModelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [configs, models] = await Promise.all([
        window.electronAPI.getModelConfigs(),
        window.electronAPI.getAvailableModels(),
      ]);
      setModelConfigs(configs);
      setAvailableModels(models);
    } catch (error) {
      console.error("Failed to load model data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddModel = () => {
    setEditingConfig(undefined);
    setShowConfigModal(true);
  };

  const handleEditModel = (config: ModelConfig) => {
    setEditingConfig(config);
    setShowConfigModal(true);
  };

  const handleSaveModel = async (config: ModelConfig) => {
    try {
      await window.electronAPI.saveModelConfig(config);
      await loadData();
    } catch (error) {
      console.error("Failed to save model config:", error);
    }
  };

  const handleDeleteModel = (config: ModelConfig) => {
    setConfigToDelete(config);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!configToDelete) return;
    
    try {
      await window.electronAPI.deleteModelConfig(configToDelete.id);
      await loadData();
    } catch (error) {
      console.error("Failed to delete model config:", error);
    } finally {
      setShowDeleteDialog(false);
      setConfigToDelete(null);
    }
  };

  const handleSetDefault = async (config: ModelConfig) => {
    try {
      await window.electronAPI.setDefaultModel(config.id);
      await loadData();
    } catch (error) {
      console.error("Failed to set default model:", error);
    }
  };

  const toggleApiKeyVisibility = (configId: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [configId]: !prev[configId],
    }));
  };

  const getApiKey = (config: ModelConfig): string => {
    const configData = config.config as any;
    return configData?.apiKey || "";
  };

  const getMaskedApiKey = (apiKey: string): string => {
    if (!apiKey) return "";
    if (apiKey.length <= 8) return "••••••••";
    return apiKey.slice(0, 4) + "••••••••" + apiKey.slice(-4);
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">AI Models</h2>
            <p className="text-gray-400 text-sm">Configure and manage AI models for chat</p>
          </div>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">AI Models</h2>
          <p className="text-gray-400 text-sm">Configure and manage AI models for chat</p>
        </div>
        <button
          onClick={handleAddModel}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          aria-label="Add new AI model"
        >
          <PlusIcon className="w-4 h-4" />
          Add Model
        </button>
      </div>

      {/* Model Configurations */}
      {modelConfigs.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 border border-gray-700 rounded-lg">
          <CogIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Models Configured</h3>
          <p className="text-gray-400 mb-6">
            Add your first AI model to start using the chat functionality.
          </p>
          <button
            onClick={handleAddModel}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
            aria-label="Add your first AI model"
          >
            <PlusIcon className="w-4 h-4" />
            Add Your First Model
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {modelConfigs.map((config) => {
            const providerInfo = PROVIDER_INFO[config.provider];
            const apiKey = getApiKey(config);
            const showKey = showApiKeys[config.id];

            return (
              <motion.div
                key={config.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-gray-800 border rounded-lg p-4 transition-all ${
                  config.enabled ? "border-gray-700" : "border-gray-800 opacity-60"
                } ${
                  config.isDefault ? "ring-2 ring-blue-500/50" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Provider Icon */}
                    <div className={`p-2 rounded-lg ${providerInfo.bgColor} flex-shrink-0`}>
                      <providerInfo.icon className={`w-5 h-5 ${providerInfo.color}`} />
                    </div>

                    {/* Model Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-white truncate">
                          {config.name}
                        </h3>
                        {config.isDefault && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-full text-xs">
                            <StarIconSolid className="w-3 h-3" />
                            Default
                          </div>
                        )}
                        {!config.enabled && (
                          <div className="px-2 py-1 bg-gray-600/50 text-gray-400 rounded-full text-xs">
                            Disabled
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-400">
                        <div className="flex items-center gap-4">
                          <span>
                            <span className="font-medium">Provider:</span> {providerInfo.name}
                          </span>
                          <span>
                            <span className="font-medium">Model:</span> {config.modelId}
                          </span>
                        </div>
                        
                        {apiKey && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">API Key:</span>
                            <span className="font-mono text-xs">
                              {showKey ? apiKey : getMaskedApiKey(apiKey)}
                            </span>
                            <button
                              onClick={() => toggleApiKeyVisibility(config.id)}
                              className="p-1 hover:bg-gray-700 rounded transition-colors"
                              aria-label={showKey ? "Hide API key" : "Show API key"}
                            >
                              {showKey ? (
                                <EyeSlashIcon className="w-3 h-3" />
                              ) : (
                                <EyeIcon className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}

                        {config.parameters && Object.keys(config.parameters).length > 0 && (
                          <div className="flex items-center gap-4 text-xs">
                            {config.parameters.temperature !== undefined && (
                              <span>Temperature: {config.parameters.temperature}</span>
                            )}
                            {config.parameters.maxTokens && (
                              <span>Max Tokens: {config.parameters.maxTokens}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!config.isDefault && (
                      <button
                        onClick={() => handleSetDefault(config)}
                        className="p-2 hover:bg-gray-700 text-gray-400 hover:text-yellow-400 rounded-lg transition-colors"
                        title="Set as default"
                        aria-label={`Set ${config.name} as default model`}
                      >
                        <StarIcon className="w-4 h-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleEditModel(config)}
                      className="p-2 hover:bg-gray-700 text-gray-400 hover:text-blue-400 rounded-lg transition-colors"
                      title="Edit model"
                      aria-label={`Edit ${config.name} model configuration`}
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteModel(config)}
                      className="p-2 hover:bg-gray-700 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                      title="Delete model"
                      aria-label={`Delete ${config.name} model configuration`}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Model Configuration Modal */}
      <ModelConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        config={editingConfig}
        onSave={handleSaveModel}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onCancel={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="Delete Model Configuration"
        message={`Are you sure you want to delete "${configToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  );
};
