import {
  ModelConfig,
  LLMProvider,
  WatsonxConfig,
  OpenAIConfig,
  AnthropicConfig,
  OllamaConfig,
  AzureConfig,
  CohereConfig,
  GroqConfig,
  AvailableModel,
  ModelCapabilities,
} from "../../shared/types";
import { ChatWatsonx } from "@langchain/community/chat_models/ibm";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { AzureChatOpenAI } from "@langchain/azure-openai";
import { ChatCohere } from "@langchain/cohere";
import { ChatGroq } from "@langchain/groq";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import Store from "electron-store";
import { LoggingService } from "./LoggingService";

export class ModelService {
  private store: Store;
  private loggingService: LoggingService;
  private modelInstances: Map<string, BaseChatModel> = new Map();

  constructor(store: Store, loggingService: LoggingService) {
    this.store = store;
    this.loggingService = loggingService;
  }

  // Get all saved model configurations
  getModelConfigs(): ModelConfig[] {
    return (this.store as any).get("modelConfigs", []) as ModelConfig[];
  }

  // Save a model configuration
  saveModelConfig(config: ModelConfig): void {
    const configs = this.getModelConfigs();
    const existingIndex = configs.findIndex((c) => c.id === config.id);

    if (existingIndex >= 0) {
      configs[existingIndex] = config;
    } else {
      configs.push(config);
    }

    // If this is set as default, remove default from others
    if (config.isDefault) {
      configs.forEach((c) => {
        if (c.id !== config.id) {
          c.isDefault = false;
        }
      });
    }

    (this.store as any).set("modelConfigs", configs);
    this.loggingService.log("Model configuration saved", {
      modelId: config.id,
      provider: config.provider,
      modelName: config.name,
    });

    // Clear cached instance if it exists
    this.modelInstances.delete(config.id);
  }

  // Delete a model configuration
  deleteModelConfig(configId: string): void {
    const configs = this.getModelConfigs();
    const filteredConfigs = configs.filter((c) => c.id !== configId);
    (this.store as any).set("modelConfigs", filteredConfigs);

    // Clear cached instance
    this.modelInstances.delete(configId);

    this.loggingService.log("Model configuration deleted", { configId });
  }

  // Set default model
  setDefaultModel(configId: string): void {
    const configs = this.getModelConfigs();
    configs.forEach((c) => {
      c.isDefault = c.id === configId;
    });
    (this.store as any).set("modelConfigs", configs);
    this.loggingService.log("Default model set", { configId });
  }

  // Get default model configuration
  getDefaultModel(): ModelConfig | null {
    const configs = this.getModelConfigs();
    return configs.find((c) => c.isDefault) || configs[0] || null;
  }

