#!/bin/bash

# MCP Studio Product Page Launch Script

echo "🚀 Starting MCP Studio Product Page..."
echo "📱 This will open the product page in your default browser"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the product page server in the background
echo "🌐 Starting product page server..."
npm run serve:product-page &
SERVER_PID=$!

# Wait a moment for the server to start
sleep 2

# Get the URL
URL="http://localhost:8080"

# Open the URL in the default browser
echo "🔗 Opening $URL in your browser..."

# Cross-platform browser opening
if command -v open &> /dev/null; then
    # macOS
    open "$URL"
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open "$URL"
elif command -v start &> /dev/null; then
    # Windows
    start "$URL"
else
    echo "📋 Please manually open: $URL"
fi

echo ""
echo "✅ Product page is now running!"
echo "🔗 URL: $URL"
echo "🛑 Press Ctrl+C to stop the server"
echo ""

# Keep the script running until interrupted
trap "echo '🛑 Stopping server...'; kill $SERVER_PID 2>/dev/null; exit 0" INT TERM

# Wait for the server process
wait $SERVER_PID
