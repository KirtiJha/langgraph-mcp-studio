import {
  AuthUser,
  AuthProvider,
  AuthConfig,
  SSOConfig,
} from "../../shared/types";
import { AUTH_CONFIG } from "../config/authConfig";
import { OAuth2Service, OAuth2Config } from "./OAuth2Service";

export class AuthService {
  private static instance: AuthService;
  private oauth2Service: OAuth2Service;
  private config: AuthConfig;
  private currentUser: AuthUser | null = null;
  private authListeners: ((user: AuthUser | null) => void)[] = [];
  private configPromise: Promise<any>;

  private constructor() {
    this.oauth2Service = OAuth2Service.getInstance();
    this.configPromise = this.loadAuthConfig();
    this.config = this.getDefaultConfig();
    this.loadUserFromStorage();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async loadAuthConfig(): Promise<any> {
    try {
      const config = await AUTH_CONFIG;
      return config;
    } catch (error) {
      console.error("Failed to load auth config:", error);
      // Return default config if loading fails
      return {
        google: { clientId: "", clientSecret: "", scopes: [] },
        github: { clientId: "", clientSecret: "", scopes: [] },
        microsoft: {
          clientId: "",
          clientSecret: "",
          tenantId: "common",
          scopes: [],
        },
      };
    }
  }

  private getDefaultConfig(): AuthConfig {
    return {
      providers: {
        google: {
          clientId: "",
          clientSecret: "",
          scopes: [
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
          ],
        },
        github: {
          clientId: "",
          clientSecret: "",
          scopes: ["user:email", "read:user"],
        },
        microsoft: {
          clientId: "",
          clientSecret: "",
          tenantId: "common",
          scopes: ["openid", "profile", "email", "User.Read"],
        },
        ibm: {
          clientId: "",
          clientSecret: "",
          authUrl: "https://w3id.sso.ibm.com/oidc/endpoint/default/authorize",
          tokenUrl: "https://w3id.sso.ibm.com/oidc/endpoint/default/token",
          userInfoUrl: "https://w3id.sso.ibm.com/oidc/endpoint/default/userinfo",
          scopes: ["openid", "profile", "email"],
        },
      },
      redirectUri: this.getRedirectUri(),
    };
  }

  private getRedirectUri(): string {
    // For desktop Electron apps, use localhost with the callback path
    return "http://localhost:3000/oauth-callback.html";
  }

  public updateConfig(config: Partial<AuthConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public addAuthListener(
    listener: (user: AuthUser | null) => void
  ): () => void {
    this.authListeners.push(listener);
    return () => {
      const index = this.authListeners.indexOf(listener);
      if (index > -1) {
        this.authListeners.splice(index, 1);
      }
    };
  }

  private notifyAuthListeners(): void {
    this.authListeners.forEach((listener) => listener(this.currentUser));
  }

  private loadUserFromStorage(): void {
    try {
      const userData = localStorage.getItem("mcp_studio_auth_user");
      if (userData) {
        const user = JSON.parse(userData) as AuthUser;
        // Check if token is still valid
        if (user.expiresAt && user.expiresAt > Date.now()) {
          this.currentUser = user;
        } else {
          localStorage.removeItem("mcp_studio_auth_user");
        }
      }
    } catch (error) {
      console.error("Error loading user from storage:", error);
      localStorage.removeItem("mcp_studio_auth_user");
    }
  }

  private saveUserToStorage(user: AuthUser): void {
    try {
      localStorage.setItem("mcp_studio_auth_user", JSON.stringify(user));
    } catch (error) {
      console.error("Error saving user to storage:", error);
    }
  }

  public getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public async signInWithGoogle(): Promise<AuthUser> {
    const authConfig = await this.configPromise;
    const providerConfig = authConfig.google;

    if (!providerConfig?.clientId) {
      throw new Error("Google OAuth2 configuration not found");
    }

    const oauth2Config: OAuth2Config = {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      clientId: providerConfig.clientId,
      clientSecret: providerConfig.clientSecret,
      scopes: providerConfig.scopes,
      redirectUri: this.config.redirectUri,
      usePKCE: !providerConfig.clientSecret,
    };

    return this.performOAuth2Flow(oauth2Config, "google");
  }

  public async signInWithGitHub(): Promise<AuthUser> {
    const authConfig = await this.configPromise;
    const providerConfig = authConfig.github;

    if (!providerConfig?.clientId) {
      throw new Error("GitHub OAuth2 configuration not found");
    }

    const oauth2Config: OAuth2Config = {
      authUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      clientId: providerConfig.clientId,
      clientSecret: providerConfig.clientSecret,
      scopes: providerConfig.scopes,
      redirectUri: this.config.redirectUri,
      usePKCE: false, // GitHub doesn't support PKCE
    };

    return this.performOAuth2Flow(oauth2Config, "github");
  }

  public async signInWithMicrosoft(): Promise<AuthUser> {
    const authConfig = await this.configPromise;
    const providerConfig = authConfig.microsoft;

    if (!providerConfig?.clientId) {
      throw new Error("Microsoft OAuth2 configuration not found");
    }

    const tenantId = providerConfig.tenantId || "common";
    const oauth2Config: OAuth2Config = {
      authUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      clientId: providerConfig.clientId,
      clientSecret: providerConfig.clientSecret,
      scopes: providerConfig.scopes,
      redirectUri: this.config.redirectUri,
      usePKCE: !providerConfig.clientSecret,
    };

    return this.performOAuth2Flow(oauth2Config, "microsoft");
  }

  public async signInWithIBM(): Promise<AuthUser> {
    const authConfig = await this.configPromise;
    const providerConfig = authConfig.ibm;

    if (!providerConfig?.clientId) {
      throw new Error("IBM SSO configuration not found");
    }

    const oauth2Config: OAuth2Config = {
      authUrl: providerConfig.authUrl || "https://w3id.sso.ibm.com/oidc/endpoint/default/authorize",
      tokenUrl: providerConfig.tokenUrl || "https://w3id.sso.ibm.com/oidc/endpoint/default/token",
      clientId: providerConfig.clientId,
      clientSecret: providerConfig.clientSecret,
      scopes: providerConfig.scopes,
      redirectUri: this.config.redirectUri,
      usePKCE: !providerConfig.clientSecret,
    };

    return this.performOAuth2Flow(oauth2Config, "ibm");
  }

  public async signInWithSSO(): Promise<AuthUser> {
    const providerConfig = this.config.providers.sso;
    if (!providerConfig?.clientId) {
      throw new Error("SSO configuration not found");
    }

    const oauth2Config: OAuth2Config = {
      authUrl: providerConfig.authUrl,
      tokenUrl: providerConfig.tokenUrl,
      clientId: providerConfig.clientId,
      clientSecret: providerConfig.clientSecret,
      scopes: providerConfig.scopes,
      redirectUri: this.config.redirectUri,
      usePKCE: !providerConfig.clientSecret,
    };

    return this.performOAuth2Flow(oauth2Config, "sso");
  }

  private async performOAuth2Flow(
    oauth2Config: OAuth2Config,
    provider: AuthProvider
  ): Promise<AuthUser> {
    try {
      // Start OAuth2 flow
      const authUrl = await this.oauth2Service.initiateAuth(
        oauth2Config,
        false
      );

      // Open OAuth2 window
      await this.openOAuth2Window(authUrl);

      // Wait for callback
      const callbackUrl = await this.waitForOAuth2Callback();

      // Exchange code for token
      const tokenResponse = await this.oauth2Service.handleCallback(
        oauth2Config,
        callbackUrl
      );

      // Get user info
      const userInfo = await this.getUserInfo(
        provider,
        tokenResponse.access_token
      );

      // Create user object
      const user: AuthUser = {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        avatar: userInfo.picture,
        provider,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: Date.now() + tokenResponse.expires_in * 1000,
        createdAt: Date.now(),
      };

      // Save user
      this.currentUser = user;
      this.saveUserToStorage(user);
      this.notifyAuthListeners();

      return user;
    } catch (error) {
      console.error(`OAuth2 flow error for ${provider}:`, error);
      throw error;
    }
  }

  private async openOAuth2Window(authUrl: string): Promise<void> {
    if (window.electronAPI) {
      // In Electron, use IPC to open OAuth2 window
      await window.electronAPI.openAuthWindow(authUrl);
    } else {
      // In browser, open popup
      const popup = window.open(
        authUrl,
        "oauth2",
        "width=600,height=700,scrollbars=yes,resizable=yes"
      );

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups for this site.");
      }
    }
  }

  private async waitForOAuth2Callback(): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("OAuth2 callback timeout"));
      }, 300000); // 5 minute timeout

      if (window.electronAPI) {
        // In Electron, listen for IPC callback
        const unsubscribe = window.electronAPI.onAuthCallback((data: any) => {
          clearTimeout(timeout);
          unsubscribe();

          // Check if we received a callback URL with authorization code
          if (data.url && data.url.includes("code=")) {
            resolve(data.url);
          } else {
            // Check localStorage for the authorization code (fallback)
            try {
              const storedCallback = localStorage.getItem("oauth2_callback");
              if (storedCallback) {
                const callbackData = JSON.parse(storedCallback);
                if (callbackData.code) {
                  // Create a proper callback URL with the code
                  const callbackUrl = `http://localhost:3000/oauth-callback.html?code=${
                    callbackData.code
                  }&state=${callbackData.state || ""}`;
                  localStorage.removeItem("oauth2_callback"); // Clean up
                  resolve(callbackUrl);
                  return;
                }
              }
            } catch (e) {
              console.error("Error reading stored callback:", e);
            }

            // If no code found, use the original URL
            resolve(data.url);
          }
        });
      } else {
        // In browser, listen for message from popup
        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === "oauth_callback") {
            clearTimeout(timeout);
            window.removeEventListener("message", handleMessage);
            resolve(event.data.url);
          }
        };
        window.addEventListener("message", handleMessage);
      }
    });
  }

  private async getUserInfo(
    provider: AuthProvider,
    accessToken: string
  ): Promise<any> {
    const authConfig = await this.configPromise;
    let userInfoUrl: string;
    switch (provider) {
      case "google":
        userInfoUrl = "https://www.googleapis.com/oauth2/v2/userinfo";
        break;
      case "github":
        userInfoUrl = "https://api.github.com/user";
        break;
      case "microsoft":
        userInfoUrl = "https://graph.microsoft.com/v1.0/me";
        break;
      case "ibm":
        userInfoUrl = authConfig.ibm?.userInfoUrl || "https://w3id.sso.ibm.com/oidc/endpoint/default/userinfo";
        break;
      case "sso":
        userInfoUrl = this.config.providers.sso?.userInfoUrl || "/userinfo";
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    try {
      let userInfo: any;
      
      if (window.electronAPI && window.electronAPI.fetchUserInfo) {
        // Use IPC to fetch user info (avoids CORS issues)
        userInfo = await window.electronAPI.fetchUserInfo(userInfoUrl, accessToken);
      } else {
        // Fallback to direct fetch for browser environments
        const headers = {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        };
        
        const response = await fetch(userInfoUrl, { headers });
        if (!response.ok) {
          throw new Error(`Failed to get user info: ${response.statusText}`);
        }
        userInfo = await response.json();
      }

      return this.normalizeUserInfo(provider, userInfo);
    } catch (error) {
      console.error(`Failed to get user info for ${provider}:`, error);
      throw error;
    }
  }

  private normalizeUserInfo(provider: AuthProvider, userInfo: any): any {
    switch (provider) {
      case "google":
        return {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
        };
      case "github":
        return {
          id: userInfo.id.toString(),
          email: userInfo.email,
          name: userInfo.name || userInfo.login,
          picture: userInfo.avatar_url,
        };
      case "microsoft":
        return {
          id: userInfo.id,
          email: userInfo.mail || userInfo.userPrincipalName,
          name: userInfo.displayName,
          picture: userInfo.picture,
        };
      case "ibm":
        return {
          id: userInfo.sub || userInfo.id,
          email: userInfo.email,
          name: userInfo.name || userInfo.preferred_username,
          picture: userInfo.picture,
        };
      case "sso":
        return {
          id: userInfo.sub || userInfo.id,
          email: userInfo.email,
          name: userInfo.name || userInfo.preferred_username,
          picture: userInfo.picture,
          organizationId: userInfo.organization_id,
          organizationName: userInfo.organization_name,
          roles: userInfo.roles,
        };
      default:
        return userInfo;
    }
  }

  public async refreshToken(): Promise<void> {
    if (!this.currentUser?.refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const provider = this.currentUser.provider;
      const providerConfig =
        this.config.providers[provider as keyof typeof this.config.providers];
      if (!providerConfig) {
        throw new Error("Provider configuration not found");
      }

      // Implement token refresh logic based on provider
      // This is simplified - each provider has different refresh token flows
      const refreshResponse = await this.performTokenRefresh(
        this.currentUser.provider,
        this.currentUser.refreshToken
      );

      // Update user with new tokens
      this.currentUser = {
        ...this.currentUser,
        accessToken: refreshResponse.access_token,
        refreshToken:
          refreshResponse.refresh_token || this.currentUser.refreshToken,
        expiresAt: Date.now() + refreshResponse.expires_in * 1000,
      };

      this.saveUserToStorage(this.currentUser);
      this.notifyAuthListeners();
    } catch (error) {
      console.error("Token refresh failed:", error);
      // If refresh fails, sign out the user
      this.signOut();
      throw error;
    }
  }

  private async performTokenRefresh(
    provider: AuthProvider,
    refreshToken: string
  ): Promise<any> {
    // Implement token refresh for each provider
    // This is a simplified implementation
    switch (provider) {
      case "google":
        return this.refreshGoogleToken(refreshToken);
      case "github":
        throw new Error("GitHub doesn't support refresh tokens");
      case "microsoft":
        return this.refreshMicrosoftToken(refreshToken);
      case "ibm":
        return this.refreshIBMToken(refreshToken);
      case "sso":
        return this.refreshSSOToken(refreshToken);
      default:
        throw new Error(`Token refresh not implemented for ${provider}`);
    }
  }

  private async refreshGoogleToken(refreshToken: string): Promise<any> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.config.providers.google?.clientId || "",
        client_secret: this.config.providers.google?.clientSecret || "",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh Google token");
    }

    return response.json();
  }

  private async refreshMicrosoftToken(refreshToken: string): Promise<any> {
    const tenantId = this.config.providers.microsoft?.tenantId || "common";
    const response = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: this.config.providers.microsoft?.clientId || "",
          client_secret: this.config.providers.microsoft?.clientSecret || "",
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to refresh Microsoft token");
    }

    return response.json();
  }

  private async refreshIBMToken(refreshToken: string): Promise<any> {
    const authConfig = await this.configPromise;
    const ibmConfig = authConfig.ibm;
    if (!ibmConfig) {
      throw new Error("IBM configuration not found");
    }

    const tokenUrl = ibmConfig.tokenUrl || "https://w3id.sso.ibm.com/oidc/endpoint/default/token";
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: ibmConfig.clientId || "",
        client_secret: ibmConfig.clientSecret || "",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh IBM token");
    }

    return response.json();
  }

  private async refreshSSOToken(refreshToken: string): Promise<any> {
    const ssoConfig = this.config.providers.sso;
    if (!ssoConfig) {
      throw new Error("SSO configuration not found");
    }

    const response = await fetch(ssoConfig.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: ssoConfig.clientId,
        client_secret: ssoConfig.clientSecret || "",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh SSO token");
    }

    return response.json();
  }

  public signOut(): void {
    this.currentUser = null;
    localStorage.removeItem("mcp_studio_auth_user");
    localStorage.removeItem("mcp_studio_authenticated");
    this.notifyAuthListeners();
  }

  public getAccessToken(): string | null {
    return this.currentUser?.accessToken || null;
  }

  public isTokenExpired(): boolean {
    if (!this.currentUser) return true;
    return (
      !this.currentUser.expiresAt || Date.now() >= this.currentUser.expiresAt
    );
  }

  public async ensureValidToken(): Promise<string> {
    if (!this.currentUser) {
      throw new Error("User not authenticated");
    }

    if (this.isTokenExpired()) {
      await this.refreshToken();
    }

    return this.currentUser.accessToken;
  }
}

export default AuthService;
