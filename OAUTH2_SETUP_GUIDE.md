# OAuth2 Setup Guide

This guide will help you set up OAuth2 authentication for Google, GitHub, and Microsoft in your MCP Studio desktop application.

## Overview

OAuth2 is the standard authorization protocol that allows users to sign in with their existing accounts (Google, GitHub, Microsoft) without sharing their passwords with your application.

## Prerequisites

1. Copy `.env.example` to `.env` in your project root
2. Set up OAuth2 applications with each provider
3. Add the client IDs and secrets to your `.env` file

## Setup Instructions

### 1. Google OAuth2

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Choose "Desktop application" as the application type
6. Set the redirect URI to: `http://localhost:3000/oauth-callback.html`
7. Copy the Client ID and Client Secret to your `.env` file

### 2. GitHub OAuth2

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - Application name: "MCP Studio"
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/oauth-callback.html`
4. Copy the Client ID and Client Secret to your `.env` file

### 3. Microsoft OAuth2 (Azure AD)

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Fill in:
   - Name: "MCP Studio"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: `http://localhost:3000/oauth-callback.html`
5. After creation, go to "Certificates & secrets" → "New client secret"
6. Copy the Application (client) ID and Client Secret to your `.env` file

## Important Notes

### Desktop Application Considerations

Since this is a desktop Electron application:
- The OAuth2 flow opens in a separate browser window
- The redirect URI points to a local callback handler
- Client secrets are stored locally (not exposed to web browsers)

### Security

- Never commit your `.env` file to version control
- Keep your client secrets secure
- Consider using environment-specific configurations for production

## Testing

After setup, you can test the authentication:

1. Start your application
2. Click "Sign In" 
3. Choose your preferred provider
4. You'll be redirected to the provider's login page
5. After successful login, you'll be redirected back to your application

## Troubleshooting

### "invalid_client" Error
- Check that your client ID is correct
- Verify the redirect URI matches exactly what you configured
- Ensure the OAuth2 application is enabled

### "redirect_uri_mismatch" Error
- The redirect URI in your OAuth2 application settings must match exactly
- For desktop apps, use `http://localhost:3000/oauth-callback.html`

### "access_denied" Error
- User canceled the authorization
- Check that your application has the correct permissions/scopes
