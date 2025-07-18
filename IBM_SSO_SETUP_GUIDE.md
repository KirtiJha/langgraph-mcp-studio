# IBM SSO OIDC Setup Guide for MCP Client

## Overview

This guide explains how to set up IBM SSO (Single Sign-On) with OpenID Connect (OIDC) authentication in your MCP Client to connect to IBM enterprise services and APIs. The MCP Client now supports three IBM SSO OIDC templates:

1. **IBM SSO OIDC** - Standard IBM SSO with OpenID Connect
2. **IBM SSO OIDC (Custom Domain)** - For custom enterprise domains
3. **IBM SSO OIDC (w3id)** - For w3id.sso.ibm.com endpoint

## Prerequisites

- IBM SSO OIDC registered application
- Access to IBM SSO administration console
- Enterprise IBM account with SSO enabled
- Basic understanding of OpenID Connect (OIDC) concepts

## Step 1: Register Application in IBM SSO

### 1.1 Access IBM SSO Admin Console

1. Go to your IBM SSO administration console
2. Navigate to **Applications** or **Relying Parties**
3. Click **Register New Application**

### 1.2 Create OIDC Application

1. Choose **OpenID Connect** as the protocol
2. Fill in the application details:
   - **Application Name**: `MCP-Client-App`
   - **Description**: `MCP Client for API integration`
   - **Application Type**: `Web Application`
   - **Grant Types**: `Authorization Code`

### 1.3 Configure Redirect URIs

Add the following redirect URIs:
- `http://localhost:3000/oauth-callback.html` (for development)
- `https://your-domain.com/oauth-callback.html` (for production)

**Important**: IBM SSO OIDC requires exact URI matches.

### 1.4 Get Client Credentials

After registration, you'll receive:
- **Client ID**: Used to identify your application
- **Client Secret**: Keep this secure (required for authorization_code flow)

## Step 2: Configure MCP Client

### 2.1 Choose IBM SSO OIDC Template

1. Open MCP Client
2. Navigate to **API Server Builder**
3. Select **Authentication Type**: OAuth2
4. Choose one of the IBM SSO OIDC templates:
   - **IBM SSO OIDC** - Standard IBM SSO endpoint
   - **IBM SSO OIDC (Custom Domain)** - For custom enterprise domains
   - **IBM SSO OIDC (w3id)** - For w3id.sso.ibm.com endpoint

### 2.2 Configure OIDC Settings

The template will auto-fill appropriate values:

**For IBM SSO OIDC:**
- **Authorization URL**: `https://login.ibm.com/oidc/endpoint/default/authorize`
- **Token URL**: `https://login.ibm.com/oidc/endpoint/default/token`

**For IBM SSO OIDC (w3id):**
- **Authorization URL**: `https://w3id.sso.ibm.com/oidc/endpoint/default/authorize`
- **Token URL**: `https://w3id.sso.ibm.com/oidc/endpoint/default/token`

**For IBM SSO OIDC (Custom Domain):**
- **Authorization URL**: `https://your-domain.ibm.com/oidc/endpoint/default/authorize`
- **Token URL**: `https://your-domain.ibm.com/oidc/endpoint/default/token`

### 2.3 Add Your Credentials

1. **Client ID**: Enter your IBM SSO OIDC application client ID
2. **Client Secret**: Enter your IBM SSO OIDC application client secret
3. **Scopes**: Default is `openid profile email` (modify as needed)

## Step 3: Test OIDC Authentication

### 3.1 Start OIDC Flow

1. Click **Start Authentication** button
2. You'll be redirected to IBM SSO login page
3. Enter your IBM enterprise credentials
4. Complete any additional authentication steps (MFA, etc.)
5. Authorize the application
6. You'll be redirected back to MCP Client

### 3.2 Verify OIDC Token

- Check that the **Authentication Status** shows green (authenticated)
- The ID token, access token, and refresh token should be stored
- Token expiry will be tracked automatically

## Step 4: Test API Access

