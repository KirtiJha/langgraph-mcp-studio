# Enhanced API to MCP Feature Testing Guide

This comprehensive guide will help you test all the new and enhanced API to MCP features, including private API discovery, auto-configuration, and advanced authentication methods.

## Prerequisites

1. **Install Dependencies**

   ```bash
   cd /Users/kirtijha/langgraph-mcp-client
   npm install
   ```

2. **Build the Application**

   ```bash
   npm run build
   ```

3. **Start in Development Mode**
   ```bash
   npm run dev
   ```

## Test Scenarios

### 1. Testing Basic Public API Import (Existing Feature - Enhanced)

#### Test with Real Public APIs

**Test 1: OpenAPI 3.0 API (JSONPlaceholder)**

```bash
# URL to test: https://jsonplaceholder.typicode.com
# OpenAPI spec: Not available (will test heuristic discovery)
```

1. Navigate to **Public APIs** tab
2. Search for "jsonplaceholder" or similar
3. Click **Convert to MCP** on any found API
4. Verify the conversion works

**Test 2: API with OpenAPI Spec (PetStore)**

```bash
# URL to test: https://petstore3.swagger.io/api/v3
# OpenAPI spec: https://petstore3.swagger.io/api/v3/openapi.json
```

1. Go to **API Servers** → **Create New API Server**
2. Go to **Import OpenAPI** tab
3. Paste: `https://petstore3.swagger.io/api/v3/openapi.json`
4. Click **Import from URL**
5. Verify endpoints are populated
6. Test authentication configuration
7. Save and verify MCP server creation

### 2. Testing Private API Discovery (New Feature)

#### Test with Local Test Server

**Start the Test Server:**

```bash
# In the project root
node test-api-server.js
```

**Test Discovery:**

1. Go to **API Servers** → **Create New API Server**
2. Navigate to **Discover API** tab (Tab 3)
3. Enter: `http://localhost:3001`
4. Click **Discover API**
5. Verify discovery results show:
   - API name and description
   - Base URL
   - Number of endpoints found
   - Authentication type detected
6. Click **Apply Configuration**
7. Verify server config is populated

#### Test with Private APIs Tab

1. Navigate to **Private APIs** tab (new tab in navigation)
2. Enter URL: `http://localhost:3001`
3. Click **Discover**
4. Verify the API appears in the private APIs grid
5. Click **Auto-Config** on the discovered API
6. Verify it creates a new MCP server

### 3. Testing Auto-Configuration (New Feature)

#### Test Auto-Config with Different API Types

**Test 1: REST API with OpenAPI**

1. Go to **API Servers** → **Create New API Server**
2. Navigate to **Auto-Config** tab (Tab 4)
3. Enter Base URL: `http://localhost:3001`
4. Click **Auto-Configure**
5. Verify suggested configuration includes:
   - Detected endpoints
   - Authentication method
   - Proper tool names and descriptions

**Test 2: Public API Auto-Config**

1. Use **Auto-Config** tab with: `https://api.github.com`
2. Verify it detects GitHub API structure
3. Check if authentication is properly detected

### 4. Testing Enhanced Authentication (Enhanced Feature)

#### Test All Authentication Types

**Test 1: API Key Authentication**

1. Create new API server
2. Go to **Authentication** tab (Tab 6)
3. Select **API Key**
4. Configure:
   - API Key: `test-api-key-123`
   - Header Name: `X-API-Key`
5. Test with local test server

**Test 2: Bearer Token**

1. Select **Bearer Token**
2. Enter a test token
3. Verify configuration

**Test 3: Basic Authentication**

1. Select **Basic Auth**
2. Enter username/password
3. Test configuration

**Test 4: OAuth 2.0 (New)**

1. Select **OAuth 2.0**
2. Configure Client ID/Secret
3. Verify the enhanced OAuth fields are available

**Test 5: AWS Signature (New)**

1. Select **AWS Signature**
2. Configure:
   - Access Key ID
   - Secret Access Key
   - Region
   - Service
3. Verify all fields are properly handled

**Test 6: Custom Authentication (New)**

1. Select **Custom**
2. Enter custom headers JSON:
   ```json
   {
     "Authorization": "Custom token",
     "X-Custom-Header": "value"
   }
   ```
3. Verify JSON parsing and validation

### 5. Testing Enhanced UI/UX

#### Test New Tab Navigation

1. Verify keyboard shortcuts work:
   - `Cmd+6`: Switch to Public APIs
   - `Cmd+7`: Switch to Private APIs
2. Test tab switching in API Server Builder:
   - Templates (0)
   - Basic Info (1)
   - Import OpenAPI (2)
   - Discover API (3) - NEW
   - Auto-Config (4) - NEW
   - Endpoints (5)
   - Authentication (6)
   - Advanced (7)
   - Monitoring (8)
   - Testing (9)

#### Test Private API Manager Interface

1. Navigate to **Private APIs** tab
2. Test discovery workflow
3. Verify grid layout with API cards
4. Test status indicators and authentication types
5. Test delete functionality
6. Test auto-configuration from cards

### 6. Testing Error Handling and Edge Cases

#### Test Error Scenarios

