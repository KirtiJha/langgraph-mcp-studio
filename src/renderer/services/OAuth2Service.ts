import { APIAuthentication } from "../../shared/apiServerTypes";

export interface OAuth2Config {
  authUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret?: string; // Optional for PKCE
  scopes: string[];
  redirectUri: string;
  usePKCE: boolean;
}

export interface OAuth2TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export class OAuth2Service {
  private static instance: OAuth2Service;
  private codeVerifier: string | null = null;
  private state: string | null = null;

  public static getInstance(): OAuth2Service {
    if (!OAuth2Service.instance) {
      OAuth2Service.instance = new OAuth2Service();
    }
    return OAuth2Service.instance;
  }

  /**
   * Initiate OAuth2 authorization flow
   */
  async initiateAuth(config: OAuth2Config, autoOpen: boolean = true): Promise<string> {
    console.log("🔗 OAuth2Service.initiateAuth called with:", {
      authUrl: config.authUrl,
      redirectUri: config.redirectUri,
      clientId: config.clientId,
      scopes: config.scopes,
      usePKCE: config.usePKCE,
      autoOpen,
    });

    // Generate state for CSRF protection
    this.state = this.generateRandomString(32);
    console.log("🔗 Generated state:", this.state);

    // Generate PKCE parameters if enabled
    if (config.usePKCE) {
      this.codeVerifier = this.generateRandomString(128);
      console.log("🔗 Generated PKCE code verifier");
    }

    const authParams = new URLSearchParams({
      response_type: "code",
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(" "),
      state: this.state,
    });

    // Add PKCE challenge if using PKCE
    if (config.usePKCE && this.codeVerifier) {
      const codeChallenge = await this.generateCodeChallenge(this.codeVerifier);
      authParams.append("code_challenge", codeChallenge);
      authParams.append("code_challenge_method", "S256");
      console.log("🔗 Added PKCE challenge");
    }

    const authUrl = `${config.authUrl}?${authParams.toString()}`;
    console.log("🔗 Final auth URL:", authUrl);

    // Only open browser automatically if requested (for backward compatibility)
    if (autoOpen) {
      await this.openInBrowser(authUrl);
    }

    return authUrl;
  }

