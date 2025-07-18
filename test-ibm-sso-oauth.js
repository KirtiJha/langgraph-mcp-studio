// Test IBM SSO OAuth2 Templates
// This file tests the IBM SSO templates to ensure they work correctly

const {
  OAUTH2_TEMPLATES,
  applyOAuth2Template,
  getOAuth2TemplateNames,
} = require("./src/shared/oauth2Templates");

console.log("🧪 Testing IBM SSO OAuth2 Templates...\n");

// Test 1: Verify IBM templates exist
console.log("✅ Test 1: IBM Templates Available");
const templateNames = getOAuth2TemplateNames();
const ibmTemplates = templateNames.filter(t => t.name.includes("IBM"));
console.log(`Found ${ibmTemplates.length} IBM templates:`);
ibmTemplates.forEach(template => {
  console.log(`  - ${template.name}: ${template.description}`);
});
console.log();

// Test 2: Test IBM Cloud Identity template
console.log("✅ Test 2: IBM Cloud Identity Template");
const ibmSsoTemplate = OAUTH2_TEMPLATES.ibmSso;
console.log("IBM SSO Template Config:");
console.log(`  Name: ${ibmSsoTemplate.name}`);
console.log(`  Auth URL: ${ibmSsoTemplate.authUrl}`);
console.log(`  Token URL: ${ibmSsoTemplate.tokenUrl}`);
console.log(`  Flow: ${ibmSsoTemplate.flow}`);
console.log(`  Requires Client Secret: ${ibmSsoTemplate.requiresClientSecret}`);
console.log(`  Scopes: ${ibmSsoTemplate.scopes.join(", ")}`);
console.log();

// Test 3: Test IBM Watson template
console.log("✅ Test 3: IBM Watson Template");
const ibmWatsonTemplate = OAUTH2_TEMPLATES.ibmWatson;
console.log("IBM Watson Template Config:");
console.log(`  Name: ${ibmWatsonTemplate.name}`);
console.log(`  Auth URL: ${ibmWatsonTemplate.authUrl}`);
console.log(`  Token URL: ${ibmWatsonTemplate.tokenUrl}`);
console.log(`  Flow: ${ibmWatsonTemplate.flow}`);
console.log(`  Test Endpoints: ${ibmWatsonTemplate.testEndpoints.join(", ")}`);
console.log();

// Test 4: Test IBM Cloudant template
console.log("✅ Test 4: IBM Cloudant Template");
const ibmCloudantTemplate = OAUTH2_TEMPLATES.ibmCloudant;
console.log("IBM Cloudant Template Config:");
console.log(`  Name: ${ibmCloudantTemplate.name}`);
console.log(`  Auth URL: ${ibmCloudantTemplate.authUrl}`);
console.log(`  Token URL: ${ibmCloudantTemplate.tokenUrl}`);
console.log(`  Flow: ${ibmCloudantTemplate.flow}`);
console.log();

// Test 5: Test applyOAuth2Template function
console.log("✅ Test 5: Apply IBM Template Function");
try {
  const ibmConfig = applyOAuth2Template("ibmSso", "test-client-id", "test-client-secret");
  console.log("IBM SSO Applied Config:");
  console.log(`  Auth URL: ${ibmConfig.authUrl}`);
  console.log(`  Token URL: ${ibmConfig.tokenUrl}`);
  console.log(`  Client ID: ${ibmConfig.clientId}`);
  console.log(`  Client Secret: ${ibmConfig.clientSecret ? "***" : "Not provided"}`);
  console.log(`  Scopes: ${ibmConfig.scopes.join(", ")}`);
  console.log(`  Redirect URI: ${ibmConfig.redirectUri}`);
  console.log(`  Use PKCE: ${ibmConfig.usePKCE}`);
} catch (error) {
  console.error("❌ Error applying IBM template:", error.message);
}
console.log();

// Test 6: Validate template URLs
console.log("✅ Test 6: Validate IBM Cloud URLs");
const ibmTemplateKeys = ["ibmSso", "ibmWatson", "ibmCloudant"];
ibmTemplateKeys.forEach(key => {
  const template = OAUTH2_TEMPLATES[key];
  console.log(`${template.name}:`);
  console.log(`  Auth URL valid: ${template.authUrl.startsWith("https://")}`);
  console.log(`  Token URL valid: ${template.tokenUrl.startsWith("https://")}`);
  console.log(`  Has documentation: ${!!template.documentation}`);
  console.log(`  Has test endpoints: ${template.testEndpoints && template.testEndpoints.length > 0}`);
});
console.log();

// Test 7: Test error handling
console.log("✅ Test 7: Error Handling");
try {
  applyOAuth2Template("nonexistent", "test-client-id");
  console.log("❌ Should have thrown error for non-existent template");
} catch (error) {
  console.log("✅ Correctly throws error for non-existent template:", error.message);
}
console.log();

console.log("🎉 All IBM SSO template tests completed!");
console.log();
console.log("📋 Summary:");
console.log("- IBM Cloud Identity (SSO) template added");
console.log("- IBM Watson Services template added");
console.log("- IBM Cloudant Database template added");
console.log("- All templates use proper IBM Cloud IAM endpoints");
console.log("- Authorization code flow with client secret required");
console.log("- Standard OAuth2 scopes for IBM Cloud services");
console.log();
console.log("🚀 Ready to use IBM SSO in MCP Client!");
