// Authentication configuration for MCP Studio
// In Electron, environment variables need to be passed from main process

// Function to get configuration from environment or main process
function getAuthConfig() {
  // For development, try to get from window object first (if exposed by main process)
  if (window.electronAPI?.getAuthConfig) {
    return window.electronAPI.getAuthConfig();
  }
  
  // Fallback to environment variables (for web development)
  return {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      scopes: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      scopes: ["user:email", "read:user"],
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID || "",
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
      tenantId: process.env.MICROSOFT_TENANT_ID || "common",
      scopes: ["openid", "profile", "email", "User.Read"],
    },
    ibm: {
      clientId: process.env.IBM_CLIENT_ID || "",
      clientSecret: process.env.IBM_CLIENT_SECRET || "",
      authUrl: process.env.IBM_AUTH_URL || "https://w3id.sso.ibm.com/oidc/endpoint/default/authorize",
      tokenUrl: process.env.IBM_TOKEN_URL || "https://w3id.sso.ibm.com/oidc/endpoint/default/token",
      userInfoUrl: process.env.IBM_USERINFO_URL || "https://w3id.sso.ibm.com/oidc/endpoint/default/userinfo",
      scopes: ["openid", "profile", "email"],
    },
  };
}

export const AUTH_CONFIG = getAuthConfig();