  // Test model connection
  async testModelConnection(
    config: ModelConfig
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const model = this.createModelInstance(config);

      // Try a simple test message
      const response = await model.invoke(
        "Hello, can you respond with just 'OK' to confirm you're working?"
      );

      return {
        success: true,
      };
    } catch (error: any) {
      this.loggingService.error("Model connection test failed", {
        modelId: config.id,
        provider: config.provider,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Create model instance
  createModelInstance(config: ModelConfig): BaseChatModel {
    // Check cache first
    const cached = this.modelInstances.get(config.id);
    if (cached) {
      return cached;
    }

    let model: BaseChatModel;

    switch (config.provider) {
      case "watsonx":
        model = this.createWatsonxModel(config);
        break;
      case "openai":
        model = this.createOpenAIModel(config);
        break;
      case "anthropic":
        model = this.createAnthropicModel(config);
        break;
      case "ollama":
        model = this.createOllamaModel(config);
        break;
      case "azure":
        model = this.createAzureModel(config) as any;
        break;
      case "cohere":
        model = this.createCohereModel(config);
        break;
      case "groq":
        model = this.createGroqModel(config);
        break;
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }

    // Cache the instance
    this.modelInstances.set(config.id, model);
    return model;
  }

  private createWatsonxModel(config: ModelConfig): ChatWatsonx {
    const watsonxConfig = config.config as WatsonxConfig;
    const params = config.parameters || {};

    return new ChatWatsonx({
      model: config.modelId,
      version: watsonxConfig.version || "2023-05-29",
      serviceUrl:
        watsonxConfig.serviceUrl || "https://us-south.ml.cloud.ibm.com",
      projectId: watsonxConfig.projectId,
      watsonxAIAuthType: "iam",
      watsonxAIApikey: watsonxConfig.apiKey,
      maxTokens: params.maxTokens || 8000,
      temperature: params.temperature || 0.1,
      topP: params.topP || 0.9,
      streaming: params.streaming || false,
    });
  }

  private createOpenAIModel(config: ModelConfig): ChatOpenAI {
    const openaiConfig = config.config as OpenAIConfig;
    const params = config.parameters || {};

    return new ChatOpenAI({
      modelName: config.modelId,
      openAIApiKey: openaiConfig.apiKey,
      ...(openaiConfig.organizationId && {
        organization: openaiConfig.organizationId,
      }),
      configuration: openaiConfig.baseURL
        ? {
            baseURL: openaiConfig.baseURL,
          }
        : undefined,
      maxTokens: params.maxTokens,
      temperature: params.temperature || 0.7,
      topP: params.topP,
      streaming: params.streaming || false,
    });
  }

  private createAnthropicModel(config: ModelConfig): ChatAnthropic {
    const anthropicConfig = config.config as AnthropicConfig;
    const params = config.parameters || {};

    return new ChatAnthropic({
      modelName: config.modelId,
      anthropicApiKey: anthropicConfig.apiKey,
      clientOptions: anthropicConfig.baseURL
        ? {
            baseURL: anthropicConfig.baseURL,
          }
        : undefined,
      maxTokens: params.maxTokens || 4000,
      temperature: params.temperature || 0.7,
      topP: params.topP,
      streaming: params.streaming || false,
    });
  }

  private createOllamaModel(config: ModelConfig): ChatOllama {
    const ollamaConfig = config.config as OllamaConfig;
    const params = config.parameters || {};

    return new ChatOllama({
      model: config.modelId,
      baseUrl: ollamaConfig.baseURL,
      keepAlive: ollamaConfig.keepAlive,
      temperature: params.temperature || 0.7,
      topP: params.topP,
      topK: params.topK,
      numPredict: params.maxTokens,
    });
  }

  private createAzureModel(config: ModelConfig): AzureChatOpenAI {
    const azureConfig = config.config as AzureConfig;
    const params = config.parameters || {};

    return new AzureChatOpenAI({
      azureOpenAIApiKey: azureConfig.apiKey,
      azureOpenAIEndpoint: azureConfig.endpoint,
      azureOpenAIApiDeploymentName:
        azureConfig.deploymentName || config.modelId,
      azureOpenAIApiVersion: azureConfig.apiVersion || "2024-02-01",
      maxTokens: params.maxTokens,
      temperature: params.temperature || 0.7,
      topP: params.topP,
      streaming: params.streaming || false,
    });
  }

  private createCohereModel(config: ModelConfig): ChatCohere {
    const cohereConfig = config.config as CohereConfig;
    const params = config.parameters || {};

    return new ChatCohere({
      model: config.modelId,
      apiKey: cohereConfig.apiKey,
      temperature: params.temperature || 0.7,
    });
  }

  private createGroqModel(config: ModelConfig): ChatGroq {
    const groqConfig = config.config as GroqConfig;
    const params = config.parameters || {};

    return new ChatGroq({
      model: config.modelId,
      apiKey: groqConfig.apiKey,
      maxTokens: params.maxTokens,
      temperature: params.temperature || 0.7,
      topP: params.topP,
      streaming: params.streaming || false,
    });
  }

  // Get available models for each provider
  getAvailableModels(): AvailableModel[] {
    const models: AvailableModel[] = [
      // Watsonx models
      {
        id: "ibm/granite-3-3-8b-instruct",
        name: "Granite 3.3 8B Instruct",
        provider: "watsonx",
        description:
          "IBM's Granite 3.3 8B parameter instruction-following model",
        capabilities: {
          supportsTools: true,
          supportsStreaming: true,
          supportsVision: false,
          contextWindow: 8192,
          maxOutputTokens: 8000,
        },
      },
      {
        id: "ibm/granite-3-3-70b-instruct",
        name: "Granite 3.3 70B Instruct",
        provider: "watsonx",
        description:
          "IBM's Granite 3.3 70B parameter instruction-following model",
        capabilities: {
          supportsTools: true,
          supportsStreaming: true,
          supportsVision: false,
          contextWindow: 8192,
          maxOutputTokens: 8000,
        },
      },

      // OpenAI models
      {
        id: "gpt-4o",
        name: "GPT-4o",
        provider: "openai",
        description: "OpenAI's most advanced multimodal model",
        capabilities: {
          supportsTools: true,
          supportsStreaming: true,
          supportsVision: true,
          contextWindow: 128000,
          maxOutputTokens: 4096,
        },
      },
      {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        provider: "openai",
        description: "Fast and efficient model for simple tasks",
        capabilities: {
          supportsTools: true,
          supportsStreaming: true,
          supportsVision: true,
          contextWindow: 128000,
          maxOutputTokens: 16384,
        },
      },
      {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        provider: "openai",
        description: "Fast, affordable model for simple tasks",
        capabilities: {
          supportsTools: true,
          supportsStreaming: true,
          supportsVision: false,
          contextWindow: 16384,
          maxOutputTokens: 4096,
        },
      },

      // Anthropic models
      {
        id: "claude-3-5-sonnet-20241022",
        name: "Claude 3.5 Sonnet",
        provider: "anthropic",
        description: "Anthropic's most advanced model for complex tasks",
        capabilities: {
          supportsTools: true,
          supportsStreaming: true,
          supportsVision: true,
          contextWindow: 200000,
          maxOutputTokens: 8192,
        },
      },
      {
        id: "claude-3-5-haiku-20241022",
        name: "Claude 3.5 Haiku",
        provider: "anthropic",
        description: "Fast and affordable model for simple tasks",
        capabilities: {
          supportsTools: true,
          supportsStreaming: true,
          supportsVision: true,
          contextWindow: 200000,
          maxOutputTokens: 8192,
        },
      },

      // Groq models
      {
        id: "llama-3.1-405b-reasoning",
        name: "Llama 3.1 405B",
        provider: "groq",
        description: "Meta's largest Llama model for complex reasoning",
        capabilities: {
          supportsTools: true,
          supportsStreaming: true,
          supportsVision: false,
          contextWindow: 131072,
          maxOutputTokens: 8000,
        },
      },
      {
        id: "llama-3.1-70b-versatile",
        name: "Llama 3.1 70B",
        provider: "groq",
        description: "Versatile model for various tasks",
        capabilities: {
          supportsTools: true,
          supportsStreaming: true,
          supportsVision: false,
          contextWindow: 131072,
          maxOutputTokens: 8000,
        },
      },
      {
        id: "llama-3.1-8b-instant",
        name: "Llama 3.1 8B",
        provider: "groq",
        description: "Fast model for simple tasks",
        capabilities: {
          supportsTools: true,
          supportsStreaming: true,
          supportsVision: false,
          contextWindow: 131072,
          maxOutputTokens: 8000,
        },
      },

      // Cohere models
      {
        id: "command-r-plus",
        name: "Command R+",
        provider: "cohere",
        description: "Cohere's most advanced model for complex tasks",
        capabilities: {
          supportsTools: true,
          supportsStreaming: true,
          supportsVision: false,
          contextWindow: 128000,
          maxOutputTokens: 4000,
        },
      },
      {
        id: "command-r",
        name: "Command R",
        provider: "cohere",
        description: "Balanced model for various tasks",
        capabilities: {
          supportsTools: true,
          supportsStreaming: true,
          supportsVision: false,
          contextWindow: 128000,
          maxOutputTokens: 4000,
        },
      },
    ];

    // Mark models as configured if they have valid configurations
    const configs = this.getModelConfigs();
    return models.map((model) => ({
      ...model,
      isConfigured: configs.some(
        (config) => config.provider === model.provider && config.enabled
      ),
    }));
  }

  // Get Ollama models
  async getOllamaModels(
    baseURL: string = "http://localhost:11434"
  ): Promise<AvailableModel[]> {
    try {
      const response = await fetch(`${baseURL}/api/tags`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return (
        data.models?.map((model: any) => ({
          id: model.name,
          name: model.name,
          provider: "ollama" as LLMProvider,
          description: `Local Ollama model (${model.size || "unknown size"})`,
          isLocal: true,
          capabilities: {
            supportsTools: true,
            supportsStreaming: true,
            supportsVision:
              model.name.includes("vision") || model.name.includes("llava"),
            contextWindow: 8192, // Default, actual may vary
            maxOutputTokens: 4096,
          },
        })) || []
      );
    } catch (error: any) {
      this.loggingService.error("Failed to fetch Ollama models", {
        baseURL,
        error: error.message,
      });
      return [];
    }
  }

  // Clear model instance cache
  clearCache(): void {
    this.modelInstances.clear();
    this.loggingService.log("Model instance cache cleared");
  }
}
