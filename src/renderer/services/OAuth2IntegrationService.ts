import { OAuth2Service, OAuth2Config } from "./OAuth2Service";
import {
  APIAuthentication,
  APIServerConfig,
} from "../../shared/apiServerTypes";

/**
 * OAuth2 Integration Service - Handles SSO flows for MCP client
 *
 * This service ensures that when an API requires OAuth2 authentication,
 * the user is prompted to authenticate, tokens are acquired and stored,
 * and the MCP server uses the valid tokens for API calls.
 */
export class OAuth2IntegrationService {
  private static instance: OAuth2IntegrationService;
  private oauth2Service: OAuth2Service;
  private authPromises: Map<string, Promise<string | null>> = new Map();

  private constructor() {
    this.oauth2Service = OAuth2Service.getInstance();
  }

  public static getInstance(): OAuth2IntegrationService {
    if (!OAuth2IntegrationService.instance) {
      OAuth2IntegrationService.instance = new OAuth2IntegrationService();
    }
    return OAuth2IntegrationService.instance;
  }

  /**
   * Ensure OAuth2 authentication for a server configuration
   * This is the main entry point for OAuth2 authentication in the MCP client
   */
  async ensureAuthentication(serverConfig: APIServerConfig): Promise<boolean> {
    if (serverConfig.authentication.type !== "oauth2") {
      return true; // No OAuth2 required
    }

    const oauth2Config = OAuth2Service.configFromAPIAuth(
      serverConfig.authentication
    );
    if (!oauth2Config) {
      console.error(
        "Invalid OAuth2 configuration for server:",
        serverConfig.id
      );
      return false;
    }

    // Check if we already have a valid token
    if (this.oauth2Service.isTokenValid(serverConfig.id)) {
      return true;
    }

    // Check if authentication is already in progress
    const existingPromise = this.authPromises.get(serverConfig.id);
    if (existingPromise) {
      const token = await existingPromise;
      return token !== null;
    }

    // Start new authentication flow
    const authPromise = this.authenticateUser(serverConfig.id, oauth2Config);
    this.authPromises.set(serverConfig.id, authPromise);

    try {
      const token = await authPromise;
      return token !== null;
    } finally {
      this.authPromises.delete(serverConfig.id);
    }
  }

  /**
   * Handle OAuth2 authentication flow for a user
   */
  private async authenticateUser(
    serverId: string,
    config: OAuth2Config
  ): Promise<string | null> {
    try {
      console.log(`Starting OAuth2 authentication for server: ${serverId}`);

      // This will open the browser and return immediately
      // The actual token exchange happens in the OAuth2FlowComponent
      await this.oauth2Service.initiateAuth(config);

      // For now, we return null to indicate that authentication UI should handle this
      // In a real implementation, this would wait for the callback or use a Promise that resolves when auth completes
      return null;
    } catch (error) {
      console.error(`OAuth2 authentication failed for ${serverId}:`, error);
      return null;
    }
  }

  /**
   * Get a valid access token for a server, prompting for authentication if needed
   */
  async getValidAccessToken(
    serverConfig: APIServerConfig
  ): Promise<string | null> {
    if (serverConfig.authentication.type !== "oauth2") {
      return null;
    }

    const oauth2Config = OAuth2Service.configFromAPIAuth(
      serverConfig.authentication
    );
    if (!oauth2Config) {
      return null;
    }

    // Try to get existing valid token
    let token = await this.oauth2Service.getValidToken(
      serverConfig.id,
      oauth2Config
    );

    if (!token) {
      // No valid token - need to authenticate
      const authSuccess = await this.ensureAuthentication(serverConfig);
      if (authSuccess) {
        token = await this.oauth2Service.getValidToken(
          serverConfig.id,
          oauth2Config
        );
      }
    }

    return token;
  }

  /**
   * Complete OAuth2 authentication after user returns from authorization server
   */
  async completeAuthentication(
    serverId: string,
    callbackUrl: string
  ): Promise<boolean> {
    try {
      // Find the server configuration for OAuth2 settings
      const serverConfig = await this.getServerConfig(serverId);
      if (!serverConfig || serverConfig.authentication.type !== "oauth2") {
        throw new Error("Server configuration not found or not OAuth2");
      }

      const oauth2Config = OAuth2Service.configFromAPIAuth(
        serverConfig.authentication
      );
      if (!oauth2Config) {
        throw new Error("Invalid OAuth2 configuration");
      }

      // Complete the OAuth2 flow
      await this.oauth2Service.completeAuthenticationForServer(
        serverId,
        oauth2Config,
        callbackUrl
      );

      console.log(
        `OAuth2 authentication completed successfully for server: ${serverId}`
      );
      return true;
    } catch (error) {
      console.error(
        `Failed to complete OAuth2 authentication for ${serverId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Check if a server requires OAuth2 authentication
   */
  requiresOAuth2Authentication(serverConfig: APIServerConfig): boolean {
    return serverConfig.authentication.type === "oauth2";
  }

  /**
   * Clear stored authentication for a server (logout)
   */
  clearAuthentication(serverId: string): void {
    localStorage.removeItem(`oauth2_token_${serverId}`);
    console.log(`Cleared OAuth2 authentication for server: ${serverId}`);
  }

  /**
   * Get authentication status for a server
   */
  getAuthenticationStatus(
    serverId: string
  ): "authenticated" | "expired" | "missing" {
    if (this.oauth2Service.isTokenValid(serverId)) {
      return "authenticated";
    }

    const stored = localStorage.getItem(`oauth2_token_${serverId}`);
    if (stored) {
      return "expired";
    }

    return "missing";
  }

  /**
   * Helper method to get server configuration by ID
   * This would typically come from a server configuration store
   */
  private async getServerConfig(
    serverId: string
  ): Promise<APIServerConfig | null> {
    // This is a placeholder - in a real implementation, this would fetch from
    // the application's server configuration store/database
    console.warn("getServerConfig not implemented - using placeholder");
    return null;
  }

  /**
   * Update server configuration with OAuth2 tokens after successful authentication
   */
  updateServerConfigWithTokens(
    serverConfig: APIServerConfig,
    tokens: { access_token: string; refresh_token?: string; expires_in: number }
  ): APIServerConfig {
    return {
      ...serverConfig,
      authentication: {
        ...serverConfig.authentication,
        oauth2: {
          ...serverConfig.authentication.oauth2!,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiry: Date.now() + tokens.expires_in * 1000,
        },
      },
    };
  }

  /**
   * Generate MCP server code that includes OAuth2 token handling
   */
  generateOAuth2ServerCode(serverConfig: APIServerConfig): string {
    if (serverConfig.authentication.type !== "oauth2") {
      return "";
    }

    return `
// OAuth2 Token Management for MCP Server
const OAuth2IntegrationService = require('./oauth2-integration');
const oauth2Integration = OAuth2IntegrationService.getInstance();

async function ensureValidToken(serverId) {
  const token = await oauth2Integration.getValidAccessToken('${serverConfig.id}');
  if (!token) {
    throw new Error('OAuth2 authentication required. Please authenticate via the MCP client.');
  }
  return token;
}

// Middleware to ensure OAuth2 authentication
async function requireOAuth2Auth(req, res, next) {
  try {
    const token = await ensureValidToken('${serverConfig.id}');
    req.auth = { accessToken: token };
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'OAuth2 authentication required',
      authRequired: true,
      serverId: '${serverConfig.id}',
      message: error.message
    });
  }
}
`;
  }
}

export default OAuth2IntegrationService;
