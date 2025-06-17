# Testing Guide: API-to-MCP Server Conversion

This guide will walk you through testing the API-to-MCP server functionality using a local test API.

## Step 1: Start the Test API Server

1. **Install dependencies for the test server:**

   ```bash
   cd /Users/kirtijha/langgraph-mcp-client
   npm install --prefix . express cors nodemon
   ```

2. **Start the test API server:**

   ```bash
   node test-api-server.js
   ```

   You should see output like:

   ```
   🚀 Test API Server running at http://localhost:3001
   📋 OpenAPI spec available at http://localhost:3001/openapi.json
   🔑 API Key for testing: test-api-key-123
   ```

3. **Verify the API is working:**

   ```bash
   # Test health endpoint (no auth required)
   curl http://localhost:3001/health

   # Test authenticated endpoint
   curl -H "X-API-Key: test-api-key-123" http://localhost:3001/api/users
   ```

## Step 2: Test the API in MCP Studio

### Method 1: Import from OpenAPI Spec (Recommended)

1. **Open MCP Studio** and navigate to the "API Servers" tab
2. **Click "Create New API Server"**
3. **Go to the "Import OpenAPI" tab**
4. **Paste this URL:** `http://localhost:3001/openapi.json`
5. **Click "Import from URL"**

The system should automatically populate:

- **Name:** Test Task Management API
- **Base URL:** http://localhost:3001
- **Description:** A simple API for managing users and tasks
- **Endpoints:** All 8 endpoints with proper parameters and descriptions

### Method 2: Manual Configuration

If you prefer to configure manually:

1. **Basic Info Tab:**

   - **Name:** Test Task Management API
   - **Description:** A simple API for managing users and tasks
   - **Base URL:** http://localhost:3001

2. **Authentication Tab:**

   - **Type:** API Key
   - **Header Name:** X-API-Key
   - **API Key:** test-api-key-123

3. **Endpoints Tab:** Add these endpoints manually:

   | Method | Path                   | Tool Name      | Description           |
   | ------ | ---------------------- | -------------- | --------------------- |
   | GET    | /health                | health_check   | Check API health      |
   | GET    | /api/users             | get_users      | Get all users         |
   | GET    | /api/users/{id}        | get_user_by_id | Get user by ID        |
   | POST   | /api/users             | create_user    | Create new user       |
   | GET    | /api/tasks             | get_tasks      | Get all tasks         |
   | POST   | /api/tasks             | create_task    | Create new task       |
   | PUT    | /api/tasks/{id}        | update_task    | Update task           |
   | GET    | /api/analytics/summary | get_analytics  | Get analytics summary |

## Step 3: Test Individual Endpoints

In the "Testing" tab of the API Server Builder:

### Test 1: Health Check

- **Endpoint:** health_check
- **Parameters:** None
- **Expected Result:** Status 200 with health information

### Test 2: Get Users

- **Endpoint:** get_users
- **Parameters:**
  - `role`: "admin" (optional)
  - `limit`: 2 (optional)
- **Expected Result:** List of users with filtering applied

### Test 3: Create User

- **Endpoint:** create_user
- **Parameters:**
  ```json
  {
    "name": "Test User",
    "email": "test@example.com",
    "role": "user"
  }
  ```
- **Expected Result:** Status 201 with created user data

### Test 4: Get Tasks

- **Endpoint:** get_tasks
- **Parameters:**
  - `status`: "pending" (optional)
- **Expected Result:** List of tasks with status filtering

### Test 5: Analytics

- **Endpoint:** get_analytics
- **Parameters:** None
- **Expected Result:** Summary statistics

## Step 4: Generate and Start MCP Server

1. **Save the API Server configuration**
2. **Click "Start Server"** in the API Server Manager
3. **Verify the server status** shows as "Running"
4. **Check the generated files** in the `generated-servers/[server-id]/` directory

## Step 5: Test the Generated MCP Server

The generated MCP server will be available as a standard MCP server that can be used with any MCP client. The server exposes all your API endpoints as MCP tools.

### Expected Generated Tools:

- `health_check` - Check API health
- `get_users` - Retrieve users with optional filtering
- `get_user_by_id` - Get specific user by ID
- `create_user` - Create new user
- `get_tasks` - Retrieve tasks with optional filtering
- `create_task` - Create new task
- `update_task` - Update existing task
- `get_analytics` - Get analytics summary

## Troubleshooting

### Common Issues:

1. **"Connection refused" errors:**

   - Make sure the test API server is running on port 3001
   - Check if another process is using the port

2. **Authentication errors:**

   - Verify the API key is set correctly: `test-api-key-123`
   - Check the header name is `X-API-Key`

3. **Import fails:**

   - Ensure the OpenAPI spec URL is accessible: `http://localhost:3001/openapi.json`
   - Try copying the spec content and pasting it directly

4. **Server won't start:**
   - Check the application logs for errors
   - Verify the generated server files exist
   - Ensure Node.js and required dependencies are installed

### Debug Commands:

```bash
# Check if test API is running
curl http://localhost:3001/health

# Verify authentication
curl -H "X-API-Key: test-api-key-123" http://localhost:3001/api/users

# Check OpenAPI spec
curl http://localhost:3001/openapi.json

# Test POST endpoint
curl -X POST -H "X-API-Key: test-api-key-123" -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}' \
  http://localhost:3001/api/users
```

## Expected Workflow:

1. ✅ Test API server starts and responds to requests
2. ✅ MCP Studio imports API configuration (manual or OpenAPI)
3. ✅ Individual endpoints can be tested successfully
4. ✅ MCP server generation completes without errors
5. ✅ Generated MCP server starts and runs
6. ✅ MCP tools are available and functional
7. ✅ API calls through MCP tools work correctly

This comprehensive test will validate the entire API-to-MCP conversion pipeline!