  /**
   * Handle authorization callback and exchange code for token
   */
  async handleCallback(
    config: OAuth2Config,
    callbackUrl: string
  ): Promise<OAuth2TokenResponse> {
    console.log("🔗 OAuth2Service.handleCallback called with:", {
      callbackUrl,
      redirectUri: config.redirectUri,
      clientId: config.clientId,
      usePKCE: config.usePKCE,
    });

    const url = new URL(callbackUrl);
    const params = new URLSearchParams(url.search);
    
    // Also check URL fragment for parameters (some OAuth2 providers use hash instead of query params)
    const fragmentParams = new URLSearchParams(url.hash.substring(1));

    console.log("🔗 Parsed callback URL params:", {
      search: url.search,
      hash: url.hash,
      queryParams: {
        code: params.get("code"),
        state: params.get("state"),
        error: params.get("error"),
        error_description: params.get("error_description"),
      },
      fragmentParams: {
        code: fragmentParams.get("code"),
        state: fragmentParams.get("state"),
        error: fragmentParams.get("error"),
        error_description: fragmentParams.get("error_description"),
      },
    });

    // Check both query params and fragment params
    let code = params.get("code") || fragmentParams.get("code");
    let state = params.get("state") || fragmentParams.get("state");
    let error = params.get("error") || fragmentParams.get("error");
    
    // If we still don't have parameters, try to handle IBM SSO OIDC special case
    if (!code && !error && callbackUrl.includes("localhost:3000")) {
      // For IBM SSO OIDC, check if there's any way to get the authorization code
      // This might be a redirect to the homepage with a POST request or other mechanism
      console.log("🔗 Checking for IBM SSO OIDC special callback handling");
      
      // Check if there's a session storage or local storage value that might contain the code
      try {
        const storedCallback = localStorage.getItem("oauth2_callback");
        if (storedCallback) {
          const callbackData = JSON.parse(storedCallback);
          if (callbackData.code) {
            console.log("🔗 Found authorization code in localStorage:", callbackData.code);
            code = callbackData.code;
            state = callbackData.state;
            localStorage.removeItem("oauth2_callback"); // Clean up
          }
        }
      } catch (e) {
        console.log("🔗 No stored callback data found");
      }
    }

    if (error) {
      const errorDescription = params.get("error_description") || error;
      throw new Error(`OAuth2 error: ${errorDescription}`);
    }

    if (!code) {
      // Provide more detailed error information for debugging
      const errorMessage = `Authorization code not found in callback URL.
      
Callback URL: ${callbackUrl}
Query parameters: ${JSON.stringify(Object.fromEntries(params.entries()))}
Fragment parameters: ${JSON.stringify(Object.fromEntries(fragmentParams.entries()))}

This could mean:
1. The OAuth2 provider is not correctly configured with the redirect URI
2. The provider is using a different mechanism to return the authorization code
3. There was an error in the OAuth2 flow that wasn't captured

For IBM SSO OIDC, make sure your redirect URI is exactly: http://localhost:3000/oauth-callback.html`;
      
      console.error("🔗 Authorization code not found:", {
        callbackUrl,
        searchParams: url.search,
        hash: url.hash,
        queryParams: Object.fromEntries(params.entries()),
        fragmentParams: Object.fromEntries(fragmentParams.entries())
      });
      
      throw new Error(errorMessage);
    }

    if (state !== this.state) {
      console.warn("🔗 State mismatch:", { expected: this.state, received: state });
      throw new Error("Invalid state parameter");
    }

    // Use main process for token exchange if in Electron (to avoid CORS)
    if ((window as any).electronAPI?.exchangeOAuth2Token) {
      const configWithVerifier = {
        ...config,
        codeVerifier: this.codeVerifier,
      };
      return await (window as any).electronAPI.exchangeOAuth2Token(configWithVerifier, callbackUrl);
    } else {
      // Fallback to browser-based exchange for web environments
      return this.exchangeCodeForToken(config, code);
    }
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(
    config: OAuth2Config,
    code: string
  ): Promise<OAuth2TokenResponse> {
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
    });

    // Add PKCE verifier if using PKCE
    if (config.usePKCE && this.codeVerifier) {
      tokenParams.append("code_verifier", this.codeVerifier);
    } else if (config.clientSecret) {
      tokenParams.append("client_secret", config.clientSecret);
    }

    // Debug logging
    if (localStorage.getItem("oauth2_debug")) {
      console.log("Token exchange request:", {
        url: config.tokenUrl,
        params: Object.fromEntries(tokenParams.entries()),
        usePKCE: config.usePKCE,
        hasCodeVerifier: !!this.codeVerifier,
        hasClientSecret: !!config.clientSecret,
      });
    }

    try {
      const response = await fetch(config.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: tokenParams.toString(),
      });

      if (!response.ok) {
        // Get error details from response
        let errorDetails = "";
        try {
          const errorBody = await response.text();
          errorDetails = errorBody;
          console.error("Token exchange error details:", errorBody);
        } catch (e) {
          errorDetails = `${response.status} ${response.statusText}`;
        }

        throw new Error(`Token exchange failed: ${errorDetails}`);
      }

      const tokenData: OAuth2TokenResponse = await response.json();

      // Store token with expiration
      this.storeToken(tokenData);

      if (localStorage.getItem("oauth2_debug")) {
        console.log("Token exchange successful:", {
          hasAccessToken: !!tokenData.access_token,
          hasRefreshToken: !!tokenData.refresh_token,
          expiresIn: tokenData.expires_in,
        });
      }

