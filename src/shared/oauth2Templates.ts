// OAuth2 Provider Templates for Easy Testing

export interface OAuth2Template {
  name: string;
  description: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  flow: "authorization_code" | "pkce";
  requiresClientSecret: boolean;
  documentation: string;
  testEndpoints?: string[];
  redirectUriNote?: string; // Special notes about redirect URI requirements
}

export const OAUTH2_TEMPLATES: Record<string, OAuth2Template> = {
  google: {
    name: "Google APIs",
    description: "Access Google services (Gmail, Calendar, Drive, etc.)",
    authUrl: "https://accounts.google.com/o/oauth2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    flow: "pkce",
    requiresClientSecret: false,
    documentation: "https://developers.google.com/identity/protocols/oauth2",
    testEndpoints: [
      "https://www.googleapis.com/oauth2/v2/userinfo",
      "https://www.googleapis.com/calendar/v3/calendars",
      "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    ],
  },

  googleCalendar: {
    name: "Google Calendar API",
    description: "Access and manage Google Calendar events",
    authUrl: "https://accounts.google.com/o/oauth2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    flow: "pkce",
    requiresClientSecret: false,
    documentation: "https://developers.google.com/calendar/api/guides/auth",
    testEndpoints: [
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    ],
  },

  googleGmail: {
    name: "Gmail API",
    description: "Access and manage Gmail messages",
    authUrl: "https://accounts.google.com/o/oauth2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
    ],
    flow: "pkce",
    requiresClientSecret: false,
    documentation: "https://developers.google.com/gmail/api/guides/auth",
    testEndpoints: ["https://gmail.googleapis.com/gmail/v1/users/me/messages"],
  },

  microsoft: {
    name: "Microsoft Graph",
    description: "Access Microsoft 365 services (Outlook, OneDrive, Teams)",
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: [
      "https://graph.microsoft.com/User.Read",
      "https://graph.microsoft.com/Mail.Read",
    ],
    flow: "pkce",
    requiresClientSecret: false,
    documentation: "https://docs.microsoft.com/en-us/graph/auth-v2-user",
    testEndpoints: [
      "https://graph.microsoft.com/v1.0/me",
      "https://graph.microsoft.com/v1.0/me/messages",
    ],
  },

  github: {
    name: "GitHub API",
    description: "Access GitHub repositories, issues, and user data",
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["user:email", "repo", "read:org"],
    flow: "authorization_code",
    requiresClientSecret: true,
    documentation:
      "https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps",
    testEndpoints: [
      "https://api.github.com/user",
      "https://api.github.com/user/repos",
    ],
  },

  slack: {
    name: "Slack API",
    description: "Access Slack workspaces, channels, and messages",
    authUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    scopes: ["users:read", "channels:read", "chat:write"],
    flow: "authorization_code",
    requiresClientSecret: true,
    documentation: "https://api.slack.com/authentication/oauth-v2",
    testEndpoints: [
      "https://slack.com/api/auth.test",
      "https://slack.com/api/conversations.list",
    ],
  },

  linkedin: {
    name: "LinkedIn API",
    description: "Access LinkedIn profile and company data",
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["r_liteprofile", "r_emailaddress", "w_member_social"],
    flow: "authorization_code",
    requiresClientSecret: true,
    documentation:
      "https://docs.microsoft.com/linkedin/shared/authentication/authorization-code-flow",
    testEndpoints: [
      "https://api.linkedin.com/v2/me",
      "https://api.linkedin.com/v2/people/(id={person-id})",
    ],
  },

  twitter: {
    name: "Twitter API v2",
    description: "Access Twitter tweets, users, and timeline data",
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scopes: ["tweet.read", "users.read", "follows.read"],
    flow: "pkce",
    requiresClientSecret: false,
    documentation:
      "https://developer.twitter.com/en/docs/authentication/oauth-2-0/authorization-code",
    testEndpoints: [
      "https://api.twitter.com/2/users/me",
      "https://api.twitter.com/2/tweets",
    ],
  },

  discord: {
    name: "Discord API",
    description: "Access Discord servers, channels, and user data",
    authUrl: "https://discord.com/api/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    scopes: ["identify", "email", "guilds"],
    flow: "authorization_code",
    requiresClientSecret: true,
    documentation: "https://discord.com/developers/docs/topics/oauth2",
    testEndpoints: [
      "https://discord.com/api/users/@me",
      "https://discord.com/api/users/@me/guilds",
    ],
  },

  dropbox: {
    name: "Dropbox API",
    description: "Access Dropbox files and folder structure",
    authUrl: "https://www.dropbox.com/oauth2/authorize",
    tokenUrl: "https://api.dropboxapi.com/oauth2/token",
    scopes: [], // Dropbox uses app permissions instead of scopes
    flow: "pkce",
    requiresClientSecret: false,
    documentation: "https://developers.dropbox.com/oauth-guide",
    testEndpoints: [
      "https://api.dropboxapi.com/2/users/get_current_account",
      "https://api.dropboxapi.com/2/files/list_folder",
    ],
  },

  spotify: {
    name: "Spotify Web API",
    description: "Access Spotify music data, playlists, and user library",
    authUrl: "https://accounts.spotify.com/authorize",
    tokenUrl: "https://accounts.spotify.com/api/token",
    scopes: ["user-read-private", "user-read-email", "playlist-read-private"],
    flow: "pkce",
    requiresClientSecret: false,
    documentation:
      "https://developer.spotify.com/documentation/general/guides/authorization/code-flow/",
    testEndpoints: [
      "https://api.spotify.com/v1/me",
      "https://api.spotify.com/v1/me/playlists",
    ],
    redirectUriNote:
      "Use http://127.0.0.1:3000/oauth_callback.html (underscore, NOT hyphen) - Spotify requires explicit IPv4/IPv6 addresses and specific callback format as of April 2025",
  },

  ibmSsoOidc: {
    name: "IBM SSO OIDC",
    description:
      "IBM Single Sign-On with OpenID Connect for enterprise authentication",
    authUrl: "https://login.ibm.com/oidc/endpoint/default/authorize",
    tokenUrl: "https://login.ibm.com/oidc/endpoint/default/token",
    scopes: ["openid", "profile", "email"],
    flow: "authorization_code",
    requiresClientSecret: true,
    documentation:
      "https://www.ibm.com/docs/en/sva/10.0.0?topic=authentication-openid-connect-oidc-overview",
    testEndpoints: [
      "https://login.ibm.com/oidc/endpoint/default/userinfo",
      "https://login.ibm.com/oidc/endpoint/default/introspect",
    ],
    redirectUriNote:
      "Configure your redirect URI in IBM SSO OIDC provider settings. The redirect URI must match exactly what you register in your IBM enterprise application.",
  },

  ibmSsoOidcCustom: {
    name: "IBM SSO OIDC (Custom Domain)",
    description: "IBM SSO OIDC with custom enterprise domain",
    authUrl: "https://your-domain.ibm.com/oidc/endpoint/default/authorize",
    tokenUrl: "https://your-domain.ibm.com/oidc/endpoint/default/token",
    scopes: ["openid", "profile", "email"],
    flow: "authorization_code",
    requiresClientSecret: true,
    documentation:
      "https://www.ibm.com/docs/en/sva/10.0.0?topic=authentication-openid-connect-oidc-overview",
    testEndpoints: [
      "https://your-domain.ibm.com/oidc/endpoint/default/userinfo",
    ],
    redirectUriNote:
      "Replace 'your-domain.ibm.com' with your actual IBM enterprise domain. Configure the redirect URI in your IBM SSO OIDC provider settings.",
  },

  ibmSsoOidcW3id: {
    name: "IBM SSO OIDC (w3id)",
    description: "IBM SSO OIDC using w3id.sso.ibm.com endpoint",
    authUrl: "https://w3id.sso.ibm.com/oidc/endpoint/default/authorize",
    tokenUrl: "https://w3id.sso.ibm.com/oidc/endpoint/default/token",
    scopes: ["openid", "profile", "email"],
    flow: "authorization_code",
    requiresClientSecret: true,
    documentation:
      "https://www.ibm.com/docs/en/sva/10.0.0?topic=authentication-openid-connect-oidc-overview",
    testEndpoints: ["https://w3id.sso.ibm.com/oidc/endpoint/default/userinfo"],
    redirectUriNote:
      "Configure your redirect URI in IBM w3id SSO provider settings. This endpoint is commonly used for internal IBM applications.",
  },
};

// Helper function to apply template to OAuth2 configuration
export function applyOAuth2Template(
  templateKey: string,
  clientId: string,
  clientSecret?: string
) {
  const template = OAUTH2_TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`OAuth2 template '${templateKey}' not found`);
  }

  // Spotify requires explicit IP addresses (not localhost) as of April 2025
  // and uses oauth_callback.html (underscore) instead of oauth-callback.html (hyphen)
  let redirectUri = "http://localhost:3000/oauth-callback.html";
  if (templateKey === "spotify") {
    redirectUri = "http://127.0.0.1:3000/oauth_callback.html";
  }

  return {
    authUrl: template.authUrl,
    tokenUrl: template.tokenUrl,
    clientId,
    clientSecret: template.requiresClientSecret ? clientSecret : undefined,
    scopes: template.scopes,
    flow: template.flow,
    redirectUri,
    usePKCE: template.flow === "pkce",
  };
}

// Helper function to get all template names for UI
export function getOAuth2TemplateNames(): Array<{
  key: string;
  name: string;
  description: string;
}> {
  return Object.entries(OAUTH2_TEMPLATES).map(([key, template]) => ({
    key,
    name: template.name,
    description: template.description,
  }));
}
