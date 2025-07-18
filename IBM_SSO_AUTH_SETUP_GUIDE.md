# IBM SSO Authentication Setup Guide

## Overview

This guide explains how to set up IBM SSO authentication in MCP Studio. IBM SSO allows users to authenticate using their IBM enterprise credentials through OAuth2/OpenID Connect.

## Prerequisites

- IBM SSO OIDC application registered in your IBM enterprise
- IBM enterprise account with SSO enabled
- Access to IBM SSO administration console

## Step 1: Register Application in IBM SSO

### 1.1 Access IBM SSO Admin Console
1. Go to your IBM SSO administration console
2. Navigate to **Applications** or **Relying Parties**
3. Click **Register New Application**

### 1.2 Create OIDC Application
1. Choose **OpenID Connect** as the protocol
2. Fill in the application details:
   - **Application Name**: `MCP-Studio-Client`
   - **Description**: `MCP Studio Client Application`
   - **Application Type**: `Web Application`
   - **Grant Types**: `Authorization Code`

### 1.3 Configure Redirect URIs
Add the redirect URI for your MCP Studio application:
- Development: `http://localhost:3000/oauth-callback.html`
- Production: `https://your-domain.com/oauth-callback.html`

### 1.4 Get Client Credentials
After registration, you'll receive:
- **Client ID**: Your application identifier
- **Client Secret**: Keep this secure and confidential

## Step 2: Configure MCP Studio Environment

### 2.1 Create/Update .env File
Create a `.env` file in your MCP Studio root directory with your IBM SSO credentials:

```env
# IBM SSO Configuration
IBM_CLIENT_ID=your_ibm_client_id_here
IBM_CLIENT_SECRET=your_ibm_client_secret_here

# Optional: Custom IBM SSO endpoints (defaults to w3id.sso.ibm.com)
IBM_AUTH_URL=https://w3id.sso.ibm.com/oidc/endpoint/default/authorize
IBM_TOKEN_URL=https://w3id.sso.ibm.com/oidc/endpoint/default/token
IBM_USERINFO_URL=https://w3id.sso.ibm.com/oidc/endpoint/default/userinfo
```

### 2.2 Alternative IBM SSO Endpoints
Depending on your IBM environment, you may need to use different endpoints:

**Standard IBM SSO:**
```env
IBM_AUTH_URL=https://login.ibm.com/oidc/endpoint/default/authorize
IBM_TOKEN_URL=https://login.ibm.com/oidc/endpoint/default/token
IBM_USERINFO_URL=https://login.ibm.com/oidc/endpoint/default/userinfo
```

**Custom Enterprise Domain:**
```env
IBM_AUTH_URL=https://your-domain.ibm.com/oidc/endpoint/default/authorize
IBM_TOKEN_URL=https://your-domain.ibm.com/oidc/endpoint/default/token
IBM_USERINFO_URL=https://your-domain.ibm.com/oidc/endpoint/default/userinfo
```

## Step 3: Test IBM SSO Authentication

### 3.1 Start MCP Studio
1. Ensure your `.env` file is configured
2. Start MCP Studio in development mode:
   ```bash
   npm run dev
   ```

### 3.2 Test Authentication
1. Open MCP Studio
2. Click the **Sign In** button
3. Select **IBM SSO** from the authentication options
4. You'll be redirected to IBM SSO login page
5. Enter your IBM enterprise credentials
6. Complete any additional authentication steps (MFA, etc.)
7. You'll be redirected back to MCP Studio

### 3.3 Verify Authentication
After successful authentication, you should see:
- Your IBM profile information in the top-right corner
- Access to MCP Studio features requiring authentication
- Your IBM SSO session will be maintained

## Step 4: Production Deployment

### 4.1 Update Redirect URIs
In your IBM SSO application configuration:
1. Add your production redirect URI
2. Update the callback URL to match your production domain

### 4.2 Environment Variables
Set the environment variables in your production environment:
```bash
export IBM_CLIENT_ID=your_production_client_id
export IBM_CLIENT_SECRET=your_production_client_secret
export IBM_AUTH_URL=https://your-production-sso-endpoint/authorize
export IBM_TOKEN_URL=https://your-production-sso-endpoint/token
export IBM_USERINFO_URL=https://your-production-sso-endpoint/userinfo
```

## Troubleshooting

### Common Issues

1. **"IBM SSO configuration not found"**
   - Ensure `IBM_CLIENT_ID` is set in your environment
   - Check that the `.env` file is in the correct location

2. **"Redirect URI mismatch"**
   - Verify the redirect URI in your IBM SSO application matches exactly
   - Check for trailing slashes or protocol mismatches

3. **Authentication timeout**
   - IBM SSO may have session timeout settings
   - Check your IBM SSO console for session configuration

4. **Missing user information**
   - Ensure your IBM SSO application has the correct scopes
   - Verify the userinfo endpoint is accessible

### Debug Mode
To enable debug logging for IBM SSO authentication:
```bash
export DEBUG=auth:ibm,oauth2:ibm
npm run dev
```

## Security Considerations

1. **Keep Client Secret Secure**: Never commit your IBM client secret to version control
2. **Use HTTPS**: Always use HTTPS in production environments
3. **Validate Redirect URIs**: Ensure redirect URIs are properly configured
4. **Token Storage**: Tokens are stored securely in the application
5. **Session Management**: IBM SSO sessions are managed according to your enterprise policies

## Additional Resources

- [IBM SSO Documentation](https://www.ibm.com/docs/en/security-identity-governance)
- [OpenID Connect Specification](https://openid.net/connect/)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)