      return tokenData;
    } catch (error) {
      console.error("Token exchange failed:", error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(
    config: OAuth2Config,
    refreshToken: string
  ): Promise<OAuth2TokenResponse> {
    const refreshParams = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: config.clientId,
    });

    if (config.clientSecret) {
      refreshParams.append("client_secret", config.clientSecret);
    }

    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: refreshParams.toString(),
    });

    if (!response.ok) {
      throw new Error(
        `Token refresh failed: ${response.status} ${response.statusText}`
      );
    }

    const tokenData: OAuth2TokenResponse = await response.json();
    this.storeToken(tokenData);

    return tokenData;
  }

  /**
   * Check if stored token is valid and not expired
   */
  isTokenValid(serverId: string): boolean {
    const tokenData = this.getStoredToken(serverId);
    if (!tokenData) return false;

    const expiresAt = tokenData.expires_at;
    const now = Date.now();

    // Consider token expired if it expires within the next 5 minutes
    return expiresAt > now + 5 * 60 * 1000;
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  async getValidToken(
    serverId: string,
    config: OAuth2Config
  ): Promise<string | null> {
    const tokenData = this.getStoredToken(serverId);
    if (!tokenData) return null;

    if (this.isTokenValid(serverId)) {
      return tokenData.access_token;
    }

    // Try to refresh token
    if (tokenData.refresh_token) {
      try {
        const newTokenData = await this.refreshToken(
          config,
          tokenData.refresh_token
        );
        return newTokenData.access_token;
      } catch (error) {
        console.error("Token refresh failed:", error);
        // Clear invalid token
        this.clearStoredToken(serverId);
        return null;
      }
    }

    return null;
  }

  /**
   * Check if authentication is required and handle OAuth2 flow
   */
  async ensureValidToken(
    serverId: string,
    config: OAuth2Config
  ): Promise<string | null> {
    // Check if we have a valid token
    const existingToken = await this.getValidToken(serverId, config);
    if (existingToken) {
      return existingToken;
    }

    // No valid token - need to authenticate
    console.log(`OAuth2 authentication required for server: ${serverId}`);

    // In a real application, this would trigger the OAuth2 flow
    // For now, return null to indicate authentication needed
    return null;
  }

  /**
   * Start OAuth2 flow for a specific server configuration
   */
  async authenticateForServer(
    serverId: string,
    config: OAuth2Config
  ): Promise<OAuth2TokenResponse> {
    try {
      // Start the OAuth2 flow
      const authUrl = await this.initiateAuth(config);
      console.log(`OAuth2 flow initiated for ${serverId}: ${authUrl}`);

      // This would normally wait for the callback
      // For now, this is a placeholder that would be completed by the UI component
      throw new Error(
        "OAuth2 flow started - complete authentication in browser"
      );
    } catch (error) {
      console.error(`OAuth2 authentication failed for ${serverId}:`, error);
      throw error;
    }
  }

  /**
   * Complete OAuth2 flow and store token for server
   */
  async completeAuthenticationForServer(
    serverId: string,
    config: OAuth2Config,
    callbackUrl: string
  ): Promise<OAuth2TokenResponse> {
    const tokenResponse = await this.handleCallback(config, callbackUrl);

    // Store the token with server-specific key
    this.storeToken(tokenResponse, serverId);

    return tokenResponse;
  }

  /**
   * Get OAuth2 configuration from API server config
   */
  static configFromAPIAuth(
    auth: APIAuthentication,
    baseConfig?: Partial<OAuth2Config>
  ): OAuth2Config | null {
    if (auth.type !== "oauth2" || !auth.oauth2) {
      return null;
    }

    return {
      authUrl: auth.oauth2.authUrl || "",
      tokenUrl: auth.oauth2.tokenUrl || "",
      clientId: auth.oauth2.clientId || "",
      clientSecret: auth.oauth2.clientSecret || "",
      scopes: auth.oauth2.scopes || [],
      redirectUri:
        baseConfig?.redirectUri || "http://localhost:3000/oauth/callback",
      usePKCE: auth.oauth2.flow === "pkce" || !auth.oauth2.clientSecret,
      ...baseConfig,
    };
  }

  /**
   * Generate random string for state and PKCE
   */
  private generateRandomString(length: number): string {
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    let result = "";
    const crypto = window.crypto || (window as any).msCrypto;

    if (crypto && crypto.getRandomValues) {
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);
      for (let i = 0; i < array.length; i++) {
        result += charset[array[i] % charset.length];
      }
    } else {
      // Fallback for older browsers
      for (let i = 0; i < length; i++) {
        result += charset[Math.floor(Math.random() * charset.length)];
      }
    }

    return result;
  }

  /**
   * Generate PKCE code challenge
   */
  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest("SHA-256", data);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));

    // Convert to URL-safe base64
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  /**
   * Open URL in system browser
   */
  private async openInBrowser(url: string): Promise<void> {
    try {
      // Try Electron first
      if ((window.electronAPI as any)?.shell?.openExternal) {
        await (window.electronAPI as any).shell.openExternal(url);
      } else {
        // Fallback to web browser with popup
        const popup = window.open(
          url,
          "oauth2_popup",
          "width=600,height=700,scrollbars=yes,resizable=yes"
        );

        if (!popup) {
          throw new Error(
            "Popup blocked. Please allow popups for OAuth2 authentication."
          );
        }

        // Monitor popup for completion
        this.monitorPopup(popup);
      }
    } catch (error) {
      console.error("Failed to open browser:", error);
      // Final fallback - try direct window.open
      window.open(url, "_blank");
    }
  }

  /**
   * Monitor OAuth2 popup window
   */
  private monitorPopup(popup: Window): void {
    let hasCOOPError = false;

    const checkClosed = setInterval(
      () => {
        try {
          // Try to check if popup is closed, but handle COOP errors gracefully
          if (popup.closed) {
            clearInterval(checkClosed);
            this.handlePopupClosed();
          }
        } catch (error) {
          // Handle Cross-Origin-Opener-Policy errors
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (
            (errorMessage.includes("Cross-Origin-Opener-Policy") ||
              errorMessage.includes("cross-origin")) &&
            !hasCOOPError
          ) {
            hasCOOPError = true; // Only log once
            console.log("COOP policy detected, using localStorage fallback");
          }

          // Silently check localStorage for callback regardless of popup status
          // Only run this once every 3 seconds to reduce frequency
          if (!hasCOOPError) {
            this.handlePopupClosed();
          }
        }
      },
      hasCOOPError ? 3000 : 1000
    ); // Slow down polling if COOP detected

    // Also set up a timeout to stop monitoring after 10 minutes
    setTimeout(() => {
      clearInterval(checkClosed);
      console.log("OAuth2 popup monitoring timeout");
    }, 10 * 60 * 1000);
  }

  /**
   * Handle popup closed event or fallback check
   */
  private handlePopupClosed(): void {
    // Check localStorage for callback data
    const callbackData = localStorage.getItem("oauth2_callback");
    if (callbackData) {
      try {
        const data = JSON.parse(callbackData);

        // Check if callback is recent (within 5 minutes)
        if (Date.now() - data.timestamp < 5 * 60 * 1000) {
          // Trigger callback handling
          window.postMessage(
            {
              type: "oauth_callback",
              url: data.url,
              code: data.code,
              state: data.state,
            },
            window.location.origin
          );

          // Clean up
          localStorage.removeItem("oauth2_callback");
        }
      } catch (error) {
        console.error(
          "Error processing OAuth2 callback from localStorage:",
          error
        );
      }
    }
  }

  /**
   * Store token data in secure storage
   */
  private storeToken(tokenData: OAuth2TokenResponse, serverId?: string): void {
    const expiresAt = Date.now() + tokenData.expires_in * 1000;
    const storageData = {
      ...tokenData,
      expires_at: expiresAt,
      stored_at: Date.now(),
    };

    // Store with server-specific key if provided
    const key = serverId ? `oauth2_token_${serverId}` : "oauth2_token";
    localStorage.setItem(key, JSON.stringify(storageData));
  }

  /**
   * Get stored token data
   */
  private getStoredToken(serverId: string): any {
    const stored = localStorage.getItem(`oauth2_token_${serverId}`);
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Clear stored token
   */
  private clearStoredToken(serverId: string): void {
    localStorage.removeItem(`oauth2_token_${serverId}`);
  }
}
