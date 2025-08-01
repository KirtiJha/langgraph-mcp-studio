# Test API Server for MCP Studio

This is a test API server that provides MongoDB-based endpoints for testing MCP Studio functionality. The server runs on port 3001 and provides comprehensive CRUD operations for users, chats, messages, and feedbacks collections.

## Setup

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)

### Installation

1. Navigate to the server directory:

```bash
cd test-api-server
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

```bash
cp .env.example .env
```

Edit the `.env` file with your MongoDB connection details:

```
MONGODB_URI=mongodb://localhost:27017
DB_NAME=mcp_test_db
PORT=3001
NODE_ENV=development
```

For MongoDB Atlas:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
```

4. Start the server:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## API Endpoints

### Health Check

- `GET /api/health` - Server and database health status
- `GET /api/health/db-stats` - Database and collection statistics

### Users

- `GET /api/users` - Get all users (paginated)
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/email/:email` - Get user by email
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Chats

- `GET /api/chats` - Get all chats (paginated)
- `GET /api/chats/:id` - Get chat by ID
- `GET /api/chats/user/:userId` - Get chats by user ID
- `GET /api/chats/:id/permissions` - Get chat with permission check
- `POST /api/chats` - Create new chat
- `PUT /api/chats/:id/title` - Update chat title
- `POST /api/chats/:id/share` - Share chat with users
- `DELETE /api/chats/:id` - Delete chat and related data

### Messages

- `GET /api/messages` - Get all messages (paginated)
- `GET /api/messages/:id` - Get message by ID
- `GET /api/messages/chat/:chatId` - Get messages by chat ID
- `POST /api/messages` - Create single message
- `POST /api/messages/batch` - Create multiple messages
- `PUT /api/messages/:id` - Update message
- `DELETE /api/messages/:id` - Delete message
- `DELETE /api/messages/chat/:chatId` - Delete all messages for a chat

### Feedbacks

- `GET /api/feedbacks` - Get all feedbacks (paginated)
- `GET /api/feedbacks/:id` - Get feedback by ID
- `GET /api/feedbacks/chat/:chatId` - Get feedbacks by chat ID
- `GET /api/feedbacks/user/:userId` - Get user feedback history
- `POST /api/feedbacks/vote` - Vote on a message (create/update feedback)
- `PUT /api/feedbacks/:id` - Update feedback
- `PUT /api/feedbacks/:id/jira` - Update Jira issue in feedback
- `DELETE /api/feedbacks/:id` - Delete feedback
- `DELETE /api/feedbacks/chat/:chatId` - Delete all feedbacks for a chat

## Data Models

### User

```json
{
  "_id": "ObjectId",
  "email": "string",
  "createdAt": "Date"
}
```

### Chat

```json
{
  "_id": "ObjectId",
  "id": "string",
  "title": "string",
  "userId": "ObjectId",
  "createdAt": "Date",
  "lastModifiedAt": "Date",
  "visibility": "private|shared",
  "sharedWith": [
    {
      "userId": "string",
      "name": "string",
      "email": "string",
      "addedAt": "Date"
    }
  ]
}
```

### Message

```json
{
  "_id": "ObjectId",
  "chatId": "string",
  "content": "string",
  "role": "user|assistant|system",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Feedback

```json
{
  "_id": "ObjectId",
  "chatId": "string",
  "messageId": "string",
  "userId": "ObjectId",
  "comments": "string",
  "rating": "number",
  "isUpvoted": "boolean",
  "hasJiraIssue": "boolean",
  "jiraIssue": {
    "issueKey": "string",
    "issueId": "string",
    "issueUrl": "string",
    "summary": "string",
    "description": "string",
    "status": "string",
    "assignee": "string",
    "priority": "string",
    "labels": ["string"],
    "attachments": ["string"],
    "createdDate": "Date"
  },
  "createdAt": "Date",
  "lastModifiedAt": "Date"
}
```

## Query Parameters

### Pagination

Most GET endpoints support pagination:

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

### Filtering (User Feedbacks)

- `rating` - Filter by rating
- `isUpvoted` - Filter by upvote status (true/false)
- `hasJiraIssue` - Filter by Jira issue presence (true/false)
- `sortBy` - Sort field
- `sortOrder` - Sort order (asc/desc)

### Permission Check (Chats)

- `userId` - User ID for permission check
- `userEmail` - User email for permission check

## Testing the API

You can test the API using curl, Postman, or any HTTP client:

```bash
# Health check
curl http://localhost:3001/api/health

# Create a user
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Get all users
curl http://localhost:3001/api/users

# Create a chat
curl -X POST http://localhost:3001/api/chats \
  -H "Content-Type: application/json" \
  -d '{"id": "chat123", "userId": "USER_ID", "title": "Test Chat"}'
```

## Converting to MCP Server

This API server is designed to be easily convertible to an MCP (Model Context Protocol) server. Each endpoint can be mapped to MCP tools, and the MongoDB operations can be exposed as MCP resources.

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

Common HTTP status codes:

- 200: Success
- 201: Created
- 400: Bad Request
- 404: Not Found
- 409: Conflict
- 500: Internal Server Error

## Development

The server includes:

- Express.js framework
- MongoDB driver
- CORS support
- Security headers (Helmet)
- Request logging (Morgan)
- Environment configuration
- Graceful shutdown handling
- Comprehensive error handling
