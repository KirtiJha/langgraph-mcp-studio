import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon,
  CloudIcon,
  ServerIcon,
  CpuChipIcon,
  SparklesIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  PlusIcon,
  CogIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { ModelConfig, LLMProvider, AvailableModel } from "../../shared/types";

interface ModelConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: ModelConfig;
  onSave: (config: ModelConfig) => void;
}

const PROVIDER_INFO = {
  watsonx: {
    name: "IBM Watsonx",
    icon: CpuChipIcon,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    description: "IBM's enterprise AI platform",
    requiresApiKey: true,
    requiresProjectId: true,
    supportsLocal: false,
  },
  openai: {
    name: "OpenAI",
    icon: SparklesIcon,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    description: "Leading AI models from OpenAI",
    requiresApiKey: true,
    requiresProjectId: false,
    supportsLocal: false,
  },
  anthropic: {
    name: "Anthropic",
    icon: CloudIcon,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    description: "Constitutional AI models",
    requiresApiKey: true,
    requiresProjectId: false,
    supportsLocal: false,
  },
  ollama: {
    name: "Ollama",
    icon: ServerIcon,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    description: "Local AI models",
    requiresApiKey: false,
    requiresProjectId: false,
    supportsLocal: true,
  },
  azure: {
    name: "Azure OpenAI",
    icon: CloudIcon,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    description: "Microsoft Azure OpenAI Service",
    requiresApiKey: true,
    requiresProjectId: false,
    supportsLocal: false,
  },
  cohere: {
    name: "Cohere",
    icon: GlobeAltIcon,
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    description: "Advanced language understanding",
    requiresApiKey: true,
    requiresProjectId: false,
    supportsLocal: false,
  },
  groq: {
    name: "Groq",
    icon: CpuChipIcon,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    description: "Ultra-fast AI inference",
    requiresApiKey: true,
    requiresProjectId: false,
    supportsLocal: false,
  },
} as const;