**Test 1: Invalid URLs**

1. Try discovery with invalid URL: `not-a-url`
2. Verify proper error message

**Test 2: Unreachable APIs**

1. Try discovery with: `http://localhost:9999`
2. Verify timeout handling

**Test 3: Invalid OpenAPI Specs**

1. Try importing invalid JSON/URL
2. Verify error handling

**Test 4: CORS Issues**

1. Try with APIs that have strict CORS
2. Verify fallback mechanisms

### 7. Testing Protocol Support (Enhanced)

#### Test REST APIs (Enhanced)

1. Use test server endpoints
2. Verify all HTTP methods work
3. Test parameter handling
4. Test response mapping

#### Test WebSocket Support (New)

- Note: WebSocket testing requires a WebSocket test server
- Create endpoint with method "WEBSOCKET"
- Verify code generation includes WebSocket handling

#### Test GraphQL Support (New)

- Note: GraphQL testing requires a GraphQL endpoint
- Try with: `https://api.github.com/graphql` (requires auth)
- Verify GraphQL query handling

### 8. Testing Generated MCP Servers

#### Verify Generated Code Quality

1. Create an API server using any method
2. Check the generated server code in `generated-servers/`
3. Verify the code includes:
   - Proper authentication handling
   - Error handling
   - Logging
   - Monitoring (if enabled)
   - Protocol-specific code

#### Test Generated Server Execution

1. Navigate to generated server directory
2. Install dependencies: `npm install`
3. Try running: `node server.js`
4. Verify server starts without errors

### 9. Integration Testing

#### Test Complete Workflow

1. **Discover** a private API
2. **Auto-configure** the server
3. **Customize** authentication and endpoints
4. **Generate** the MCP server
5. **Test** the generated server
6. **Connect** to MCP client
7. **Verify** tools are available

## Test APIs for Different Scenarios

### Public APIs (No Auth Required)

- JSONPlaceholder: `https://jsonplaceholder.typicode.com`
- HTTPBin: `https://httpbin.org`
- REST Countries: `https://restcountries.com`

### APIs with OpenAPI Specs

- Swagger PetStore: `https://petstore3.swagger.io/api/v3/openapi.json`
- OpenWeather: `https://api.openweathermap.org/data/2.5` (requires API key)

### GraphQL APIs

- GitHub GraphQL: `https://api.github.com/graphql` (requires auth)
- SpaceX GraphQL: `https://api.spacex.land/graphql`

### Local Test Server

```bash
# Start the test server
node test-api-server.js

# Test endpoints:
# GET /health (no auth)
# GET /api/users (API key required)
# POST /api/users (API key required)
# OpenAPI spec: http://localhost:3001/openapi.json
```

## Expected Results

### ✅ Success Criteria

1. **Discovery Works**: APIs are properly discovered and analyzed
2. **Auto-Config Works**: Configuration is intelligently generated
3. **Authentication**: All auth methods configure properly
4. **UI Responsive**: New tabs and interfaces work smoothly
5. **Code Generation**: Generated servers include new features
6. **Error Handling**: Graceful handling of edge cases
7. **Performance**: Discovery and configuration complete quickly
8. **Integration**: All features work together seamlessly

### 🚨 Issues to Watch For

1. **CORS Issues**: Browser CORS restrictions with private APIs
2. **Timeout Errors**: Long discovery times with complex APIs
3. **Memory Usage**: Large API specs causing performance issues
4. **Type Errors**: Inconsistent parameter type mapping
5. **Authentication**: Complex OAuth flows not handled properly

## Troubleshooting

### Common Issues

**Issue: Discovery Fails with CORS Error**

- Solution: Use Electron's CORS bypass or proxy
- Workaround: Test with local APIs first

**Issue: Auto-Config Creates Incorrect Types**

- Check: Parameter type mapping in conversion
- Verify: OpenAPI spec quality

**Issue: Generated Server Won't Start**

- Check: All required dependencies are installed
- Verify: Configuration is valid
- Look at: Generated code for syntax errors

**Issue: Private APIs Tab Not Visible**

- Verify: Navigation is properly updated in App.tsx
- Check: No TypeScript errors in console

## Automated Testing

### Run Basic Tests

```bash
# If test scripts exist
npm test

# Or run specific tests
npm run test:api
npm run test:discovery
```

### Manual Testing Checklist

- [ ] Public API import works
- [ ] Private API discovery works
- [ ] Auto-configuration works
- [ ] All authentication types configurable
- [ ] New tabs accessible and functional
- [ ] Keyboard shortcuts work
- [ ] Generated servers are valid
- [ ] Error handling is graceful
- [ ] Performance is acceptable
- [ ] Integration workflow complete

## Performance Testing

### Load Testing

1. Test with large OpenAPI specs (100+ endpoints)
2. Test discovery with slow-responding APIs
3. Test multiple concurrent discoveries
4. Monitor memory usage during operations

### Stress Testing

1. Import very large API specifications
2. Create many API servers simultaneously
3. Test with complex authentication configurations
4. Verify UI remains responsive

This comprehensive testing approach will help ensure all the enhanced API to MCP features work correctly and provide a great user experience.
