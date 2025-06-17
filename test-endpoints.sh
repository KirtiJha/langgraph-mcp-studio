#!/bin/bash

# Test script for the API endpoints
API_BASE="http://localhost:3001"
API_KEY="test-api-key-123"

echo "🧪 Testing API Endpoints"
echo "========================"

echo
echo "1. Testing Health Check..."
curl -s "$API_BASE/health" | jq '.'

echo
echo "2. Testing Get Users..."
curl -s -H "X-API-Key: $API_KEY" "$API_BASE/api/users" | jq '.'

echo
echo "3. Testing Get User by ID..."
curl -s -H "X-API-Key: $API_KEY" "$API_BASE/api/users/1" | jq '.'

echo
echo "4. Testing Create User..."
curl -s -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","role":"tester"}' \
  "$API_BASE/api/users" | jq '.'

echo
echo "5. Testing Get Tasks..."
curl -s -H "X-API-Key: $API_KEY" "$API_BASE/api/tasks" | jq '.'

echo
echo "6. Testing Create Task..."
curl -s -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"title":"Test Task","description":"Testing API conversion","priority":"high"}' \
  "$API_BASE/api/tasks" | jq '.'

echo
echo "7. Testing Analytics..."
curl -s -H "X-API-Key: $API_KEY" "$API_BASE/api/analytics/summary" | jq '.'

echo
echo "✅ All endpoint tests completed!"
