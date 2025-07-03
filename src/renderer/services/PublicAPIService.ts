import {
  PublicAPISpec,
  PublicAPIEndpoint,
  PublicAPICategory,
  PublicAPISearchFilters,
  PublicAPITestRequest,
  PublicAPITestResponse,
  PublicAPISource,
} from "../../shared/publicApiTypes";

class PublicAPIService {
  private static instance: PublicAPIService;
  private cache: {
    apis: PublicAPISpec[];
    categories: PublicAPICategory[];
    lastFetched: number;
    sources: PublicAPISource[];
  } = {
    apis: [],
    categories: [],
    lastFetched: 0,
    sources: [],
  };

  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 10000; // Maximum number of APIs to cache

  // CORS proxy configuration
  private corsProxyUrl = "https://cors-anywhere.herokuapp.com/";
  private useCorsProxy = true;

  public static getInstance(): PublicAPIService {
    if (!PublicAPIService.instance) {
      PublicAPIService.instance = new PublicAPIService();
    }
    return PublicAPIService.instance;
  }

  private constructor() {
    this.loadFromStorage();
    this.initializeSources();
  }

  private initializeSources(): void {
    this.cache.sources = [
      {
        id: "apis-guru",
        name: "APIs.guru",
        url: "https://api.apis.guru/v2/list.json",
        description: "Directory of OpenAPI specs for public APIs",
        parser: "apisGuru",
        enabled: true,
      },
      {
        id: "public-apis",
        name: "Public APIs",
        url: "https://api.publicapis.org/entries",
        description: "Collective list of free APIs",
        parser: "publicApis",
        enabled: true,
      },
    ];
  }

