import React, { useState, useEffect } from "react";
import { OAuth2Service, OAuth2Config } from "../services/OAuth2Service";
import OAuth2IntegrationService from "../services/OAuth2IntegrationService";
import { APIAuthentication } from "../../shared/apiServerTypes";
import {
  OAUTH2_TEMPLATES,
  applyOAuth2Template,
  getOAuth2TemplateNames,
} from "../../shared/oauth2Templates";

interface OAuth2FlowComponentProps {
  serverConfig: any;
  setServerConfig: (config: any) => void;
  onTokenReceived?: (token: string) => void;
  serverId?: string;
}

export const OAuth2FlowComponent: React.FC<OAuth2FlowComponentProps> = ({
  serverConfig,
  setServerConfig,
  onTokenReceived,
  serverId = "default",
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStatus, setAuthStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authStatusInfo, setAuthStatusInfo] = useState<
    "authenticated" | "expired" | "missing"
  >("missing");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const oauth2Service = OAuth2Service.getInstance();
  const oauth2Integration = OAuth2IntegrationService.getInstance();

  // Check authentication status on component mount and when serverId changes
  useEffect(() => {
    if (serverId) {
      const status = oauth2Integration.getAuthenticationStatus(serverId);
      setAuthStatusInfo(status);
      if (status === "authenticated") {
        setAuthStatus("success");
      } else {
        setAuthStatus("idle");
      }
    }

    // Add localStorage polling for OAuth callback
    const pollForOAuthCallback = () => {
      const callbackData = localStorage.getItem("oauth2_callback");
      if (callbackData) {
        try {
          const data = JSON.parse(callbackData);
          // Check if this is a recent callback (within last 5 minutes)
          if (Date.now() - data.timestamp < 300000) {
            console.log("Found OAuth callback in localStorage, processing...", data);
            localStorage.removeItem("oauth2_callback");
            handleOAuth2CallbackFromStorage(data.url);
          }
        } catch (e) {
          console.error("Error parsing OAuth callback data:", e);
        }
      }
    };

    // Poll every 1 second when authenticating
    let pollingInterval: NodeJS.Timeout;
    if (authStatus === "pending") {
      pollingInterval = setInterval(pollForOAuthCallback, 1000);
    }

    // Listen for custom OAuth callback events
    const handleCustomOAuthEvent = (event: CustomEvent) => {
      if (event.type === "oauth2-callback" && event.detail) {
        console.log("Received custom OAuth callback event:", event.detail);
        handleOAuth2CallbackFromStorage(event.detail.url);
      }
    };

    window.addEventListener("oauth2-callback", handleCustomOAuthEvent as EventListener);

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      window.removeEventListener("oauth2-callback", handleCustomOAuthEvent as EventListener);
    };
  }, [serverId, authStatus]);

  // Also check server config for valid tokens and sync states
  useEffect(() => {
    if (hasValidToken()) {
      setAuthStatusInfo("authenticated");
      setAuthStatus("success");
    } else {
      setAuthStatusInfo("missing");
      if (authStatus === "success") {
        setAuthStatus("idle");
      }
    }
  }, [
    serverConfig.authentication?.oauth2?.accessToken,
    serverConfig.authentication?.oauth2?.tokenExpiry,
  ]);

  const handleStartAuth = async () => {
    if (!serverConfig.authentication?.oauth2) {
      setAuthError("OAuth2 configuration is incomplete");
      return;
    }

    setIsAuthenticating(true);
    setAuthStatus("pending");
    setAuthError(null);

    try {
      // Determine the correct redirect URI based on environment and template
      const getRedirectUri = () => {
        // For Spotify, always use the IPv4 address and underscore format
        if (selectedTemplate === "spotify") {
          return "http://127.0.0.1:3000/oauth_callback.html";
        }

        // For IBM SSO templates, use standard localhost format
        if (selectedTemplate === "ibmSso" || selectedTemplate === "ibmWatson" || selectedTemplate === "ibmCloudant") {
          return "http://localhost:3000/oauth-callback.html";
        }

        if (window.location.protocol === "file:") {
          // For file:// protocol (like Electron), use localhost
          return "http://localhost:3000/oauth-callback.html";
        } else {
          // For http/https, use the actual origin
          return `${window.location.origin}/oauth-callback.html`;
        }
      };

      const oauth2Config: OAuth2Config = {
        authUrl: serverConfig.authentication.oauth2.authUrl || "",
        tokenUrl: serverConfig.authentication.oauth2.tokenUrl || "",
        clientId: serverConfig.authentication.oauth2.clientId || "",
        clientSecret: serverConfig.authentication.oauth2.clientSecret || "",
        scopes: serverConfig.authentication.oauth2.scopes || [],
        redirectUri: getRedirectUri(),
        usePKCE: serverConfig.authentication.oauth2.flow === "pkce",
      };

      // Validate required fields
      if (
        !oauth2Config.authUrl ||
        !oauth2Config.tokenUrl ||
        !oauth2Config.clientId
      ) {
        throw new Error(
          "OAuth2 configuration missing required fields (authUrl, tokenUrl, clientId)"
        );
      }

      // Debug logging
      if (localStorage.getItem("oauth2_debug")) {
        console.log("Starting OAuth2 flow with config:", {
          ...oauth2Config,
          clientSecret: oauth2Config.clientSecret ? "[HIDDEN]" : undefined,
        });
      }

      // Set up callback listener for Electron
      if (window.electronAPI) {
        const unsubscribe = window.electronAPI.onOAuth2Callback(
          handleOAuth2CallbackFromElectron
        );
        // Store unsubscribe function to clean up later
        (window as any).oauth2Unsubscribe = unsubscribe;
        
        // Set a timeout to clean up if no callback is received
        const timeoutId = setTimeout(() => {
          console.log("🔗 OAuth2 timeout - cleaning up listener");
          unsubscribe();
          delete (window as any).oauth2Unsubscribe;
          if (authStatus === "pending") {
            setAuthError("Authentication timed out. Please try again.");
            setAuthStatus("error");
            setIsAuthenticating(false);
          }
        }, 5 * 60 * 1000); // 5 minute timeout
        
        // Store timeout ID for cleanup
        (window as any).oauth2Timeout = timeoutId;
      } else {
        // For web browsers, use message listener
        window.addEventListener("message", handleAuthCallback, false);
      }

      // Start the OAuth2 flow - don't auto-open since we handle it ourselves
      const authUrl = await oauth2Service.initiateAuth(oauth2Config, false);

      // Open URL externally for Electron or in popup for web
      if (window.electronAPI) {
        await window.electronAPI.openOAuth2Url(authUrl);
      } else {
        window.open(authUrl, "_blank", "width=600,height=700");
      }

      // Show user that browser will open
      setAuthStatus("pending");
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Authentication failed"
      );
      setAuthStatus("error");
      setIsAuthenticating(false);
    }
  };

  const handleAuthCallback = async (event: MessageEvent) => {
    // For OAuth callbacks, we need to be more permissive with origins
    // since the callback can come from any OAuth provider domain
    if (event.data.type === "oauth_callback") {
      console.log("OAuth callback received via message:", event.data);
    } else {
      // For other message types, still check origin
      if (
        event.origin !== window.location.origin &&
        event.origin !== "http://localhost:3000" &&
        event.origin !== "http://127.0.0.1:3000"
      )
        return;
    }

    if (event.data.type === "oauth_callback") {
      try {
        // Use the same redirect URI logic
        const getRedirectUri = () => {
          // For Spotify, always use the IPv4 address and underscore format
          if (selectedTemplate === "spotify") {
            return "http://127.0.0.1:3000/oauth_callback.html";
          }

          if (window.location.protocol === "file:") {
            return "http://localhost:3000/oauth-callback.html";
          } else {
            return `${window.location.origin}/oauth-callback.html`;
          }
        };

        const oauth2Config: OAuth2Config = {
          authUrl: serverConfig.authentication.oauth2.authUrl || "",
          tokenUrl: serverConfig.authentication.oauth2.tokenUrl || "",
          clientId: serverConfig.authentication.oauth2.clientId || "",
          clientSecret: serverConfig.authentication.oauth2.clientSecret || "",
          scopes: serverConfig.authentication.oauth2.scopes || [],
          redirectUri: getRedirectUri(),
          usePKCE: serverConfig.authentication.oauth2.flow === "pkce",
        };

        const tokenResponse = await oauth2Service.handleCallback(
          oauth2Config,
          event.data.url
        );

        // Store token in OAuth2Service with server ID for OAuth2IntegrationService compatibility
        if (serverId && serverId !== "default") {
          // Store the token explicitly with server ID
          localStorage.setItem(
            `oauth2_token_${serverId}`,
            JSON.stringify({
              ...tokenResponse,
              expires_at: Date.now() + tokenResponse.expires_in * 1000,
              stored_at: Date.now(),
            })
          );
        }

        // Update server config with token
        setServerConfig({
          ...serverConfig,
          authentication: {
            ...serverConfig.authentication,
            oauth2: {
              ...serverConfig.authentication.oauth2,
              accessToken: tokenResponse.access_token,
              refreshToken: tokenResponse.refresh_token,
              tokenExpiry: Date.now() + tokenResponse.expires_in * 1000,
            },
          },
        });

        setAuthStatus("success");
        setAuthStatusInfo("authenticated"); // Update the authentication status info
        onTokenReceived?.(tokenResponse.access_token);
      } catch (error) {
        setAuthError(
          error instanceof Error ? error.message : "Token exchange failed"
        );
        setAuthStatus("error");
        setAuthStatusInfo("missing"); // Reset status on error
      } finally {
        setIsAuthenticating(false);
        window.removeEventListener("message", handleAuthCallback, false);
      }
    }
  };

  const handleOAuth2CallbackFromStorage = async (callbackUrl: string) => {
    console.log("🔗 OAuth2 callback received from localStorage/events:", callbackUrl);

    try {
      // Use the same redirect URI logic
      const getRedirectUri = () => {
        // For Spotify, always use the IPv4 address and underscore format
        if (selectedTemplate === "spotify") {
          return "http://127.0.0.1:3000/oauth_callback.html";
        }

        if (window.location.protocol === "file:") {
          return "http://localhost:3000/oauth-callback.html";
        } else {
          return `${window.location.origin}/oauth-callback.html`;
        }
      };

      const oauth2Config: OAuth2Config = {
        authUrl: serverConfig.authentication.oauth2.authUrl || "",
        tokenUrl: serverConfig.authentication.oauth2.tokenUrl || "",
        clientId: serverConfig.authentication.oauth2.clientId || "",
        clientSecret: serverConfig.authentication.oauth2.clientSecret || "",
        scopes: serverConfig.authentication.oauth2.scopes || [],
        redirectUri: getRedirectUri(),
        usePKCE: serverConfig.authentication.oauth2.flow === "pkce",
      };

      const tokenResponse = await oauth2Service.handleCallback(
        oauth2Config,
        callbackUrl
      );

      // Store token in OAuth2Service with server ID for OAuth2IntegrationService compatibility
      if (serverId && serverId !== "default") {
        // Store the token explicitly with server ID
        localStorage.setItem(
          `oauth2_token_${serverId}`,
          JSON.stringify({
            ...tokenResponse,
            expires_at: Date.now() + tokenResponse.expires_in * 1000,
            stored_at: Date.now(),
          })
        );
      }

      // Update server config with token
      setServerConfig({
        ...serverConfig,
        authentication: {
          ...serverConfig.authentication,
          oauth2: {
            ...serverConfig.authentication.oauth2,
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token,
            tokenExpiry: Date.now() + tokenResponse.expires_in * 1000,
          },
        },
      });

      setAuthStatus("success");
      setAuthStatusInfo("authenticated");
      onTokenReceived?.(tokenResponse.access_token);
    } catch (error) {
      console.error("OAuth callback from storage failed:", error);
      setAuthError(
        error instanceof Error ? error.message : "Token exchange failed"
      );
      setAuthStatus("error");
      setAuthStatusInfo("missing");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleOAuth2CallbackFromElectron = async (callbackUrl: string) => {
    console.log("🔗 OAuth2 callback received from Electron:", callbackUrl);

    try {
      // Use the same redirect URI logic
      const getRedirectUri = () => {
        // For Spotify, always use the IPv4 address and underscore format
        if (selectedTemplate === "spotify") {
          return "http://127.0.0.1:3000/oauth_callback.html";
        }

        if (window.location.protocol === "file:") {
          return "http://localhost:3000/oauth-callback.html";
        } else {
          return `${window.location.origin}/oauth-callback.html`;
        }
      };

      const oauth2Config: OAuth2Config = {
        authUrl: serverConfig.authentication.oauth2.authUrl || "",
        tokenUrl: serverConfig.authentication.oauth2.tokenUrl || "",
        clientId: serverConfig.authentication.oauth2.clientId || "",
        clientSecret: serverConfig.authentication.oauth2.clientSecret || "",
        scopes: serverConfig.authentication.oauth2.scopes || [],
        redirectUri: getRedirectUri(),
        usePKCE: serverConfig.authentication.oauth2.flow === "pkce",
      };

      const tokenResponse = await oauth2Service.handleCallback(
        oauth2Config,
        callbackUrl
      );

      // Store token in OAuth2Service with server ID for OAuth2IntegrationService compatibility
      if (serverId && serverId !== "default") {
        // Store the token explicitly with server ID
        localStorage.setItem(
          `oauth2_token_${serverId}`,
          JSON.stringify({
            ...tokenResponse,
            expires_at: Date.now() + tokenResponse.expires_in * 1000,
            stored_at: Date.now(),
          })
        );
      }

      // Update server config with token
      setServerConfig({
        ...serverConfig,
        authentication: {
          ...serverConfig.authentication,
          oauth2: {
            ...serverConfig.authentication.oauth2,
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token,
            tokenExpiry: Date.now() + tokenResponse.expires_in * 1000,
          },
        },
      });

      setAuthStatus("success");
      setAuthStatusInfo("authenticated");
      onTokenReceived?.(tokenResponse.access_token);
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Token exchange failed"
      );
      setAuthStatus("error");
      setAuthStatusInfo("missing");
    } finally {
      setIsAuthenticating(false);

      // Clean up the callback listener and timeout
      if ((window as any).oauth2Unsubscribe) {
        (window as any).oauth2Unsubscribe();
        delete (window as any).oauth2Unsubscribe;
      }
      
      if ((window as any).oauth2Timeout) {
        clearTimeout((window as any).oauth2Timeout);
        delete (window as any).oauth2Timeout;
      }
    }
  };

  const handleSignOut = () => {
    // Clear authentication from OAuth2IntegrationService
    oauth2Integration.clearAuthentication(serverId);

    // Update local state
    setAuthStatusInfo("missing");
    setAuthStatus("idle");
    setAuthError(null);

    // Clear tokens from server config
    setServerConfig({
      ...serverConfig,
      authentication: {
        ...serverConfig.authentication,
        oauth2: {
          ...serverConfig.authentication?.oauth2,
          accessToken: undefined,
          refreshToken: undefined,
          tokenExpiry: undefined,
        },
      },
    });
  };

  const isConfigComplete = () => {
    const oauth2 = serverConfig.authentication?.oauth2;
    return oauth2?.authUrl && oauth2?.tokenUrl && oauth2?.clientId;
  };

  const hasValidToken = () => {
    // First check if OAuth2Service considers this server authenticated
    if (serverId && serverId !== "default") {
      return oauth2Service.isTokenValid(serverId);
    }

    // Fallback to checking server config directly
    const oauth2 = serverConfig.authentication?.oauth2;
    if (!oauth2?.accessToken) return false;
    if (!oauth2?.tokenExpiry) return true; // If no expiry, assume valid
    return oauth2.tokenExpiry > Date.now();
  };

  // Apply OAuth2 template when selected
  const handleTemplateSelect = (templateKey: string) => {
    if (!templateKey) return;

    const template = OAUTH2_TEMPLATES[templateKey];
    if (!template) return;

    // Use the applyOAuth2Template helper to get the correct configuration
    const templateConfig = applyOAuth2Template(
      templateKey,
      serverConfig.authentication?.oauth2?.clientId || "",
      serverConfig.authentication?.oauth2?.clientSecret
    );

    setServerConfig({
      ...serverConfig,
      authentication: {
        ...serverConfig.authentication,
        oauth2: {
          ...serverConfig.authentication?.oauth2,
          authUrl: template.authUrl,
          tokenUrl: template.tokenUrl,
          scopes: template.scopes,
          flow: template.flow,
          redirectUri: templateConfig.redirectUri, // Use the correct redirect URI
        },
      },
    });

    setSelectedTemplate(templateKey);
  };

  return (
    <div className="space-y-4">
      {/* OAuth2 Provider Templates */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-300 mb-3 flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          OAuth2 Provider Templates
        </h4>
        <p className="text-xs text-blue-200/80 mb-3">
          Choose a pre-configured template for popular OAuth2 providers to get
          started quickly.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(OAUTH2_TEMPLATES).map(([key, template]) => (
            <button
              key={key}
              onClick={() => handleTemplateSelect(key)}
              className={`text-left p-3 rounded-lg transition-all ${
                selectedTemplate === key
                  ? "bg-blue-600/20 border border-blue-500/40"
                  : "bg-slate-800/50 border border-slate-700/30 hover:border-blue-500/30"
              }`}
            >
              <div className="font-medium text-white text-sm">
                {template.name}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {template.description}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    template.flow === "pkce"
                      ? "bg-green-500/20 text-green-300"
                      : "bg-blue-500/20 text-blue-300"
                  }`}
                >
                  {template.flow.toUpperCase()}
                </span>
                <span className="text-xs text-slate-500">
                  {template.scopes.length} scope
                  {template.scopes.length !== 1 ? "s" : ""}
                </span>
              </div>
              {template.redirectUriNote && (
                <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-300 text-xs">
                  <strong>📝 Note:</strong> {template.redirectUriNote}
                </div>
              )}
            </button>
          ))}
        </div>

        {selectedTemplate && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-green-300 font-medium">
                  ✓ Template Applied: {OAUTH2_TEMPLATES[selectedTemplate].name}
                </div>
                <div className="text-xs text-green-200/80 mt-1">
                  Configuration fields have been automatically filled. You still
                  need to provide your Client ID and Client Secret.
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedTemplate("");
                  // Optionally clear the configuration
                }}
                className="text-xs px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors"
              >
                Clear Template
              </button>
            </div>

            {OAUTH2_TEMPLATES[selectedTemplate].documentation && (
              <div className="mt-2">
                <a
                  href={OAUTH2_TEMPLATES[selectedTemplate].documentation}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-300 hover:text-blue-200 underline"
                >
                  📚 View {OAUTH2_TEMPLATES[selectedTemplate].name}{" "}
                  Documentation
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* OAuth2 Configuration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Authorization URL *
          </label>
          <input
            type="url"
            value={serverConfig.authentication?.oauth2?.authUrl || ""}
            onChange={(e) =>
              setServerConfig({
                ...serverConfig,
                authentication: {
                  ...serverConfig.authentication,
                  oauth2: {
                    ...serverConfig.authentication?.oauth2,
                    authUrl: e.target.value,
                  },
                },
              })
            }
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://auth.example.com/oauth/authorize"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Token URL *
          </label>
          <input
            type="url"
            value={serverConfig.authentication?.oauth2?.tokenUrl || ""}
            onChange={(e) =>
              setServerConfig({
                ...serverConfig,
                authentication: {
                  ...serverConfig.authentication,
                  oauth2: {
                    ...serverConfig.authentication?.oauth2,
                    tokenUrl: e.target.value,
                  },
                },
              })
            }
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://auth.example.com/oauth/token"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Client ID *
          </label>
          <input
            type="text"
            value={serverConfig.authentication?.oauth2?.clientId || ""}
            onChange={(e) =>
              setServerConfig({
                ...serverConfig,
                authentication: {
                  ...serverConfig.authentication,
                  oauth2: {
                    ...serverConfig.authentication?.oauth2,
                    clientId: e.target.value,
                  },
                },
              })
            }
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your-client-id"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Client Secret (optional for PKCE)
          </label>
          <input
            type="password"
            value={serverConfig.authentication?.oauth2?.clientSecret || ""}
            onChange={(e) =>
              setServerConfig({
                ...serverConfig,
                authentication: {
                  ...serverConfig.authentication,
                  oauth2: {
                    ...serverConfig.authentication?.oauth2,
                    clientSecret: e.target.value,
                  },
                },
              })
            }
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your-client-secret"
          />
        </div>
      </div>

      {/* Flow Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          OAuth2 Flow
        </label>
        <select
          value={
            serverConfig.authentication?.oauth2?.flow || "authorization_code"
          }
          onChange={(e) =>
            setServerConfig({
              ...serverConfig,
              authentication: {
                ...serverConfig.authentication,
                oauth2: {
                  ...serverConfig.authentication?.oauth2,
                  flow: e.target.value,
                },
              },
            })
          }
          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white"
        >
          <option value="authorization_code">Authorization Code</option>
          <option value="pkce">Authorization Code with PKCE</option>
          <option value="client_credentials">Client Credentials</option>
        </select>
      </div>

      {/* Scopes */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Scopes (space-separated)
        </label>
        <input
          type="text"
          value={serverConfig.authentication?.oauth2?.scopes?.join(" ") || ""}
          onChange={(e) =>
            setServerConfig({
              ...serverConfig,
              authentication: {
                ...serverConfig.authentication,
                oauth2: {
                  ...serverConfig.authentication?.oauth2,
                  scopes: e.target.value.split(" ").filter((s) => s.trim()),
                },
              },
            })
          }
          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="read write admin"
        />
      </div>

      {/* Redirect URI Information */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
        <h4 className="text-sm font-medium text-blue-300 mb-2 flex items-center gap-2">
          ℹ️ OAuth2 Configuration Info
        </h4>
        <div className="text-xs text-blue-200/80">
          <div className="mb-2">
            <span className="font-medium">
              Redirect URI to configure in your OAuth2 provider:
            </span>
          </div>
          <code className="bg-slate-800/50 px-2 py-1 rounded text-blue-300 font-mono">
            {(() => {
              // Show the correct redirect URI based on the selected template
              if (selectedTemplate === "spotify") {
                return "http://127.0.0.1:3000/oauth_callback.html";
              }
              return window.location.protocol === "file:"
                ? "http://localhost:3000/oauth-callback.html"
                : `${window.location.origin}/oauth-callback.html`;
            })()}
          </code>
          <div className="mt-2 text-blue-200/60">
            Make sure to add this exact URL to your OAuth2 app's authorized
            redirect URIs.
            {selectedTemplate === "spotify" && (
              <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-300 text-xs">
                <strong>⚠️ Spotify Requirement:</strong> Use the exact IPv4
                address (127.0.0.1) and underscore format (oauth_callback.html)
                - NOT localhost or hyphen format!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Authentication Status Display */}
      <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4 mb-4">
        <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              authStatusInfo === "authenticated"
                ? "bg-green-500"
                : authStatusInfo === "expired"
                ? "bg-yellow-500"
                : "bg-red-500"
            }`}
          ></div>
          OAuth2 Authentication Status
        </h4>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Status:</span>
            <span
              className={`capitalize ${
                authStatusInfo === "authenticated"
                  ? "text-green-400"
                  : authStatusInfo === "expired"
                  ? "text-yellow-400"
                  : "text-red-400"
              }`}
            >
              {authStatusInfo === "missing"
                ? "Not Authenticated"
                : authStatusInfo}
            </span>
          </div>

          {authStatusInfo !== "missing" && (
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Token Type:</span>
              <span className="text-slate-300">Bearer</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          {authStatusInfo !== "authenticated" && (
            <button
              onClick={handleStartAuth}
              disabled={authStatus === "pending"}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                authStatus === "pending"
                  ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              } flex items-center gap-2`}
            >
              {authStatus === "pending" ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin"></div>
                  Authenticating...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2h-2m-4 0v10m4-10a2 2 0 00-2-2m2 2H9m4 0V9a2 2 0 00-2-2m2 2h2"
                    />
                  </svg>
                  Start Authentication
                </>
              )}
            </button>
          )}

          {authStatusInfo === "authenticated" && (
            <button
              onClick={handleSignOut}
              className="px-4 py-2 rounded-lg font-medium transition-colors bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign Out
            </button>
          )}
        </div>
      </div>

      {authStatus === "pending" && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <div>
              <h4 className="text-blue-300 font-medium">
                Authentication in Progress
              </h4>
              <p className="text-blue-200/80 text-sm">
                Please complete the authentication in your browser, then return
                here.
              </p>
            </div>
          </div>
        </div>
      )}

      {authStatus === "success" && authStatusInfo === "authenticated" && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <svg
                className="w-3 h-3 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h4 className="text-green-300 font-medium">
                Authentication Successful!
              </h4>
              <p className="text-green-200/80 text-sm">
                You are now authenticated and can use this API through the MCP
                server.
              </p>
            </div>
          </div>
        </div>
      )}

      {authStatus === "error" && authError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <svg
                className="w-3 h-3 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h4 className="text-red-300 font-medium">
                Authentication Failed
              </h4>
              <p className="text-red-200/80 text-sm">{authError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="text-sm text-slate-400 bg-slate-800/30 rounded-lg p-3">
        <p className="font-medium mb-1">How it works:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click "Start OAuth2 Authentication" to begin the flow</li>
          <li>Your browser will open to the authorization server</li>
          <li>Log in and grant permissions to your application</li>
          <li>You'll be redirected back and the token will be stored</li>
          <li>The MCP server will use this token for API requests</li>
        </ol>
      </div>
    </div>
  );
};