export const ModelConfigModal: React.FC<ModelConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<ModelConfig>>({
    id: config?.id || "",
    name: config?.name || "",
    provider: config?.provider || "openai",
    modelId: config?.modelId || "",
    enabled: config?.enabled ?? true,
    isDefault: config?.isDefault || false,
    config: config?.config || undefined,
    parameters: config?.parameters || {},
  });

  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Load available models when modal opens
      loadAvailableModels();
    }
  }, [isOpen]);

  const loadAvailableModels = async () => {
    try {
      if ((window as any).electron) {
        const models = await (window as any).electron.getAvailableModels();
        setAvailableModels(models);
      }
    } catch (error) {
      console.error("Failed to load available models:", error);
    }
  };

  const providerInfo = PROVIDER_INFO[formData.provider as LLMProvider];

  const handleProviderChange = (provider: LLMProvider) => {
    setFormData(prev => ({
      ...prev,
      provider,
      config: undefined,
      modelId: "",
      parameters: {},
    }));
    setTestResult(null);
  };

  const handleConfigChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...(prev.config as any || {}),
        [field]: value,
      } as any,
    }));
    setTestResult(null);
  };

  const handleParameterChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [field]: value,
      },
    }));
  };

  const testConnection = async () => {
    if (!formData.name || !formData.modelId) {
      setTestResult({ success: false, error: "Please fill in required fields" });
      return;
    }

    setTestingConnection(true);
    try {
      const testConfig: ModelConfig = {
        id: formData.id || "test",
        name: formData.name,
        provider: formData.provider as LLMProvider,
        modelId: formData.modelId,
        enabled: true,
        config: formData.config || {} as any,
        parameters: formData.parameters,
      };

      const result = await window.electronAPI.testModelConnection(testConfig);
      setTestResult(result);
    } catch (error: any) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.modelId) {
      setTestResult({ success: false, error: "Please fill in required fields" });
      return;
    }

    const modelConfig: ModelConfig = {
      id: formData.id || `${formData.provider}-${Date.now()}`,
      name: formData.name,
      provider: formData.provider as LLMProvider,
      modelId: formData.modelId,
      enabled: formData.enabled!,
      isDefault: formData.isDefault,
      config: formData.config as any,
      parameters: formData.parameters,
    };

    onSave(modelConfig);
    onClose();
  };

  const providerModels = availableModels.filter(model => model.provider === formData.provider);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[61]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${providerInfo.bgColor}`}>
                    <providerInfo.icon className={`w-5 h-5 ${providerInfo.color}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {config ? "Edit Model" : "Add Model"}
                    </h2>
                    <p className="text-sm text-gray-400">
                      Configure AI model for chat
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="space-y-6">
                  {/* Provider Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      AI Provider
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                        <button
                          key={key}
                          onClick={() => handleProviderChange(key as LLMProvider)}
                          className={`p-4 rounded-lg border transition-all text-left ${
                            formData.provider === key
                              ? "border-blue-500 bg-blue-500/10"
                              : "border-gray-600 hover:border-gray-500"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <info.icon className={`w-5 h-5 ${info.color}`} />
                            <div>
                              <div className="font-medium text-white text-sm">
                                {info.name}
                              </div>
                              <div className="text-xs text-gray-400">
                                {info.description}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Basic Configuration */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Configuration Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="My OpenAI Config"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Model ID
                      </label>
                      {providerModels.length > 0 ? (
                        <select
                          value={formData.modelId}
                          onChange={(e) => setFormData(prev => ({ ...prev, modelId: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          title="Select a model"
                        >
                          <option value="">Select a model</option>
                          {providerModels.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={formData.modelId}
                          onChange={(e) => setFormData(prev => ({ ...prev, modelId: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="gpt-4o"
                        />
                      )}
                    </div>
                  </div>

                  {/* Provider-specific Configuration */}
                  {formData.provider === "watsonx" && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-gray-300">Watsonx Configuration</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">
                            API Key
                          </label>
                          <div className="relative">
                            <input
                              type={showApiKey ? "text" : "password"}
                              value={(formData.config as any)?.apiKey || ""}
                              onChange={(e) => handleConfigChange("apiKey", e.target.value)}
                              className="w-full px-3 py-2 pr-10 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Your Watsonx API key"
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700 rounded"
                            >
                              {showApiKey ? (
                                <EyeSlashIcon className="w-4 h-4 text-gray-400" />
                              ) : (
                                <EyeIcon className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">
                            Project ID
                          </label>
                          <input
                            type="text"
                            value={(formData.config as any)?.projectId || ""}
                            onChange={(e) => handleConfigChange("projectId", e.target.value)}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Your project ID"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          Service URL (optional)
                        </label>
                        <input
                          type="text"
                          value={(formData.config as any)?.serviceUrl || ""}
                          onChange={(e) => handleConfigChange("serviceUrl", e.target.value)}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="https://us-south.ml.cloud.ibm.com"
                        />
                      </div>
                    </div>
                  )}

                  {formData.provider === "openai" && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-gray-300">OpenAI Configuration</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">
                            API Key
                          </label>
                          <div className="relative">
                            <input
                              type={showApiKey ? "text" : "password"}
                              value={(formData.config as any)?.apiKey || ""}
                              onChange={(e) => handleConfigChange("apiKey", e.target.value)}
                              className="w-full px-3 py-2 pr-10 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="sk-..."
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700 rounded"
                            >
                              {showApiKey ? (
                                <EyeSlashIcon className="w-4 h-4 text-gray-400" />
                              ) : (
                                <EyeIcon className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">
                            Organization ID (optional)
                          </label>
                          <input
                            type="text"
                            value={(formData.config as any)?.organizationId || ""}
                            onChange={(e) => handleConfigChange("organizationId", e.target.value)}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="org-..."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.provider === "anthropic" && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-gray-300">Anthropic Configuration</h3>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          API Key
                        </label>
                        <div className="relative">
                          <input
                            type={showApiKey ? "text" : "password"}
                            value={(formData.config as any)?.apiKey || ""}
                            onChange={(e) => handleConfigChange("apiKey", e.target.value)}
                            className="w-full px-3 py-2 pr-10 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="sk-ant-..."
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700 rounded"
                          >
                            {showApiKey ? (
                              <EyeSlashIcon className="w-4 h-4 text-gray-400" />
                            ) : (
                              <EyeIcon className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.provider === "ollama" && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-gray-300">Ollama Configuration</h3>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">
                          Base URL
                        </label>
                        <input
                          type="text"
                          value={(formData.config as any)?.baseURL || "http://localhost:11434"}
                          onChange={(e) => handleConfigChange("baseURL", e.target.value)}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="http://localhost:11434"
                        />
                      </div>
                    </div>
                  )}

                  {/* Model Parameters */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-300">Model Parameters</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="temperature" className="block text-xs font-medium text-gray-400 mb-1">
                          Temperature (0-2)
                        </label>
                        <input
                          id="temperature"
                          type="number"
                          min="0"
                          max="2"
                          step="0.1"
                          value={formData.parameters?.temperature || 0.7}
                          onChange={(e) => handleParameterChange("temperature", parseFloat(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label htmlFor="maxTokens" className="block text-xs font-medium text-gray-400 mb-1">
                          Max Tokens
                        </label>
                        <input
                          id="maxTokens"
                          type="number"
                          min="1"
                          max="32000"
                          value={formData.parameters?.maxTokens || 4000}
                          onChange={(e) => handleParameterChange("maxTokens", parseInt(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="enabled"
                        checked={formData.enabled}
                        onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="enabled" className="text-sm text-gray-300">
                        Enable this configuration
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="default"
                        checked={formData.isDefault}
                        onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="default" className="text-sm text-gray-300">
                        Set as default model
                      </label>
                    </div>
                  </div>

                  {/* Test Connection */}
                  <div className="space-y-3">
                    <button
                      onClick={testConnection}
                      disabled={testingConnection}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded-lg transition-colors"
                    >
                      {testingConnection ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CogIcon className="w-4 h-4" />
                      )}
                      {testingConnection ? "Testing..." : "Test Connection"}
                    </button>

                    {testResult && (
                      <div className={`flex items-center gap-2 p-3 rounded-lg ${
                        testResult.success ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                      }`}>
                        {testResult.success ? (
                          <CheckCircleIcon className="w-5 h-5" />
                        ) : (
                          <ExclamationTriangleIcon className="w-5 h-5" />
                        )}
                        <span className="text-sm">
                          {testResult.success ? "Connection successful!" : testResult.error}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {config ? "Update" : "Add"} Model
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