  private loadFromStorage(): void {
    try {
      const cached = localStorage.getItem("mcp_studio_public_apis");
      if (cached) {
        const data = JSON.parse(cached);
        this.cache = { ...this.cache, ...data };
      }
    } catch (error) {
      console.error("Failed to load cached APIs:", error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(
        "mcp_studio_public_apis",
        JSON.stringify({
          apis: this.cache.apis.slice(0, this.MAX_CACHE_SIZE),
          categories: this.cache.categories,
          lastFetched: this.cache.lastFetched,
        })
      );
    } catch (error) {
      console.error("Failed to save APIs to cache:", error);
    }
  }

  private isCacheValid(): boolean {
    return Date.now() - this.cache.lastFetched < this.CACHE_DURATION;
  }

  async fetchAllAPIs(
    forceRefresh = false,
    limit?: number // Remove default limit, make it optional
  ): Promise<PublicAPISpec[]> {
    if (!forceRefresh && this.isCacheValid() && this.cache.apis.length > 0) {
      return this.cache.apis;
    }

    try {
      console.log(`Fetching public APIs from sources (limit: ${limit})...`);
      const allAPIs: PublicAPISpec[] = [];
      const categories = new Set<string>();

      // Fetch from all enabled sources with pagination
      for (const source of this.cache.sources.filter((s) => s.enabled)) {
        try {
          const apis = await this.fetchFromSource(source, limit);
          allAPIs.push(...apis);
          apis.forEach((api) => categories.add(api.category));

          // Update source info
          source.lastFetched = new Date().toISOString();
          source.apiCount = apis.length;
        } catch (error) {
          console.error(`Failed to fetch from ${source.name}:`, error);
        }
      }

      // Remove duplicates based on baseUrl
      const uniqueAPIs = this.removeDuplicates(allAPIs);

      // Generate categories
      const categoryList = this.generateCategories(
        Array.from(categories),
        uniqueAPIs
      );

      this.cache.apis = uniqueAPIs;
      this.cache.categories = categoryList;
      this.cache.lastFetched = Date.now();

      this.saveToStorage();

      console.log(
        `Fetched ${uniqueAPIs.length} unique APIs from ${this.cache.sources.length} sources`
      );
      return uniqueAPIs;
    } catch (error) {
      console.error("Failed to fetch public APIs:", error);
      throw error;
    }
  }

  private async fetchFromSource(
    source: PublicAPISource,
    limit?: number
  ): Promise<PublicAPISpec[]> {
    try {
      const response = await fetch(source.url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "MCP Studio/1.0.0",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      let apis: PublicAPISpec[];
      switch (source.parser) {
        case "apisGuru":
          apis = this.parseAPIsGuru(data, limit);
          break;
        case "publicApis":
          apis = this.parsePublicAPIs(data, limit);
          break;
        default:
          throw new Error(`Unknown parser: ${source.parser}`);
      }

      return apis;
    } catch (error) {
      console.error(`Error fetching from ${source.name}:`, error);
      throw error;
    }
  }

  private parseAPIsGuru(data: any, limit?: number): PublicAPISpec[] {
    const apis: PublicAPISpec[] = [];
    const entries = Object.entries(data);

    // Apply limit to entries if specified
    const limitedEntries = limit ? entries.slice(0, limit) : entries;

    limitedEntries.forEach(([key, value]: [string, any]) => {
      try {
        const versions = value.versions || {};
        const latestVersion = Object.keys(versions).sort().pop();
        if (!latestVersion) return;
        const versionData = versions[latestVersion];

        if (!versionData) return;

        const info = versionData.info || {};
        const api: PublicAPISpec = {
          id: `guru-${key.replace(/\./g, "-")}`,
          name: info.title || key,
          description: info.description || "",
          version: latestVersion || "1.0.0",
          category: this.categorizeAPI(info.title, info.description, key),
          baseUrl: this.extractBaseUrl(versionData.swaggerUrl || ""),
          provider: key.split(".")[0] || "Unknown",
          tags: info["x-tags"] || [],
          documentation: info.externalDocs?.url,
          authentication: this.inferAuthentication(versionData),
          contact: info.contact,
          license: info.license,
          openApiSpec: versionData.swaggerUrl,
          pricing: this.inferPricing(info),
          status: "active",
          lastUpdated: versionData.updated || new Date().toISOString(),
          popularity: this.calculatePopularity(key, info),
          featured: this.isFeaturedAPI(key, info),
        };

        apis.push(api);
      } catch (error) {
        console.error(`Error parsing API ${key}:`, error);
      }
    });

    return apis;
  }

  private parsePublicAPIs(data: any, limit?: number): PublicAPISpec[] {
    const apis: PublicAPISpec[] = [];
    const entries = data.entries || [];

    // Apply limit to entries if specified
    const limitedEntries = limit ? entries.slice(0, limit) : entries;

    limitedEntries.forEach((entry: any, index: number) => {
      try {
        const api: PublicAPISpec = {
          id: `public-${
            entry.API?.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase() || index
          }`,
          name: entry.API || "Unknown API",
          description: entry.Description || "",
          version: "1.0.0",
          category: entry.Category || "Other",
          baseUrl: entry.Link || "",
          provider: entry.API || "Unknown",
          tags: entry.Category ? [entry.Category] : [],
          authentication: {
            type: this.mapAuthType(entry.Auth) as
              | "none"
              | "apiKey"
              | "oauth2"
              | "basic"
              | "bearer",
            description: entry.Auth,
          },
          pricing: "free",
          status: "active",
          lastUpdated: new Date().toISOString(),
          popularity: this.calculatePopularityFromPublicAPI(entry),
          featured: entry.Category === "Finance" || entry.Category === "Social",
        };

        apis.push(api);
      } catch (error) {
        console.error(`Error parsing public API entry:`, error);
      }
    });

    return apis;
  }

  private removeDuplicates(apis: PublicAPISpec[]): PublicAPISpec[] {
    const seen = new Set<string>();
    return apis.filter((api) => {
      const key = `${api.baseUrl}-${api.name}`.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private generateCategories(
    categoryNames: string[],
    apis: PublicAPISpec[]
  ): PublicAPICategory[] {
    const categories: PublicAPICategory[] = [];

    categoryNames.forEach((name) => {
      const count = apis.filter((api) => api.category === name).length;
      categories.push({
        id: name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        name,
        description: this.getCategoryDescription(name),
        count,
        featured: ["Finance", "Social", "Data", "AI", "Weather"].includes(name),
      });
    });

    return categories.sort((a, b) => b.count - a.count);
  }

  private categorizeAPI(
    title: string,
    description: string,
    key: string
  ): string {
    const text = `${title} ${description} ${key}`.toLowerCase();

    if (text.includes("weather") || text.includes("climate")) return "Weather";
    if (
      text.includes("finance") ||
      text.includes("banking") ||
      text.includes("payment")
    )
      return "Finance";
    if (
      text.includes("social") ||
      text.includes("twitter") ||
      text.includes("facebook")
    )
      return "Social";
    if (
      text.includes("map") ||
      text.includes("location") ||
      text.includes("geo")
    )
      return "Maps";
    if (text.includes("news") || text.includes("media")) return "News";
    if (
      text.includes("music") ||
      text.includes("video") ||
      text.includes("entertainment")
    )
      return "Entertainment";
    if (text.includes("data") || text.includes("analytics")) return "Data";
    if (
      text.includes("ai") ||
      text.includes("machine learning") ||
      text.includes("ml")
    )
      return "AI";
    if (text.includes("translate") || text.includes("language"))
      return "Language";
    if (text.includes("game") || text.includes("gaming")) return "Gaming";
    if (text.includes("ecommerce") || text.includes("shopping"))
      return "eCommerce";
    if (text.includes("health") || text.includes("medical")) return "Health";
    if (text.includes("travel") || text.includes("transport")) return "Travel";
    if (text.includes("crypto") || text.includes("blockchain"))
      return "Cryptocurrency";
    if (text.includes("security") || text.includes("auth")) return "Security";

    return "Other";
  }

  private extractBaseUrl(swaggerUrl: string): string {
    try {
      const url = new URL(swaggerUrl);
      return `${url.protocol}//${url.host}`;
    } catch {
      return swaggerUrl;
    }
  }

  private inferAuthentication(versionData: any): any {
    // Try to infer from OpenAPI spec
    if (versionData.swaggerUrl) {
      // Special handling for common API providers
      const url = versionData.swaggerUrl || "";

      if (url.includes("microsoft.com") || url.includes("cognitive")) {
        return {
          type: "apiKey",
          description: "Microsoft Cognitive Services API Key",
          headerName: "Ocp-Apim-Subscription-Key",
        };
      } else if (url.includes("google.com") || url.includes("googleapis")) {
        return {
          type: "apiKey",
          description: "Google API Key",
          headerName: "X-API-Key",
        };
      } else if (url.includes("github.com")) {
        return {
          type: "bearer",
          description: "GitHub Personal Access Token",
        };
      }

      return { type: "apiKey", description: "API Key required" };
    }
    return { type: "none" };
  }

  private inferPricing(info: any): "free" | "freemium" | "paid" {
    const text = (info.description || "").toLowerCase();
    if (text.includes("free") || text.includes("open")) return "free";
    if (text.includes("premium") || text.includes("paid")) return "paid";
    return "freemium";
  }

  private mapAuthType(auth: string): string {
    if (!auth || auth === "None" || auth === "") return "none";
    if (auth.includes("API Key") || auth.includes("apiKey")) return "apiKey";
    if (auth.includes("OAuth")) return "oauth2";
    if (auth.includes("Bearer")) return "bearer";
    return "apiKey";
  }

  private calculatePopularity(key: string, info: any): number {
    let score = 0;

    // Popular providers get higher scores
    const popularProviders = [
      "google",
      "github",
      "twitter",
      "facebook",
      "stripe",
      "aws",
    ];
    if (popularProviders.some((provider) => key.includes(provider)))
      score += 50;

    // APIs with good documentation
    if (info.externalDocs) score += 20;

    // APIs with contact info
    if (info.contact) score += 10;

    // Random component for variety
    score += Math.random() * 30;

    return Math.floor(score);
  }

  private calculatePopularityFromPublicAPI(entry: any): number {
    let score = 0;

    // Popular categories
    const popularCategories = [
      "Finance",
      "Social",
      "Weather",
      "News",
      "Entertainment",
    ];
    if (popularCategories.includes(entry.Category)) score += 30;

    // Free APIs are more popular
    if (entry.Auth === "None" || entry.Auth === "") score += 20;

    // HTTPS gets bonus
    if (entry.Link?.startsWith("https://")) score += 10;

    score += Math.random() * 40;

    return Math.floor(score);
  }

  private isFeaturedAPI(key: string, info: any): boolean {
    const featuredAPIs = [
      "google",
      "github",
      "stripe",
      "twitter",
      "openweather",
    ];
    return featuredAPIs.some((api) => key.includes(api));
  }

  private getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      Weather: "Weather forecasts and climate data",
      Finance: "Financial data and payment processing",
      Social: "Social media and networking",
      Maps: "Location and mapping services",
      News: "News and media content",
      Entertainment: "Music, videos, and entertainment",
      Data: "Data analysis and datasets",
      AI: "Artificial intelligence and machine learning",
      Language: "Translation and language processing",
      Gaming: "Game data and gaming platforms",
      eCommerce: "Online shopping and marketplace",
      Health: "Healthcare and medical data",
      Travel: "Travel and transportation",
      Cryptocurrency: "Blockchain and cryptocurrency",
      Security: "Authentication and security",
    };

    return descriptions[category] || "Miscellaneous APIs";
  }

  async searchAPIs(
    filters: PublicAPISearchFilters,
    offset = 0,
    limit = 50
  ): Promise<{
    apis: PublicAPISpec[];
    total: number;
    hasMore: boolean;
  }> {
    let apis = this.cache.apis;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      apis = apis.filter(
        (api) =>
          api.name.toLowerCase().includes(searchLower) ||
          api.description.toLowerCase().includes(searchLower) ||
          api.tags.some((tag) => tag.toLowerCase().includes(searchLower)) ||
          api.provider.toLowerCase().includes(searchLower)
      );
    }

    if (filters.category) {
      apis = apis.filter((api) => api.category === filters.category);
    }

    if (filters.pricing) {
      apis = apis.filter((api) => api.pricing === filters.pricing);
    }

    if (filters.authentication) {
      apis = apis.filter(
        (api) => api.authentication?.type === filters.authentication
      );
    }

    if (filters.status) {
      apis = apis.filter((api) => api.status === filters.status);
    }

    if (filters.tags && filters.tags.length > 0) {
      apis = apis.filter((api) =>
        filters.tags!.some((tag) =>
          api.tags.some((apiTag) =>
            apiTag.toLowerCase().includes(tag.toLowerCase())
          )
        )
      );
    }

    // Sort by popularity and featured status
    apis = apis.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return (b.popularity || 0) - (a.popularity || 0);
    });

    const total = apis.length;
    const paginatedAPIs = apis.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      apis: paginatedAPIs,
      total,
      hasMore,
    };
  }

  // Legacy method for backward compatibility
  async searchAPIsLegacy(
    filters: PublicAPISearchFilters
  ): Promise<PublicAPISpec[]> {
    const result = await this.searchAPIs(filters, 0, 1000);
    return result.apis;
  }

  async getCategories(): Promise<PublicAPICategory[]> {
    if (this.cache.categories.length === 0) {
      await this.fetchAllAPIs();
    }
    return this.cache.categories;
  }

  async getAPIById(id: string): Promise<PublicAPISpec | null> {
    // Use the more robust fetchAPIWithDetails method
    return this.fetchAPIWithDetails(id);
  }

  private async fetchOpenAPISpec(url: string): Promise<any> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAPI spec: ${response.statusText}`);
    }
    return response.json();
  }

  private parseEndpoints(spec: any): any[] {
    const endpoints: any[] = [];
    const paths = spec.paths || {};

    Object.entries(paths).forEach(([path, methods]: [string, any]) => {
      Object.entries(methods).forEach(([method, operation]: [string, any]) => {
        if (typeof operation === "object" && operation.operationId) {
          endpoints.push({
            id: operation.operationId || `${method}-${path}`,
            path,
            method: method.toUpperCase(),
            summary: operation.summary || "",
            description: operation.description || "",
            parameters: operation.parameters || [],
            requestBody: operation.requestBody,
            responses: operation.responses || {},
            tags: operation.tags || [],
            deprecated: operation.deprecated || false,
          });
        }
      });
    });

    return endpoints;
  }

  async testAPI(request: PublicAPITestRequest): Promise<PublicAPITestResponse> {
    const startTime = Date.now();

    try {
      const url = new URL(request.url);

      // Add query parameters
      if (request.queryParams) {
        Object.entries(request.queryParams).forEach(([key, value]) => {
          url.searchParams.set(key, value);
        });
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...request.headers,
      };

      // Add authentication
      if (request.authentication) {
        switch (request.authentication.type) {
          case "bearer":
            headers.Authorization = `Bearer ${request.authentication.credentials.token}`;
            break;
          case "apiKey":
            const headerName =
              request.authentication.credentials.headerName ||
              (request.authentication as any).headerName ||
              "X-API-Key";
            headers[headerName] = request.authentication.credentials.key;
            break;
          case "basic":
            const basicAuth = btoa(
              `${request.authentication.credentials.username}:${request.authentication.credentials.password}`
            );
            headers.Authorization = `Basic ${basicAuth}`;
            break;
        }
      }

      // Check if we're in Electron environment
      const isElectron =
        typeof window !== "undefined" && (window as any).electronAPI;

      let response: any;

      if (isElectron) {
        // Use Electron's main process to bypass CORS
        response = await (window as any).electronAPI.testPublicApi({
          url: url.toString(),
          method: request.method || "GET",
          headers,
          body: request.body,
        });

        // Convert Electron response to fetch-like response
        const responseTime = Date.now() - startTime;
        let data: any;

        if (response.data) {
          try {
            data = JSON.parse(response.data);
          } catch {
            data = response.data;
          }
        }

        return {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers || {},
          data,
          responseTime,
          size: response.data ? new Blob([response.data]).size : 0,
          timestamp: new Date().toISOString(),
          error: response.error,
        };
      } else {
        // Fallback to browser fetch with CORS proxy for web environment
        const finalUrl = this.useCorsProxy
          ? `${this.corsProxyUrl}${url.toString()}`
          : url.toString();

        // Add CORS proxy headers if using proxy
        if (this.useCorsProxy) {
          headers["X-Requested-With"] = "XMLHttpRequest";
        }

        const fetchResponse = await fetch(finalUrl, {
          method: request.method,
          headers,
          body: request.body ? JSON.stringify(request.body) : undefined,
        });

        const responseTime = Date.now() - startTime;
        const responseHeaders: Record<string, string> = {};
        fetchResponse.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        let data: any;
        const contentType = fetchResponse.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          data = await fetchResponse.json();
        } else {
          data = await fetchResponse.text();
        }

        const responseText = JSON.stringify(data);

        return {
          status: fetchResponse.status,
          statusText: fetchResponse.statusText,
          headers: responseHeaders,
          data,
          responseTime,
          size: new Blob([responseText]).size,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      return {
        status: 0,
        statusText: "Network Error",
        headers: {},
        data: null,
        responseTime: Date.now() - startTime,
        size: 0,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // CORS proxy management
  setCorsProxy(enabled: boolean, customUrl?: string) {
    this.useCorsProxy = enabled;
    if (customUrl) {
      this.corsProxyUrl = customUrl.endsWith("/") ? customUrl : `${customUrl}/`;
    }
  }

  getCorsProxyStatus() {
    return {
      enabled: this.useCorsProxy,
      url: this.corsProxyUrl,
    };
  }

  clearCache(): void {
    this.cache = {
      apis: [],
      categories: [],
      lastFetched: 0,
      sources: [],
    };
    localStorage.removeItem("mcp_studio_public_apis");
    this.initializeSources();
  }

  getCacheInfo(): { size: number; lastFetched: number; apiCount: number } {
    return {
      size: JSON.stringify(this.cache).length,
      lastFetched: this.cache.lastFetched,
      apiCount: this.cache.apis.length,
    };
  }

  // Method to fetch OpenAPI spec and extract endpoints
  async fetchAPIEndpoints(
    api: PublicAPISpec
  ): Promise<{ baseUrl: string; endpoints: PublicAPIEndpoint[] }> {
    if (!api.openApiSpec) {
      throw new Error("No OpenAPI specification URL available");
    }

    try {
      console.log(`🔍 Fetching OpenAPI spec for ${api.name}:`, api.openApiSpec);

      // Check if we're in Electron environment
      const isElectron =
        typeof window !== "undefined" && (window as any).electronAPI;

      let response: any;

      if (isElectron) {
        // Use Electron's main process to bypass CORS
        response = await (window as any).electronAPI.testPublicApi({
          url: api.openApiSpec,
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`
          );
        }

        const specData = JSON.parse(response.data);
        return this.parseOpenAPISpec(specData, api);
      } else {
        // Fallback to direct fetch (may have CORS issues)
        const fetchResponse = await fetch(api.openApiSpec);
        if (!fetchResponse.ok) {
          throw new Error(
            `Failed to fetch OpenAPI spec: ${fetchResponse.status} ${fetchResponse.statusText}`
          );
        }

        const specData = await fetchResponse.json();
        return this.parseOpenAPISpec(specData, api);
      }
    } catch (error) {
      console.warn(
        `⚠️ Could not fetch OpenAPI spec for ${api.name} (CORS/Network restriction):`,
        error
      );
      // Return fallback data with basic endpoint info
      return {
        baseUrl: api.baseUrl || "",
        endpoints: [
          {
            id: "default",
            path: "/",
            method: "GET",
            summary: "Default endpoint",
            description: "Unable to fetch endpoints from OpenAPI spec",
            responses: {
              "200": {
                description: "Successful response",
              },
            },
          },
        ],
      };
    }
  }

  private parseOpenAPISpec(
    spec: any,
    api: PublicAPISpec
  ): { baseUrl: string; endpoints: PublicAPIEndpoint[] } {
    const baseUrl = this.extractBaseUrlFromSpec(spec);
    const endpoints: PublicAPIEndpoint[] = [];

    // Parse paths from OpenAPI spec
    const paths = spec.paths || {};
    let endpointId = 0;

    // Get global parameters that apply to all endpoints
    const globalParameters = this.parseParameters(spec.parameters || []);

    Object.entries(paths).forEach(([path, pathData]: [string, any]) => {
      // Get path-level parameters
      const pathParameters = this.parseParameters(pathData.parameters || []);

      Object.entries(pathData).forEach(
        ([method, methodData]: [string, any]) => {
          if (
            [
              "get",
              "post",
              "put",
              "delete",
              "patch",
              "head",
              "options",
            ].includes(method.toLowerCase())
          ) {
            // Combine global, path-level, and operation-level parameters
            const allParameters = [
              ...globalParameters,
              ...pathParameters,
              ...this.parseParameters(methodData.parameters || []),
            ];

            // Remove duplicates (operation-level parameters override path-level and global)
            const uniqueParameters = allParameters.reduce((acc, param) => {
              const existing = acc.find(
                (p) => p.name === param.name && p.in === param.in
              );
              if (!existing) {
                acc.push(param);
              }
              return acc;
            }, [] as any[]);

            const endpoint: PublicAPIEndpoint = {
              id: `${api.id}-endpoint-${endpointId++}`,
              path: path,
              method: method.toUpperCase() as any,
              summary: methodData.summary || `${method.toUpperCase()} ${path}`,
              description: methodData.description || "",
              parameters: uniqueParameters,
              responses: this.parseResponses(methodData.responses || {}),
            };

            console.log(
              `📝 Parsed endpoint ${endpoint.method} ${endpoint.path} with ${uniqueParameters.length} parameters:`,
              uniqueParameters.map(
                (p) =>
                  `${p.name} (${p.in}, ${p.required ? "required" : "optional"})`
              )
            );

            endpoints.push(endpoint);
          }
        }
      );
    });

    console.log(`🔍 Parsed ${endpoints.length} endpoints for ${api.name}`);
    return { baseUrl, endpoints };
  }

  private extractBaseUrlFromSpec(spec: any): string {
    // Try different ways to extract base URL from OpenAPI spec
    if (spec.servers && spec.servers.length > 0) {
      return spec.servers[0].url;
    }

    if (spec.host) {
      const scheme = spec.schemes?.[0] || "https";
      const basePath = spec.basePath || "";
      return `${scheme}://${spec.host}${basePath}`;
    }

    // Fallback
    return "";
  }

  private parseParameters(parameters: any[]): Array<{
    name: string;
    in: "query" | "header" | "path" | "cookie";
    required: boolean;
    type: string;
    description?: string;
    enum?: string[];
    minimum?: number;
    maximum?: number;
  }> {
    if (!parameters || !Array.isArray(parameters)) {
      return [];
    }

    return parameters.map((param) => {
      // Handle OpenAPI 3.0 style parameters (with schema)
      const schema = param.schema || {};
      const type = param.type || schema.type || "string";

      return {
        name: param.name || "",
        in: param.in || "query",
        required: param.required || false,
        type: type,
        description: param.description || "",
        enum: param.enum || schema.enum,
        minimum: param.minimum || schema.minimum,
        maximum: param.maximum || schema.maximum,
      };
    });
  }

  private parseResponses(responses: any): {
    [statusCode: string]: { description: string; schema?: any; example?: any };
  } {
    const parsedResponses: {
      [statusCode: string]: {
        description: string;
        schema?: any;
        example?: any;
      };
    } = {};

    Object.entries(responses).forEach(
      ([statusCode, responseData]: [string, any]) => {
        parsedResponses[statusCode] = {
          description: responseData.description || `${statusCode} response`,
          schema: responseData.schema || responseData.content,
          example: responseData.example || responseData.examples,
        };
      }
    );

    // Ensure at least one response
    if (Object.keys(parsedResponses).length === 0) {
      parsedResponses["200"] = {
        description: "Successful response",
      };
    }

    return parsedResponses;
  }

  /**
   * Fetch detailed API information including endpoints from OpenAPI spec
   */
  async fetchAPIWithDetails(apiId: string): Promise<PublicAPISpec | null> {
    // First try to find the API in cache
    const cachedAPI = this.cache.apis.find((api) => api.id === apiId);
    if (!cachedAPI) {
      return null;
    }

    // If we already have endpoints, return the cached version
    if (cachedAPI.endpoints && cachedAPI.endpoints.length > 0) {
      return cachedAPI;
    }

    // If we have an OpenAPI spec URL, fetch and parse it
    if (cachedAPI.openApiSpec && typeof cachedAPI.openApiSpec === "string") {
      try {
        console.log(`Fetching OpenAPI spec for ${cachedAPI.name}...`);
        const specResponse = await fetch(cachedAPI.openApiSpec);
        if (specResponse.ok) {
          const openApiSpec = await specResponse.json();
          const parsed = this.parseOpenAPISpec(openApiSpec, cachedAPI);

          // Update the cached API with detailed information
          const updatedAPI: PublicAPISpec = {
            ...cachedAPI,
            baseUrl: parsed.baseUrl || cachedAPI.baseUrl,
            endpoints: parsed.endpoints,
            openApiSpec: openApiSpec,
          };

          // Update in cache
          const apiIndex = this.cache.apis.findIndex((api) => api.id === apiId);
          if (apiIndex !== -1) {
            this.cache.apis[apiIndex] = updatedAPI;
            this.saveToStorage();
          }

          return updatedAPI;
        }
      } catch (error) {
        console.warn(
          `⚠️ Could not fetch detailed OpenAPI spec for ${cachedAPI.name} (CORS/Network restriction):`,
          error
        );
      }
    }

    // Return the original API if we couldn't fetch details
    return cachedAPI;
  }
}

export default PublicAPIService.getInstance();
