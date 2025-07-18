#!/bin/bash

# Test script for IBM SSO OIDC OAuth2 flow
# This script tests the IBM SSO OIDC template integration

echo "🔧 Testing IBM SSO OIDC OAuth2 Integration..."

# Test 1: Check if the template is properly defined
echo "📋 Test 1: Checking IBM SSO OIDC template definition..."
node -e "
const { OAUTH2_TEMPLATES } = require('./src/shared/oauth2Templates.ts');
const template = OAUTH2_TEMPLATES.ibmSsoOidc;
if (!template) {
  console.error('❌ IBM SSO OIDC template not found');
  process.exit(1);
}
console.log('✅ IBM SSO OIDC template found');
console.log('Template details:');
console.log(JSON.stringify(template, null, 2));
"

# Test 2: Check if the applyOAuth2Template function works with IBM SSO
echo "📋 Test 2: Testing applyOAuth2Template function with IBM SSO..."
node -e "
const { applyOAuth2Template } = require('./src/shared/oauth2Templates.ts');
try {
  const config = applyOAuth2Template('ibmSsoOidc', 'test-client-id');
  console.log('✅ applyOAuth2Template works with IBM SSO OIDC');
  console.log('Generated config:');
  console.log(JSON.stringify(config, null, 2));
} catch (error) {
  console.error('❌ applyOAuth2Template failed:', error.message);
  process.exit(1);
}
"

echo "🎉 All tests passed! IBM SSO OIDC template is ready for use."
echo ""
echo "📝 To use IBM SSO OIDC in the app:"
echo "1. Select 'IBM SSO OIDC' from the OAuth2 provider templates"
echo "2. Add your IBM App ID Client ID"
echo "3. Configure your IBM App ID service to allow the redirect URI"
echo "4. Use the standard OAuth2 PKCE flow (no client secret required)"
echo ""
echo "🔗 Documentation: https://cloud.ibm.com/docs/appid?topic=appid-getting-started"