### 4.1 Test OIDC Endpoints

Use these endpoints to verify your OIDC authentication:

**Standard IBM SSO OIDC:**
```
GET https://login.ibm.com/oidc/endpoint/default/userinfo
GET https://login.ibm.com/oidc/endpoint/default/introspect
```

**w3id IBM SSO OIDC:**
```
GET https://w3id.sso.ibm.com/oidc/endpoint/default/userinfo
```

**Custom Domain IBM SSO OIDC:**
```
GET https://your-domain.ibm.com/oidc/endpoint/default/userinfo
```
## Troubleshooting

### Common Issues

1. **Invalid Redirect URI**
   - Ensure the redirect URI in IBM SSO OIDC matches exactly
   - Check for trailing slashes or protocol mismatches
   - Verify the URI is registered in the IBM SSO application

2. **Authentication Fails**
   - Verify client ID and secret are correct
   - Check that the OIDC application is properly configured
   - Ensure the user has access to the IBM SSO system

3. **Token Expired**
   - The MCP Client will automatically refresh tokens using the refresh token
   - If refresh fails, re-authenticate manually

4. **Invalid Scope**
   - Ensure the requested scopes are configured in your IBM SSO application
   - Common scopes: `openid`, `profile`, `email`

5. **CORS Issues**
   - Ensure your IBM SSO application allows requests from your domain
   - Check that the IBM SSO OIDC endpoints support CORS

### Debug Tips

1. **Check Browser Console**: Look for OIDC related errors
2. **Verify Redirect**: Ensure the callback page loads correctly
3. **Test Manually**: Try accessing IBM SSO OIDC endpoints directly
4. **Check Token**: Verify the JWT token structure and claims
5. **Network Tab**: Monitor network requests for OIDC endpoints

## Advanced Configuration

### Custom Scopes

You can modify the scopes based on your IBM SSO configuration:

```javascript
// Common IBM SSO OIDC scopes
"openid"                    // Required for OIDC
"profile"                   // User profile information
"email"                     // User email address
"offline_access"            // Refresh token support
```

### Custom Endpoints

If you're using a custom IBM SSO domain, update the endpoints:

```javascript
// Replace with your actual domain
"https://your-company.ibm.com/oidc/endpoint/default/authorize"
"https://your-company.ibm.com/oidc/endpoint/default/token"
```

### Token Validation

IBM SSO OIDC returns JWT tokens. You can validate them using:

```javascript
// Example JWT structure
{
  "iss": "https://login.ibm.com/oidc/endpoint/default",
  "sub": "user-unique-id",
  "aud": "your-client-id",
  "exp": 1234567890,
  "iat": 1234567890,
  "email": "user@company.com",
  "name": "User Name"
}
```

## Security Best Practices

1. **Store Secrets Securely**: Never commit client secrets to version control
2. **Use HTTPS**: Always use HTTPS for redirect URIs in production
3. **Validate Tokens**: Verify JWT signatures and claims
4. **Minimal Scopes**: Only request necessary OIDC scopes
5. **Token Rotation**: Refresh tokens regularly
6. **Monitor Usage**: Track authentication attempts and token usage

## Resources

- [IBM SSO OIDC Documentation](https://www.ibm.com/docs/en/sva/10.0.0?topic=authentication-openid-connect-oidc-overview)
- [OpenID Connect Specification](https://openid.net/connect/)
- [JWT Token Reference](https://jwt.io/)
- [IBM Security Access Manager](https://www.ibm.com/products/security-access-manager)

## Support

If you encounter issues:

1. Check the **Logs Console** in MCP Client for detailed error messages
2. Verify your IBM SSO OIDC configuration
3. Test authentication manually using curl or Postman
4. Contact your IBM SSO administrator
5. Review IBM SSO service status

---

**Note**: This guide assumes you have access to IBM SSO administration console. If you're using corporate IBM SSO, you may need to work with your IT administrator to register applications and configure OIDC settings.
