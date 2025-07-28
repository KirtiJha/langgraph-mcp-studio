import { PublicAPISpec, PublicAPIEndpoint } from "../../shared/publicApiTypes";
import {
  APIServerConfig,
  APIEndpoint,
  APIAuthentication,
} from "../../shared/apiServerTypes";
import PrivateAPIService from "./PrivateAPIService";

interface APIDiscoveryResult {
  success: boolean;
  api?: PublicAPISpec;
  endpoints?: PublicAPIEndpoint[];
  error?: string;
  confidence: number; // 0-100 confidence score
  suggestions?: string[];
}

interface AutoConfigOptions {
  includeAuth?: boolean;
  includeHeaders?: boolean;
  generateDocs?: boolean;
  validateEndpoints?: boolean;
  inferTypes?: boolean;
}

class APIDiscoveryService {
  private static instance: APIDiscoveryService;

  public static getInstance(): APIDiscoveryService {
    if (!APIDiscoveryService.instance) {
      APIDiscoveryService.instance = new APIDiscoveryService();
    }
    return APIDiscoveryService.instance;
  }

  private constructor() {}

  /**
   * Automatically discover API from a base URL
   */
  async discoverAPI(
    baseUrl: string,
    options: AutoConfigOptions = {}
  ): Promise<APIDiscoveryResult> {
    try {
      const normalizedUrl = this.normalizeUrl(baseUrl);
      let confidence = 0;
      const suggestions: string[] = [];

      // Try multiple discovery methods
      const methods = [
        () => this.tryOpenAPIDiscovery(normalizedUrl),
        () => this.trySwaggerDiscovery(normalizedUrl),
        () => this.tryWellKnownEndpoints(normalizedUrl),
        () => this.trySchemaDiscovery(normalizedUrl),
        () => this.tryAdvancedDiscovery(normalizedUrl), // New advanced method
        () => this.tryHeuristicDiscovery(normalizedUrl),
      ];

      for (const method of methods) {
        try {
          const result = await method();
          if (result.success && result.confidence > confidence) {
            confidence = result.confidence;
            if (result.api) {
              // Enhance discovered API with additional information
              const enhancedAPI = await this.enhanceDiscoveredAPI(
                result.api,
                normalizedUrl,
                options
              );

              return {
                success: true,
                api: enhancedAPI,
                endpoints: result.endpoints,
                confidence,
                suggestions: [...suggestions, ...(result.suggestions || [])],
              };
            }
          }
          suggestions.push(...(result.suggestions || []));
        } catch (error) {
          console.warn(`Discovery method failed:`, error);
        }
      }

      // If no discovery method worked, create a basic API structure
      const fallbackAPI = await this.createFallbackAPI(normalizedUrl, options);

      return {
        success: true,
        api: fallbackAPI,
        endpoints: fallbackAPI.endpoints || [],
        confidence: 30,
        suggestions: [
          "No OpenAPI specification found",
          "Consider adding endpoints manually",
          "Check if the API has documentation at /docs or /api-docs",
          ...suggestions,
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Discovery failed",
        confidence: 0,
        suggestions: [
          "Check if the URL is accessible",
          "Verify network connectivity",
          "Try with authentication if required",
        ],
      };
    }
  }

  /**
   * Try to discover OpenAPI 3.0 specification
   */
  private async tryOpenAPIDiscovery(
    baseUrl: string
  ): Promise<APIDiscoveryResult> {
    const possiblePaths = [
      "/openapi.json",
      "/openapi.yaml",
      "/v1/openapi.json",
      "/api/openapi.json",
      "/docs/openapi.json",
    ];

    for (const path of possiblePaths) {
      try {
        const spec = await this.fetchSpec(`${baseUrl}${path}`);
        if (spec && (spec.openapi || spec.swagger)) {
          const api = this.parseOpenAPISpec(spec, baseUrl);
          return {
            success: true,
            api,
            endpoints: api.endpoints,
            confidence: 95,
            suggestions: [
              "OpenAPI specification found and parsed successfully",
            ],
          };
        }
      } catch (error) {
        // Continue trying other paths
      }
    }

    return { success: false, confidence: 0 };
  }

  /**
   * Try to discover Swagger 2.0 specification
   */
  private async trySwaggerDiscovery(
    baseUrl: string
  ): Promise<APIDiscoveryResult> {
    const possiblePaths = [
      "/swagger.json",
      "/swagger.yaml",
      "/v1/swagger.json",
      "/api/swagger.json",
      "/docs/swagger.json",
      "/swagger/v1/swagger.json",
    ];

    for (const path of possiblePaths) {
      try {
        const spec = await this.fetchSpec(`${baseUrl}${path}`);
        if (spec && spec.swagger) {
          const api = this.parseSwaggerSpec(spec, baseUrl);
          return {
            success: true,
            api,
            endpoints: api.endpoints,
            confidence: 90,
            suggestions: ["Swagger 2.0 specification found and converted"],
          };
        }
      } catch (error) {
        // Continue trying other paths
      }
    }

    return { success: false, confidence: 0 };
  }

  /**
   * Try common well-known endpoints
   */
  private async tryWellKnownEndpoints(
    baseUrl: string
  ): Promise<APIDiscoveryResult> {
    const wellKnownEndpoints = [
      "/.well-known/api",
      "/.well-known/openapi",
      "/health",
      "/status",
      "/ping",
      "/info",
      "/version",
    ];

    const discoveredEndpoints: PublicAPIEndpoint[] = [];
    let workingEndpoints = 0;

    for (const endpoint of wellKnownEndpoints) {
      try {
        const response = await this.testEndpoint(`${baseUrl}${endpoint}`);
        if (response.ok) {
          workingEndpoints++;
          discoveredEndpoints.push({
            id: `well-known-${endpoint.replace(/[^a-zA-Z0-9]/g, "-")}`,
            path: endpoint,
            method: "GET",
            summary: `Well-known endpoint: ${endpoint}`,
            description: `Discovered well-known endpoint`,
            responses: {
              "200": { description: "Success" },
            },
          });
        }
      } catch (error) {
        // Endpoint not available
      }
    }

    if (workingEndpoints > 0) {
      const api = this.createAPIFromEndpoints(baseUrl, discoveredEndpoints);
      return {
        success: true,
        api,
        endpoints: discoveredEndpoints,
        confidence: 50 + workingEndpoints * 5,
        suggestions: [
          `Found ${workingEndpoints} well-known endpoints`,
          "Consider looking for more endpoints in API documentation",
        ],
      };
    }

    return { success: false, confidence: 0 };
  }

  /**
   * Try GraphQL schema introspection
   */
  private async trySchemaDiscovery(
    baseUrl: string
  ): Promise<APIDiscoveryResult> {
    const graphqlPaths = ["/graphql", "/api/graphql", "/v1/graphql"];

    for (const path of graphqlPaths) {
      try {
        const introspectionQuery = {
          query: `
            query IntrospectionQuery {
              __schema {
                queryType { name }
                mutationType { name }
                subscriptionType { name }
                types {
                  name
                  kind
                  description
                }
              }
            }
          `,
        };

        const response = await fetch(`${baseUrl}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(introspectionQuery),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.data && result.data.__schema) {
            const api = this.createGraphQLAPI(
              baseUrl,
              path,
              result.data.__schema
            );
            return {
              success: true,
              api,
              endpoints: api.endpoints,
              confidence: 85,
              suggestions: ["GraphQL schema discovered via introspection"],
            };
          }
        }
      } catch (error) {
        // Continue trying other paths
      }
    }

    return { success: false, confidence: 0 };
  }

  /**
   * Use enhanced heuristic discovery with multiple strategies
   */
  private async tryHeuristicDiscovery(
    baseUrl: string
  ): Promise<APIDiscoveryResult> {
    const discoveredEndpoints: PublicAPIEndpoint[] = [];
    let workingEndpoints = 0;
    const suggestions: string[] = [];

    // Strategy 1: Common API patterns
    const commonEndpoints = [
      "/api",
      "/api/v1",
      "/api/v2",
      "/v1",
      "/v2",
      "/rest",
      "/graphql",
    ];

    // Strategy 2: Common resource endpoints
    const resourceEndpoints = [
      "/users",
      "/items",
      "/data",
      "/products",
      "/posts",
      "/comments",
      "/categories",
      "/tags",
      "/files",
      "/media",
      "/auth",
      "/login",
      "/register",
      "/profile",
      "/settings",
      "/search",
      "/admin",
    ];

    // Strategy 3: Domain-specific patterns based on URL
    const domainSpecificEndpoints =
      this.generateDomainSpecificEndpoints(baseUrl);

    // Strategy 4: Try to find API listing or directory endpoints
    const apiDirectoryEndpoints = [
      "/",
      "/api",
      "/docs",
      "/documentation",
      "/endpoints",
      "/routes",
      "/help",
      "/info",
      "/status",
      "/health",
      "/ping",
      "/version",
    ];

    // Test all endpoint categories
    const allEndpoints = [
      ...commonEndpoints,
      ...resourceEndpoints,
      ...domainSpecificEndpoints,
      ...apiDirectoryEndpoints,
    ];

    // Remove duplicates
    const uniqueEndpoints = [...new Set(allEndpoints)];

    for (const endpoint of uniqueEndpoints) {
      try {
        const response = await this.testEndpoint(`${baseUrl}${endpoint}`);
        if (response.ok) {
          workingEndpoints++;

          // Try to analyze the response to infer more endpoints
          const additionalEndpoints = await this.analyzeResponseForEndpoints(
            `${baseUrl}${endpoint}`,
            endpoint,
            baseUrl
          );

          discoveredEndpoints.push({
            id: `heuristic-${endpoint.replace(/[^a-zA-Z0-9]/g, "-")}`,
            path: endpoint,
            method: "GET",
            summary: `Discovered endpoint: ${endpoint}`,
            description: `Heuristically discovered endpoint`,
            responses: {
              "200": { description: "Success" },
            },
          });

          // Add any additional endpoints found through response analysis
          discoveredEndpoints.push(...additionalEndpoints);
          workingEndpoints += additionalEndpoints.length;
        }
      } catch (error) {
        // Endpoint not available
      }
    }

    // Strategy 5: Try HTTP methods other than GET for discovered endpoints
    await this.discoverHttpMethods(baseUrl, discoveredEndpoints);

    if (workingEndpoints > 0) {
      const api = this.createAPIFromEndpoints(baseUrl, discoveredEndpoints);
      return {
        success: true,
        api,
        endpoints: discoveredEndpoints,
        confidence: 40 + Math.min(workingEndpoints * 3, 60),
        suggestions: [
          `Found ${workingEndpoints} potential API endpoints`,
          "Endpoints discovered through enhanced heuristic analysis",
          "Response content was analyzed for additional endpoint hints",
          ...suggestions,
        ],
      };
    }

    return { success: false, confidence: 0 };
  }

  /**
   * Generate domain-specific endpoints based on the URL
   */
  private generateDomainSpecificEndpoints(baseUrl: string): string[] {
    const endpoints: string[] = [];

    try {
      const url = new URL(baseUrl);
      const hostname = url.hostname.toLowerCase();

      // Joke API specific
      if (hostname.includes("joke")) {
        endpoints.push(
          "/jokes",
          "/jokes/random",
          "/jokes/programming",
          "/jokes/programming/random",
          "/jokes/programming/ten",
          "/jokes/dad",
          "/jokes/dad/random",
          "/jokes/categories",
          "/random_joke",
          "/random_ten"
        );
      }

      // Weather API specific
      if (hostname.includes("weather")) {
        endpoints.push(
          "/weather",
          "/current",
          "/forecast",
          "/history",
          "/alerts",
          "/locations"
        );
      }

      // News API specific
      if (hostname.includes("news")) {
        endpoints.push(
          "/news",
          "/articles",
          "/headlines",
          "/sources",
          "/categories"
        );
      }

      // Finance/Stock API specific
      if (hostname.includes("stock") || hostname.includes("finance")) {
        endpoints.push(
          "/stocks",
          "/quotes",
          "/prices",
          "/historical",
          "/symbols",
          "/markets"
        );
      }

      // Social media API specific
      if (
        hostname.includes("social") ||
        hostname.includes("twitter") ||
        hostname.includes("facebook")
      ) {
        endpoints.push(
          "/posts",
          "/users",
          "/timeline",
          "/followers",
          "/friends",
          "/messages"
        );
      }
    } catch (error) {
      // Invalid URL, skip domain-specific generation
    }

    return endpoints;
  }

  /**
   * Analyze response content to find hints about other endpoints
   */
  private async analyzeResponseForEndpoints(
    fullUrl: string,
    endpoint: string,
    baseUrl: string
  ): Promise<PublicAPIEndpoint[]> {
    const discoveredEndpoints: PublicAPIEndpoint[] = [];

    try {
      const response = await fetch(fullUrl);
      if (!response.ok) return discoveredEndpoints;

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await response.json();

        // Look for endpoint hints in JSON response
        const endpointHints = this.extractEndpointHintsFromJson(data);

        for (const hint of endpointHints) {
          discoveredEndpoints.push({
            id: `analyzed-${hint.replace(/[^a-zA-Z0-9]/g, "-")}`,
            path: hint,
            method: "GET",
            summary: `Inferred from response: ${hint}`,
            description: `Endpoint inferred from analyzing ${endpoint} response`,
            responses: {
              "200": { description: "Success" },
            },
          });
        }
      } else if (contentType.includes("text/html")) {
        const html = await response.text();

        // Look for API links in HTML
        const linkHints = this.extractEndpointHintsFromHtml(html);

        for (const hint of linkHints) {
          discoveredEndpoints.push({
            id: `html-${hint.replace(/[^a-zA-Z0-9]/g, "-")}`,
            path: hint,
            method: "GET",
            summary: `Found in HTML: ${hint}`,
            description: `Endpoint found in HTML content from ${endpoint}`,
            responses: {
              "200": { description: "Success" },
            },
          });
        }
      } else if (
        contentType.includes("text/plain") ||
        contentType.includes("text/")
      ) {
        // Handle plain text responses that might contain endpoint hints
        const text = await response.text();

        // Look for endpoint hints in plain text
        const textHints = this.extractEndpointHintsFromPlainText(text);

        for (const hint of textHints) {
          discoveredEndpoints.push({
            id: `text-${hint.replace(/[^a-zA-Z0-9]/g, "-")}`,
            path: hint,
            method: "GET",
            summary: `Found in text: ${hint}`,
            description: `Endpoint found in plain text response from ${endpoint}`,
            responses: {
              "200": { description: "Success" },
            },
          });
        }
      }
    } catch (error) {
      // Failed to analyze response, skip
    }

    return discoveredEndpoints;
  }

  /**
   * Extract endpoint hints from plain text content
   */
  private extractEndpointHintsFromPlainText(text: string): string[] {
    const hints: string[] = [];

    // Look for paths that start with / in plain text
    // This pattern matches the joke API response: "Try /random_joke, /random_ten, /jokes/random, or /jokes/ten"
    const pathRegex = /\/[a-zA-Z0-9_\/\-<>{}]+/g;
    let match;

    while ((match = pathRegex.exec(text)) !== null) {
      const path = match[0];

      // Clean up the path (remove trailing punctuation, etc.)
      const cleanPath = path.replace(/[,\.;:\s]*$/, "");

      if (
        cleanPath.length > 1 &&
        cleanPath.length < 100 &&
        !cleanPath.includes(".html") &&
        !cleanPath.includes(".css") &&
        !cleanPath.includes(".js")
      ) {
        hints.push(cleanPath);
      }
    }

    // Also look for patterns like "endpoint_name" or 'endpoint_name' in text
    const quotedEndpointRegex = /["'](\/?[a-zA-Z0-9_\/\-]+)["']/g;
    while ((match = quotedEndpointRegex.exec(text)) !== null) {
      const path = match[1];
      if (path.startsWith("/") && path.length > 1) {
        hints.push(path);
      } else if (path.length > 1) {
        // Add leading slash if missing
        hints.push("/" + path);
      }
    }

    return [...new Set(hints)]; // Remove duplicates
  }

  /**
   * Extract endpoint hints from JSON response
   */
  private extractEndpointHintsFromJson(data: any): string[] {
    const hints: string[] = [];

    // Look for common patterns in JSON that might indicate endpoints
    const searchForEndpoints = (obj: any, path: string = "") => {
      if (typeof obj === "string") {
        // Look for URL-like strings
        if (obj.startsWith("/") && obj.length > 1 && obj.length < 100) {
          hints.push(obj);
        }
      } else if (Array.isArray(obj)) {
        obj.forEach((item, index) =>
          searchForEndpoints(item, `${path}[${index}]`)
        );
      } else if (obj && typeof obj === "object") {
        Object.keys(obj).forEach((key) => {
          // Keys that might indicate endpoints
          if (
            key.toLowerCase().includes("url") ||
            key.toLowerCase().includes("endpoint") ||
            key.toLowerCase().includes("path") ||
            key.toLowerCase().includes("route")
          ) {
            const value = obj[key];
            if (typeof value === "string" && value.startsWith("/")) {
              hints.push(value);
            }
          }
          searchForEndpoints(obj[key], path ? `${path}.${key}` : key);
        });
      }
    };

    searchForEndpoints(data);

    // Remove duplicates and invalid hints
    return [...new Set(hints)].filter(
      (hint) =>
        hint.length > 1 &&
        hint.length < 100 &&
        !hint.includes("http") &&
        !hint.includes(" ")
    );
  }

  /**
   * Extract endpoint hints from HTML content
   */
  private extractEndpointHintsFromHtml(html: string): string[] {
    const hints: string[] = [];

    // Look for href attributes that might be API endpoints
    const hrefRegex = /href=["']([^"']*?)["']/gi;
    let match;

    while ((match = hrefRegex.exec(html)) !== null) {
      const href = match[1];
      if (
        href.startsWith("/") &&
        !href.includes(".html") &&
        !href.includes(".css") &&
        !href.includes(".js") &&
        !href.includes("#") &&
        href.length > 1 &&
        href.length < 100
      ) {
        hints.push(href);
      }
    }

    // Look for API documentation links
    const apiRegex = /\/api\/[^"'\s<>]*/gi;
    while ((match = apiRegex.exec(html)) !== null) {
      hints.push(match[0]);
    }

    return [...new Set(hints)];
  }

  /**
   * Test different HTTP methods for discovered endpoints
   */
  private async discoverHttpMethods(
    baseUrl: string,
    endpoints: PublicAPIEndpoint[]
  ): Promise<void> {
    const methods = ["POST", "PUT", "DELETE", "PATCH"];

    for (const endpoint of endpoints.slice(0, 5)) {
      // Limit to first 5 to avoid too many requests
      for (const method of methods) {
        try {
          const response = await fetch(`${baseUrl}${endpoint.path}`, {
            method: method,
            headers: { "Content-Type": "application/json" },
          });

          // Even if it fails, a 405 (Method Not Allowed) or 400 (Bad Request)
          // indicates the endpoint exists but might need different parameters
          if (
            response.status === 405 ||
            response.status === 400 ||
            response.ok
          ) {
            endpoints.push({
              id: `method-${method.toLowerCase()}-${endpoint.path.replace(
                /[^a-zA-Z0-9]/g,
                "-"
              )}`,
              path: endpoint.path,
              method: method as any,
              summary: `${method} ${endpoint.path}`,
              description: `Discovered ${method} method for ${endpoint.path}`,
              responses: {
                "200": { description: "Success" },
              },
            });
          }
        } catch (error) {
          // Method not supported or network error
        }
      }
    }
  }

  /**
   * Advanced discovery using multiple sophisticated techniques
   */
  private async tryAdvancedDiscovery(
    baseUrl: string
  ): Promise<APIDiscoveryResult> {
    const discoveredEndpoints: PublicAPIEndpoint[] = [];
    let confidence = 0;
    const suggestions: string[] = [];

    try {
      // Strategy 1: Try to find robots.txt or sitemap
      const robotsEndpoints = await this.analyzeRobotsAndSitemap(baseUrl);
      discoveredEndpoints.push(...robotsEndpoints);

      // Strategy 2: Look for common API documentation patterns
      const docEndpoints = await this.findDocumentationEndpoints(baseUrl);
      discoveredEndpoints.push(...docEndpoints);

      // Strategy 3: Analyze response headers for hints
      const headerHints = await this.analyzeResponseHeaders(baseUrl);
      discoveredEndpoints.push(...headerHints);

      // Strategy 4: Try OPTIONS requests to discover supported methods
      const optionsEndpoints = await this.discoverViaOptions(baseUrl);
      discoveredEndpoints.push(...optionsEndpoints);

      const uniqueEndpoints = this.deduplicateEndpoints(discoveredEndpoints);

      if (uniqueEndpoints.length > 0) {
        confidence = 60 + Math.min(uniqueEndpoints.length * 5, 40);
        const api = this.createAPIFromEndpoints(baseUrl, uniqueEndpoints);

        return {
          success: true,
          api,
          endpoints: uniqueEndpoints,
          confidence,
          suggestions: [
            `Advanced discovery found ${uniqueEndpoints.length} endpoints`,
            "Analyzed robots.txt, documentation, and response headers",
            ...suggestions,
          ],
        };
      }
    } catch (error) {
      suggestions.push(`Advanced discovery encountered errors: ${error}`);
    }

    return { success: false, confidence: 0, suggestions };
  }

  /**
   * Analyze robots.txt and sitemap for API endpoints
   */
  private async analyzeRobotsAndSitemap(
    baseUrl: string
  ): Promise<PublicAPIEndpoint[]> {
    const endpoints: PublicAPIEndpoint[] = [];

    try {
      // Check robots.txt
      const robotsResponse = await fetch(`${baseUrl}/robots.txt`);
      if (robotsResponse.ok) {
        const robotsText = await robotsResponse.text();
        const apiPaths = this.extractAPIPathsFromText(robotsText);

        for (const path of apiPaths) {
          endpoints.push({
            id: `robots-${path.replace(/[^a-zA-Z0-9]/g, "-")}`,
            path,
            method: "GET",
            summary: `Found in robots.txt: ${path}`,
            description: `API endpoint discovered in robots.txt`,
            responses: { "200": { description: "Success" } },
          });
        }
      }
    } catch (error) {
      // robots.txt not available
    }

    return endpoints;
  }

  /**
   * Find documentation endpoints that might reveal API structure
   */
  private async findDocumentationEndpoints(
    baseUrl: string
  ): Promise<PublicAPIEndpoint[]> {
    const endpoints: PublicAPIEndpoint[] = [];
    const docPaths = [
      "/docs",
      "/documentation",
      "/api-docs",
      "/swagger",
      "/redoc",
      "/graphql",
      "/playground",
      "/explorer",
    ];

    for (const docPath of docPaths) {
      try {
        const response = await fetch(`${baseUrl}${docPath}`);
        if (response.ok) {
          const content = await response.text();
          const discoveredPaths =
            this.extractAPIPathsFromDocumentation(content);

          for (const path of discoveredPaths) {
            endpoints.push({
              id: `doc-${path.replace(/[^a-zA-Z0-9]/g, "-")}`,
              path,
              method: "GET",
              summary: `Found in documentation: ${path}`,
              description: `API endpoint discovered in ${docPath}`,
              responses: { "200": { description: "Success" } },
            });
          }
        }
      } catch (error) {
        // Documentation path not available
      }
    }

    return endpoints;
  }

  /**
   * Analyze response headers for API hints
   */
  private async analyzeResponseHeaders(
    baseUrl: string
  ): Promise<PublicAPIEndpoint[]> {
    const endpoints: PublicAPIEndpoint[] = [];

    try {
      const response = await fetch(baseUrl);
      const headers = response.headers;

      // Look for API-related headers
      const apiHeaders = ["x-api-version", "x-ratelimit-limit", "x-powered-by"];
      const hasApiHeaders = apiHeaders.some((header) => headers.has(header));

      if (hasApiHeaders) {
        // If we detect API headers, try common API paths
        const apiPaths = ["/api", "/v1", "/v2", "/rest"];
        for (const path of apiPaths) {
          endpoints.push({
            id: `header-hint-${path.replace(/[^a-zA-Z0-9]/g, "-")}`,
            path,
            method: "GET",
            summary: `Inferred from headers: ${path}`,
            description: `API endpoint inferred from response headers`,
            responses: { "200": { description: "Success" } },
          });
        }
      }
    } catch (error) {
      // Header analysis failed
    }

    return endpoints;
  }

  /**
   * Use OPTIONS requests to discover supported methods
   */
  private async discoverViaOptions(
    baseUrl: string
  ): Promise<PublicAPIEndpoint[]> {
    const endpoints: PublicAPIEndpoint[] = [];
    const commonPaths = ["/", "/api", "/v1"];

    for (const path of commonPaths) {
      try {
        const response = await fetch(`${baseUrl}${path}`, {
          method: "OPTIONS",
        });
        const allowHeader = response.headers.get("allow");

        if (allowHeader) {
          const methods = allowHeader
            .split(",")
            .map((m) => m.trim().toUpperCase());

          for (const method of methods) {
            if (["GET", "POST", "PUT", "DELETE", "PATCH"].includes(method)) {
              endpoints.push({
                id: `options-${method.toLowerCase()}-${path.replace(
                  /[^a-zA-Z0-9]/g,
                  "-"
                )}`,
                path,
                method: method as any,
                summary: `${method} ${path} (via OPTIONS)`,
                description: `Discovered via OPTIONS request`,
                responses: { "200": { description: "Success" } },
              });
            }
          }
        }
      } catch (error) {
        // OPTIONS not supported
      }
    }

    return endpoints;
  }

  /**
   * Extract API paths from text content
   */
  private extractAPIPathsFromText(text: string): string[] {
    const paths: string[] = [];
    const pathRegex = /\/[a-zA-Z0-9\/_-]+/g;
    const matches = text.match(pathRegex);

    if (matches) {
      for (const match of matches) {
        if (
          match.length > 1 &&
          !match.includes(".") &&
          (match.includes("api") ||
            match.includes("v1") ||
            match.includes("v2"))
        ) {
          paths.push(match);
        }
      }
    }

    return [...new Set(paths)];
  }

  /**
   * Extract API paths from documentation content
   */
  private extractAPIPathsFromDocumentation(content: string): string[] {
    const paths: string[] = [];

    // Look for OpenAPI/Swagger path patterns
    const swaggerPathRegex =
      /"([^"]*?)"\s*:\s*\{[^}]*"(get|post|put|delete|patch)"/gi;
    let match;

    while ((match = swaggerPathRegex.exec(content)) !== null) {
      const path = match[1];
      if (path.startsWith("/") && path.length > 1) {
        paths.push(path);
      }
    }

    // Look for REST endpoint patterns
    const restPathRegex = /\b(GET|POST|PUT|DELETE|PATCH)\s+([\/\w\-{}]+)/gi;
    while ((match = restPathRegex.exec(content)) !== null) {
      const path = match[2];
      if (path.startsWith("/") && path.length > 1) {
        paths.push(path);
      }
    }

    return [...new Set(paths)];
  }

  /**
   * Remove duplicate endpoints
   */
  private deduplicateEndpoints(
    endpoints: PublicAPIEndpoint[]
  ): PublicAPIEndpoint[] {
    const seen = new Set<string>();
    return endpoints.filter((endpoint) => {
      const key = `${endpoint.method}:${endpoint.path}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  async autoConfigureAPIServer(
    discoveredAPI: PublicAPISpec,
    options: AutoConfigOptions = {}
  ): Promise<APIServerConfig> {
    const config: APIServerConfig = {
      id: `auto-${Date.now()}`,
      name: `${discoveredAPI.name} Auto-Configured`,
      description: `Auto-configured server for ${discoveredAPI.name}. ${discoveredAPI.description}`,
      baseUrl: discoveredAPI.baseUrl,
      authentication: this.inferAuthentication(discoveredAPI),
      endpoints: await this.convertEndpoints(discoveredAPI.endpoints || []),
      globalHeaders: this.generateGlobalHeaders(discoveredAPI),
      timeout: 30000,
      retries: 3,
      created: new Date(),
      updated: new Date(),

      // Enhanced configuration based on options
      monitoring: options.validateEndpoints
        ? {
            enabled: true,
            healthCheck: {
              enabled: true,
              endpoint: "/health",
              interval: 300000,
            },
            metrics: {
              enabled: true,
              exportFormat: "json",
            },
          }
        : { enabled: false },

      logging: {
        level: "info",
        requests: true,
        responses: false,
        errors: true,
        format: "structured",
      },

      security: {
        rateLimit: true,
        cors: true,
        validation: options.inferTypes || false,
        sanitization: true,
      },

      caching: {
        enabled: true,
        defaultTtl: 300,
        strategy: "lru",
      },
    };

    return config;
  }

  // Helper methods

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return url.startsWith("http") ? url : `https://${url}`;
    }
  }

  private async fetchSpec(url: string): Promise<any> {
    const response = await fetch(url, {
      headers: { Accept: "application/json, application/yaml" },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("yaml")) {
      const yaml = await response.text();
      // In a real implementation, you'd use a YAML parser here
      throw new Error("YAML parsing not implemented");
    }

    return response.json();
  }

  private async testEndpoint(
    url: string
  ): Promise<{ ok: boolean; status: number }> {
    try {
      const response = await fetch(url, { method: "GET" });
      return { ok: response.ok, status: response.status };
    } catch {
      return { ok: false, status: 0 };
    }
  }

  private parseOpenAPISpec(spec: any, baseUrl: string): PublicAPISpec {
    const info = spec.info || {};

    return {
      id: `discovered-${Date.now()}`,
      name: info.title || "Discovered API",
      description: info.description || "Auto-discovered API",
      version: info.version || "1.0.0",
      category: "Discovered",
      baseUrl: spec.servers?.[0]?.url || baseUrl,
      provider: "Auto-Discovery",
      tags: ["discovered", "openapi"],
      endpoints: this.extractEndpointsFromOpenAPI(spec),
      authentication: this.inferAuthFromSpec(spec),
      status: "active" as const,
      lastUpdated: new Date().toISOString(),
      pricing: "unknown" as any,
    };
  }

  private parseSwaggerSpec(spec: any, baseUrl: string): PublicAPISpec {
    // Convert Swagger 2.0 to OpenAPI 3.0 format
    const convertedSpec = this.convertSwaggerToOpenAPI(spec);
    return this.parseOpenAPISpec(convertedSpec, baseUrl);
  }

  private createAPIFromEndpoints(
    baseUrl: string,
    endpoints: PublicAPIEndpoint[]
  ): PublicAPISpec {
    return {
      id: `discovered-${Date.now()}`,
      name: "Discovered API",
      description: "API discovered through endpoint scanning",
      version: "1.0.0",
      category: "Discovered",
      baseUrl,
      provider: "Auto-Discovery",
      tags: ["discovered", "scanned"],
      endpoints,
      status: "active",
      lastUpdated: new Date().toISOString(),
      pricing: "unknown" as any,
    };
  }

  private createGraphQLAPI(
    baseUrl: string,
    path: string,
    schema: any
  ): PublicAPISpec {
    const endpoints: PublicAPIEndpoint[] = [
      {
        id: "graphql-endpoint",
        path,
        method: "POST",
        summary: "GraphQL Endpoint",
        description: "GraphQL API endpoint with schema introspection",
        responses: { "200": { description: "GraphQL response" } },
      },
    ];

    return {
      id: `graphql-${Date.now()}`,
      name: "GraphQL API",
      description: "Auto-discovered GraphQL API",
      version: "1.0.0",
      category: "GraphQL",
      baseUrl,
      provider: "Auto-Discovery",
      tags: ["discovered", "graphql"],
      endpoints,
      status: "active",
      lastUpdated: new Date().toISOString(),
      pricing: "unknown" as any,
    };
  }

  private async enhanceDiscoveredAPI(
    api: PublicAPISpec,
    baseUrl: string,
    options: AutoConfigOptions
  ): Promise<PublicAPISpec> {
    // Add authentication detection only if not already detected from spec
    if (
      options.includeAuth &&
      (!api.authentication || api.authentication.type === "none")
    ) {
      api.authentication = await this.detectAuthentication(baseUrl);
    }

    // Add custom headers detection
    if (options.includeHeaders) {
      // Detect common headers by testing endpoints
    }

    return api;
  }

  private async createFallbackAPI(
    baseUrl: string,
    options: AutoConfigOptions
  ): Promise<PublicAPISpec> {
    return {
      id: `fallback-${Date.now()}`,
      name: "Unknown API",
      description: "API discovered without specification",
      version: "1.0.0",
      category: "Unknown",
      baseUrl,
      provider: "Manual Discovery",
      tags: ["manual", "unknown"],
      endpoints: [],
      status: "active",
      lastUpdated: new Date().toISOString(),
      pricing: "unknown" as any,
    };
  }

  private extractEndpointsFromOpenAPI(spec: any): PublicAPIEndpoint[] {
    const endpoints: PublicAPIEndpoint[] = [];

    if (!spec.paths) {
      return endpoints;
    }

    // Iterate through all paths in the OpenAPI spec
    Object.entries(spec.paths).forEach(([path, pathObj]: [string, any]) => {
      if (!pathObj || typeof pathObj !== "object") {
        return;
      }

      // For each HTTP method in the path
      Object.entries(pathObj).forEach(([method, operation]: [string, any]) => {
        const httpMethod = method.toUpperCase() as
          | "GET"
          | "POST"
          | "PUT"
          | "DELETE"
          | "PATCH";

        // Skip if not a valid HTTP method
        if (!["GET", "POST", "PUT", "DELETE", "PATCH"].includes(httpMethod)) {
          return;
        }

        const endpointId = `${method.toLowerCase()}-${path.replace(
          /[^a-zA-Z0-9]/g,
          "-"
        )}`;

        // Extract parameters
        const parameters: {
          name: string;
          in: "query" | "header" | "path" | "cookie" | "formData";
          required: boolean;
          type: string;
          description?: string;
          example?: any;
        }[] = [];

        // Path parameters
        if (operation.parameters) {
          operation.parameters.forEach((param: any) => {
            if (
              param.in === "path" ||
              param.in === "query" ||
              param.in === "header"
            ) {
              parameters.push({
                name: param.name,
                in: param.in as
                  | "query"
                  | "header"
                  | "path"
                  | "cookie"
                  | "formData",
                required: param.required || false,
                type: param.schema?.type || "string",
                description: param.description || "",
                example: param.example,
              });
            }
          });
        }

        // Request body (for POST, PUT, PATCH)
        let requestBody: any = undefined;
        if (operation.requestBody && operation.requestBody.content) {
          const content = operation.requestBody.content;
          const contentType = Object.keys(content)[0]; // Get first content type
          const schema = content[contentType]?.schema;

          requestBody = {
            required: operation.requestBody.required || false,
            contentType,
            schema,
          };

          // Extract request body properties as parameters for POST/PUT/PATCH
          if (
            schema &&
            schema.properties &&
            ["POST", "PUT", "PATCH"].includes(method.toUpperCase())
          ) {
            Object.entries(schema.properties).forEach(
              ([propName, propSchema]: [string, any]) => {
                const isRequired = schema.required?.includes(propName) || false;
                parameters.push({
                  name: propName,
                  in: "formData" as
                    | "query"
                    | "header"
                    | "path"
                    | "cookie"
                    | "formData",
                  required: isRequired,
                  type: propSchema.type || "string",
                  description: propSchema.description || `${propName} field`,
                  example: propSchema.example || propSchema.default,
                });
              }
            );
          }
        }

        // Responses
        const responses: Record<string, any> = {};
        if (operation.responses) {
          Object.entries(operation.responses).forEach(
            ([statusCode, response]: [string, any]) => {
              responses[statusCode] = {
                description: response.description || `Response ${statusCode}`,
                schema: response.content?.["application/json"]?.schema,
              };
            }
          );
        }

        endpoints.push({
          id: endpointId,
          path,
          method: httpMethod,
          summary: operation.summary || `${method.toUpperCase()} ${path}`,
          description:
            operation.description ||
            operation.summary ||
            `${method.toUpperCase()} operation for ${path}`,
          parameters,
          requestBody,
          responses,
          tags: operation.tags || [],
          deprecated: operation.deprecated || false,
        });
      });
    });

    return endpoints;
  }

  private inferAuthFromSpec(spec: any): any {
    // Analyze security schemes in OpenAPI spec
    if (spec.components?.securitySchemes) {
      const schemes = spec.components.securitySchemes;
      const firstScheme = Object.values(schemes)[0] as any;

      if (firstScheme) {
        switch (firstScheme.type) {
          case "apiKey":
            return {
              type: "apiKey",
              keyName: firstScheme.name,
              keyLocation: firstScheme.in,
            };
          case "oauth2":
            return {
              type: "oauth2",
              flow: Object.keys(firstScheme.flows || {})[0],
              scopes: Object.keys(
                firstScheme.flows?.[Object.keys(firstScheme.flows)[0]]
                  ?.scopes || {}
              ),
            };
          case "http":
            return {
              type: firstScheme.scheme === "bearer" ? "bearer" : "basic",
            };
          default:
            return { type: "none" };
        }
      }
    }

    // Check for global security requirements
    if (spec.security && spec.security.length > 0) {
      return { type: "apiKey" }; // Default assumption
    }

    return { type: "none" };
  }

  private convertSwaggerToOpenAPI(swagger: any): any {
    // Basic conversion from Swagger 2.0 to OpenAPI 3.0
    const openapi = {
      openapi: "3.0.0",
      info: swagger.info || {},
      servers: swagger.host
        ? [
            {
              url: `${swagger.schemes?.[0] || "http"}://${swagger.host}${
                swagger.basePath || ""
              }`,
            },
          ]
        : [],
      paths: swagger.paths || {},
      components: {
        schemas: swagger.definitions || {},
        securitySchemes: this.convertSwaggerSecurity(
          swagger.securityDefinitions || {}
        ),
      },
    };

    // Convert path parameters and responses
    Object.keys(openapi.paths).forEach((path) => {
      Object.keys(openapi.paths[path]).forEach((method) => {
        const operation = openapi.paths[path][method];
        if (operation.parameters) {
          operation.parameters = operation.parameters.map((param: any) => {
            if (param.in === "body") {
              // Convert body parameter to requestBody
              delete operation.parameters;
              return {
                requestBody: {
                  required: param.required,
                  content: {
                    "application/json": {
                      schema: param.schema,
                    },
                  },
                },
              };
            }
            return param;
          });
        }
      });
    });

    return openapi;
  }

  private convertSwaggerSecurity(securityDefs: any): any {
    const schemes: any = {};
    Object.keys(securityDefs).forEach((key) => {
      const def = securityDefs[key];
      if (def.type === "apiKey") {
        schemes[key] = {
          type: "apiKey",
          name: def.name,
          in: def.in,
        };
      } else if (def.type === "oauth2") {
        schemes[key] = {
          type: "oauth2",
          flows: {
            [def.flow]: {
              authorizationUrl: def.authorizationUrl,
              tokenUrl: def.tokenUrl,
              scopes: def.scopes || {},
            },
          },
        };
      }
    });
    return schemes;
  }

  private inferAuthentication(api: PublicAPISpec): APIAuthentication {
    if (!api.authentication || api.authentication.type === "none") {
      return { type: "none", credentials: {} };
    }

    // Convert PublicAPISpec authentication to APIServerConfig authentication
    const auth = api.authentication;
    const result: APIAuthentication = {
      type: "none",
      credentials: {},
    };

    switch (auth.type) {
      case "apiKey":
        result.type = "apikey";
        result.headerName = auth.keyName || "X-API-Key";
        result.credentials = auth.testCredentials || {};
        break;
      case "bearer":
        result.type = "bearer";
        result.credentials = auth.testCredentials || {};
        break;
      case "basic":
        result.type = "basic";
        result.credentials = auth.testCredentials || {};
        break;
      case "oauth2":
        result.type = "oauth2";
        result.oauth2 = {
          scopes: auth.scopes || [],
          flow: (auth.flow as any) || "authorization_code",
        };
        result.credentials = auth.testCredentials || {};
        break;
      default:
        result.type = "none";
        result.credentials = {};
    }

    return result;
  }

  private async convertEndpoints(
    endpoints: PublicAPIEndpoint[]
  ): Promise<APIEndpoint[]> {
    // Convert PublicAPIEndpoint[] to APIEndpoint[]
    return endpoints.map((endpoint) => ({
      id: endpoint.id,
      path: endpoint.path,
      method: endpoint.method as any, // Cast to include additional methods from APIEndpoint
      toolName: this.generateToolName(endpoint.path, endpoint.method),
      description: endpoint.description || endpoint.summary || "",
      parameters:
        endpoint.parameters?.map((param) => ({
          name: param.name,
          type: this.mapParameterType(param.type),
          required: param.required,
          description: param.description,
        })) || [],
      body: endpoint.requestBody
        ? {
            type: this.getBodyType(endpoint.requestBody.contentType),
            schema: endpoint.requestBody.schema,
            required: endpoint.requestBody.required,
          }
        : undefined,
      enabled: true,
    }));
  }

  private generateToolName(path: string, method: string): string {
    // Generate a clean tool name from path and method
    const cleanPath = path
      .replace(/[{}]/g, "") // Remove path parameter braces
      .replace(/[^a-zA-Z0-9]/g, "_") // Replace special chars with underscore
      .replace(/_+/g, "_") // Replace multiple underscores with single
      .replace(/^_|_$/g, ""); // Remove leading/trailing underscores

    return `${method.toLowerCase()}_${cleanPath}`;
  }

  private mapParameterType(
    type: string
  ): "string" | "number" | "boolean" | "array" | "object" {
    switch (type) {
      case "integer":
      case "number":
        return "number";
      case "boolean":
        return "boolean";
      case "array":
        return "array";
      case "object":
        return "object";
      default:
        return "string";
    }
  }

  private getBodyType(
    contentType: string
  ): "json" | "form" | "text" | "multipart" | "graphql" | "binary" {
    if (contentType.includes("application/json")) return "json";
    if (contentType.includes("application/x-www-form-urlencoded"))
      return "form";
    if (contentType.includes("multipart/form-data")) return "multipart";
    if (contentType.includes("text/")) return "text";
    if (contentType.includes("application/graphql")) return "graphql";
    return "binary";
  }

  private generateGlobalHeaders(api: PublicAPISpec): Record<string, string> {
    return {
      "User-Agent": "MCP-Studio-Auto-Discovery/1.0.0",
      Accept: "application/json",
    };
  }

  private async detectAuthentication(baseUrl: string): Promise<any> {
    // Test various authentication methods
    return { type: "none" };
  }
}

export default APIDiscoveryService.getInstance();
export type { APIDiscoveryResult, AutoConfigOptions };
