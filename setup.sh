#!/bin/bash

# MCP Desktop Client Development Setup Script

echo "🚀 Setting up MCP Desktop Client..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | sed 's/v//')
REQUIRED_VERSION="18.0.0"

if ! npx semver "$NODE_VERSION" -r ">=$REQUIRED_VERSION" &> /dev/null; then
    echo "❌ Node.js version $NODE_VERSION is not supported. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION is supported"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚙️  Creating .env file from template..."
    cp .env.example .env
    echo "📝 Please edit .env file with your IBM Watsonx credentials before running the app"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your IBM Watsonx credentials"
echo "2. Run 'npm run dev' to start the development server"
echo "3. The app will open automatically in Electron"
echo ""
echo "Available commands:"
echo "  npm run dev          - Start development server"
echo "  npm run build        - Build for production"
echo "  npm run dist:mac     - Create macOS installer"
echo "  npm run dist:win     - Create Windows installer"
