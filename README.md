# MCP Studio

## 🌟 Enterprise-Grade Model Context Protocol Development Platform

**The professional solution for building, deploying, and managing Model Context Protocol (MCP) servers** - Enterprise features include model selection, Postman collection import, visual code editing, and universal config export.

A modern, professional desktop application for managing and interacting with Model Context Protocol (MCP) servers. Built with Electron, React, TypeScript, and enhanced with beautiful Tailwind CSS styling.

**🌟 Key Enterprise Features** - Model selection for AI routing, Postman collection import, visual code editor with export capabilities, and universal configuration support for Claude Desktop, Copilot, and custom MCP clients.

![MCP Studio](https://via.placeholder.com/800x400/1e293b/f1f5f9?text=MCP+Studio)

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
git clone <repository-url>
cd langgraph-mcp-client
npm install
```

### Development Mode 🔧

For active development with hot reload:

```bash
npm run dev
```

**Features:**

- ✅ Hot reload for UI changes
- ✅ DevTools open by default
- ✅ Debug logging enabled
- ✅ Fast development workflow
- ✅ Source maps for debugging

### Production Mode 🚀

For testing the production build:

```bash
# Build the application first
npm run build

# Then start in production mode
npm start
```

**Features:**

- ✅ Optimized bundle size
- ✅ Better performance
- ✅ Production-ready
- ✅ Suitable for distribution

### Additional Commands

```bash
# Build commands
npm run build           # Build both main and renderer
npm run build:main      # Build only main process
npm run build:renderer  # Build only renderer

# Distribution commands
npm run dist           # Build and create distributable for current platform
npm run dist:mac       # Build and create macOS app
npm run dist:win       # Build and create Windows installer
```

## 📱 How to Access the Application

### Important: Login Required

After starting the application with `npm run dev` or `npm start`, you'll see a **Landing Page** first.

**To access all features including the Public APIs tab:**

1. **Start the app**: Run `npm run dev` or `npm start`
2. **Landing Page**: You'll see the MCP Studio welcome screen
3. **Choose Authentication**: Click "Sign In" and select your preferred provider:
   - Google OAuth2
   - GitHub OAuth2
   - Microsoft OAuth2
   - IBM SSO
   - Enterprise SSO
4. **Main Interface**: After authentication, you'll access the full MCP Studio with all tabs

**Available Tabs After Login:**

- 🖥️ **Servers**: Manage your MCP servers
- 🔧 **Tools**: View available tools from connected servers
- 🌐 **Public APIs**: **⭐ NEW!** Discover, test, and convert public APIs to MCP servers
- 📦 **Resources**: Server resources and data
- 📄 **Prompts**: Manage prompt templates
- 💬 **Chat**: Interact with your AI agent using all available tools
- 🔘 **API Servers**: Build custom API servers
- 📊 **Logs**: View system logs and debugging info

## 🔐 Authentication

MCP Studio supports multiple authentication providers for secure access:

### Supported Providers

- **🔵 Google OAuth2**: Sign in with your Google account
- **⚫ GitHub OAuth2**: Sign in with your GitHub account  
- **🔷 Microsoft OAuth2**: Sign in with your Microsoft account
- **🔳 IBM SSO**: Sign in with your IBM enterprise account
- **🏢 Enterprise SSO**: Configure custom organization SSO

### Quick Setup

1. **Development**: For development, you can use the demo mode (no real credentials needed)
2. **Production**: Set up your OAuth2 credentials in the `.env` file:

```env
# Google OAuth2
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth2  
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Microsoft OAuth2
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret

# IBM SSO
IBM_CLIENT_ID=your_ibm_client_id
IBM_CLIENT_SECRET=your_ibm_client_secret
```

### Setup Guides

- 📖 **IBM SSO Setup**: See [IBM_SSO_AUTH_SETUP_GUIDE.md](IBM_SSO_AUTH_SETUP_GUIDE.md)
- 📖 **OAuth2 Setup**: See [OAUTH2_SETUP_GUIDE.md](OAUTH2_SETUP_GUIDE.md)

## 🌟 Enterprise Features

### 🎛️ Advanced Model Selection
- **Multiple AI Models**: Choose from 5+ enterprise AI models for each server
- **Model-Specific Routing**: Route different tools to different models based on capability
- **Performance Optimization**: Match computational requirements with optimal model selection
- **Enterprise Integration**: Support for IBM WatsonX, OpenAI, Anthropic, and custom models

### 📦 Postman Collection Import
- **V2.1 Support**: Full Postman Collection v2.1 specification support
- **Automatic Conversion**: Transform Postman collections into MCP servers instantly
- **Environment Variables**: Import and map Postman environment variables
- **Request Validation**: Comprehensive validation of imported requests and schemas

### 👨‍💻 Visual Code Editor
- **Syntax Highlighting**: Professional TypeScript code editor with full IntelliSense
- **Real-time Preview**: Live preview of generated MCP server code
- **Export Capabilities**: One-click export to multiple formats and platforms
- **Custom Modifications**: Edit and customize generated server code directly

### 🔄 Universal Config Export
- **Claude Desktop**: Export configurations for Claude Desktop integration
- **GitHub Copilot**: Generate Copilot-compatible server configurations
- **Custom MCP Clients**: Universal JSON export for any MCP-compatible client
- **Deployment Ready**: Production-ready configurations with environment setup

## 🚀 Key Features

### 🌐 Public API Discovery & Conversion

**The flagship feature that sets MCP Studio apart** - Transform any public API into a powerful MCP server tool for your AI assistant.

**🔍 Discover APIs**
- Browse **1000+ public APIs** from multiple sources (APIs.guru, PublicAPIs.org)
- **Smart search & filtering** by category, authentication, pricing model
- **Real-time caching** for fast browsing experience
- **Detailed API information** with endpoints, documentation, and examples

**🧪 Test APIs Interactively**
- **Live API testing** directly within the application
- **Parameter validation** with type-specific input controls
- **Authentication support** for API keys, OAuth, and other methods
- **Response visualization** with syntax highlighting and error handling
- **CORS bypass** for seamless testing in desktop environment

**⚡ One-Click Conversion to MCP**
- **Automatic MCP server generation** from OpenAPI specifications
- **Tool creation** for each API endpoint with proper schemas
- **Type-safe code generation** in TypeScript
- **Instant integration** - converted APIs appear immediately in Tools tab
- **Production-ready servers** that can be started, stopped, and managed

**🤖 AI Integration**
- **Seamless tool usage** in Chat interface with AI assistant
- **Parameter auto-completion** based on API specifications
- **Real-time status updates** showing server connection status
- **Error handling** with user-friendly messages

**Workflow Example:**
1. **Discover** → Browse APIs like "Weather API" or "Language Translation"  
2. **Test** → Try endpoints with live data to ensure they work
3. **Convert** → One-click conversion to MCP server with automatic tools
4. **Use** → Ask your AI "What's the weather in Paris?" and it uses the API automatically

- **API Explorer**: Browse and search thousands of public APIs from popular directories
### 🛠️ Enterprise MCP Server Management

- **Advanced Configuration**: Tabbed modal interface with model selection for enterprise AI routing
- **Universal Export**: Export server configurations for Claude Desktop, GitHub Copilot, and custom MCP clients
- **Postman Integration**: Import Postman Collection v2.1 files and convert to MCP servers automatically
- **Visual Code Editor**: Built-in TypeScript editor with syntax highlighting and export capabilities
- **Real-time Status**: Live server connection monitoring with beautiful loading states
- **Protocol Support**: Supports both stdio and SSE (Server-Sent Events) transports
- **Enterprise Security**: Environment variable management and secure credential storage

### 🤖 Enterprise AI Assistant Integration

- **Multi-Model Support**: Choose from 5+ AI models (IBM WatsonX, OpenAI, Anthropic, etc.) for each server
- **LangGraph Integration**: Powered by LangGraph React agents with enterprise-grade AI routing
- **Dynamic Tool Usage**: AI automatically uses converted API tools to answer questions
- **Model-Specific Routing**: Route different tasks to optimal AI models based on complexity
- **Enhanced Tool Execution**: Real-time status indicators during tool execution with detailed results
- **Tool Schema Validation**: Comprehensive argument validation with type information
- **Multi-Tool Orchestration**: AI can combine multiple API tools to complete complex enterprise tasks
- **Natural Language**: Ask questions like "What's the weather?" and AI uses appropriate weather API

### 🛠️ Enterprise Developer Tools & Code Export

- **Visual Code Editor**: Professional TypeScript editor with syntax highlighting and IntelliSense
- **Universal Export**: Export server configurations for Claude Desktop, GitHub Copilot, and any MCP client
- **Postman Collection Import**: Full support for Postman Collection v2.1 with automatic MCP conversion
- **Real-time Logs Console**: Built-in logging system capturing all system events and API calls
- **Live Log Streaming**: Real-time updates with filtering and auto-scroll functionality
- **API Testing Sandbox**: Test any endpoint with parameter validation and response visualization
- **Code Generation**: Generate production-ready TypeScript MCP servers from API specs
- **Error Diagnostics**: Detailed error messages with suggestions for CORS, network, and authentication issues
- **Development Mode**: Visual indicators and enhanced debugging when running in dev mode

## Recent Updates

### Version 2.0.0 - Enterprise Features & Model Selection (MAJOR RELEASE)

#### 🏢 Enterprise-Grade Capabilities

- **🎛️ Advanced Model Selection**: Choose from 5+ enterprise AI models for each server with intelligent routing
- **📦 Postman Collection Import**: Full Postman Collection v2.1 support with automatic MCP server conversion  
- **👨‍💻 Visual Code Editor**: Professional TypeScript editor with syntax highlighting and real-time preview
- **🔄 Universal Config Export**: Export configurations for Claude Desktop, GitHub Copilot, and custom MCP clients
- **🚀 Model-Specific Routing**: Route different tools to different AI models based on computational requirements
- **🔒 Enterprise Security**: Enhanced environment variable management and secure credential storage

#### 🎨 Professional Development Experience

- **✨ Advanced Code Generation**: Enhanced TypeScript MCP server generation with enterprise-grade patterns
- **🔧 Visual Server Editor**: Built-in code editor with IntelliSense, syntax highlighting, and export capabilities  
- **📱 Universal Deployment**: One-click export to multiple platforms and MCP client configurations
- **🛠️ Postman Integration**: Seamless import and conversion of existing Postman collections to MCP servers
- **⚡ Performance Optimizations**: Model selection optimization and intelligent AI routing for enterprise workloads

### Version 1.3.0 - Public API Discovery & Conversion (MAJOR RELEASE)

#### � Revolutionary New Feature: Public API Integration

- **🔍 API Discovery Engine**: Browse and search 1000+ public APIs from multiple curated sources
- **🧪 Interactive API Testing**: Test any API endpoint directly within the application with live validation
- **⚡ One-Click MCP Conversion**: Transform any public API into a fully functional MCP server with automatic tool generation
- **🚀 AI Integration**: Converted APIs become immediately available as tools for the AI assistant
- **📊 Virtual Scrolling**: Optimized performance for browsing large API catalogs
- **🔒 Authentication Support**: Built-in support for API keys, OAuth, and other authentication methods
- **🎯 Smart Filtering**: Filter APIs by category, pricing model, authentication type, and more
- **💾 Local Caching**: Fast browsing experience with intelligent caching and fallback handling

#### 🎨 Enhanced User Experience

- **✨ Beautiful Loading States**: Modern animated spinners and progress indicators throughout the app
- **🔄 Real-time Status Updates**: Live server connection status with automatic UI synchronization
- **🎛️ Advanced Parameter Controls**: Type-specific input controls with validation for API testing
- **📱 Responsive Design**: Improved layout and navigation for better desktop experience
- **🚦 Error Handling**: User-friendly error messages with actionable suggestions for common issues

#### 🔧 Technical Improvements

- **🏗️ Robust Code Generation**: Enhanced TypeScript MCP server generation with better error handling
- **🔌 Event-Driven Architecture**: Real-time status updates using IPC events between main and renderer processes
- **🛠️ Improved Server Management**: Better integration between API servers and MCP server management
- **📝 Enhanced Logging**: Comprehensive debugging and monitoring capabilities
- **⚡ Performance Optimizations**: Virtual scrolling, debounced search, and optimized rendering

### Version 1.1.0 - UI/UX Redesign & Enhanced Logging

#### Major Improvements

- **Compact Modern Design**: Redesigned the entire interface with a more compact, SaaS-like appearance
- **Server Configuration Modal**: New tabbed modal interface for comprehensive server management
- **Real-time Logging System**: Built-in logging console with live updates and filtering
- **Enhanced Tool Execution**: Improved tool configuration with detailed argument validation
- **Better Scrolling**: Fixed scrolling issues across all components
- **Tool Count Fix**: Resolved issue where server cards showed "0 Tools" incorrectly

#### Technical Enhancements

- Added comprehensive logging service with IPC communication
- Implemented React context for log state management
- Enhanced tool execution with proper schema validation
- Improved server configuration with JSON export/import
- Better error handling and user feedback

---

## Screenshots

_Coming soon - Screenshots will be added after initial release_

## Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- IBM WatsonX AI API key for AI assistant functionality

### Development Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/KirtiJha/langgraph-mcp-client.git
   cd langgraph-mcp-client
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:

   ```env
   WATSONX_API_KEY=your_watsonx_api_key_here
   WATSONX_PROJECT_ID=your_watsonx_project_id_here
   ```

4. **Start the development server**

   ```bash
   # Start the full development environment
   npm run dev

   # Or start individual processes
   npm run dev:main      # Start main process only
   npm run dev:renderer  # Start renderer process only
   ```

### Building for Production

1. **Build the application**

   ```bash
   npm run build
   ```

2. **Package for distribution**
   ```bash
   npm run dist
   ```

## Usage

### Adding an MCP Server

1. Click the "Add Server" button in the header
2. Fill in the server details:

   - **Name**: A friendly name for your server
   - **Command**: The executable command (e.g., `python`, `node`)
   - **Arguments**: Command line arguments
   - **Working Directory**: Optional directory to run from
   - **Environment Variables**: Key=value pairs for environment setup

3. Click "Add Server" to save the configuration

### Using the AI Assistant

1. Navigate to the Chat tab
2. Ensure you have at least one MCP server connected
3. Type your question or request
4. Watch as the AI executes tools and provides responses
5. Expand the "Tools Used" section to see detailed execution information

### Converting APIs to MCP Servers & Enterprise Configuration

**The fastest way to expand your AI assistant's capabilities with enterprise features:**

1. **Navigate** to the "Public APIs" tab
2. **Browse or Search** for APIs by category, name, or functionality  
3. **View Details** to see available endpoints and documentation
4. **Test Endpoints** to ensure the API works as expected
5. **Convert to MCP** with one click - generates a complete TypeScript MCP server
6. **Select AI Model** - Choose from 5+ enterprise AI models for optimal performance
7. **Configure & Export** - Use the visual code editor and export for multiple platforms
8. **Start the Server** directly from the API management interface
9. **Use in Chat** - the API endpoints are now available as tools for your AI assistant

**Enterprise Workflow Examples:**
- **Postman Import**: Import existing Postman collections → Convert to MCP → Deploy across multiple clients
- **Multi-Model Setup**: Weather API → Route to fast model, Complex analysis → Route to advanced model  
- **Universal Export**: Create server → Export for Claude Desktop → Also export for GitHub Copilot → Custom client integration

**Example API Workflows:**
- Find "OpenWeatherMap API" → Test weather endpoint → Convert to MCP → Ask AI "What's the weather in Tokyo?"
- Find "Language Translation API" → Test translation → Convert to MCP → Ask AI "Translate 'Hello' to French"

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# IBM WatsonX AI Configuration
WATSONX_API_KEY=your_watsonx_api_key_here
WATSONX_PROJECT_ID=your_watsonx_project_id_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com

# Application Settings
APP_NAME=MCP Studio
APP_VERSION=1.0.0

# Development Settings
NODE_ENV=development
```

### MCP Server Examples

Here are some example MCP server configurations:

#### File System Server

```json
{
  "name": "File System",
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-filesystem",
    "/path/to/directory"
  ],
  "env": {}
}
```

#### Web Search Server

```json
{
  "name": "Web Search",
  "command": "python",
  "args": ["-m", "mcp_server_web_search"],
  "env": {
    "SEARCH_API_KEY": "your_search_api_key"
  }
}
```

## Architecture

MCP Studio is built with:

- **Frontend**: React 19 with TypeScript
- **Styling**: Tailwind CSS v4 with custom design system
- **Animations**: Framer Motion for smooth interactions
- **Desktop**: Electron for cross-platform desktop app
- **AI Integration**: LangGraph React agents with IBM WatsonX AI
- **Build Tools**: Vite for fast development and building

### Project Structure

```
├── src/
│   ├── main/           # Electron main process
│   │   ├── agent/      # LangGraph agent integration
│   │   ├── mcp/        # MCP server management
│   │   └── services/   # Core services (API server, logging)
│   ├── renderer/       # React frontend
│   │   ├── components/ # UI components
│   │   ├── providers/  # React context providers
│   │   ├── services/   # Frontend services
│   │   ├── stores/     # State management
│   │   └── types/      # TypeScript definitions
│   └── shared/         # Shared types and utilities
├── generated-servers/  # Generated API to MCP server code
├── assets/            # Static assets
├── dist/              # Built application
└── build/             # Packaged distributables
```

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Run tests: `npm test`
5. Build the app: `npm run build`
6. Commit your changes: `git commit -m 'Add some feature'`
7. Push to the branch: `git push origin feature/your-feature-name`
8. Submit a pull request

### Code Style

- Use TypeScript for type safety
- Follow React best practices
- Use Tailwind CSS for styling
- Add proper error handling
- Write descriptive commit messages

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) for the MCP specification
- [LangGraph](https://langchain-ai.github.io/langgraph/) for agent orchestration
- [Electron](https://www.electronjs.org/) for the desktop framework
- [Tailwind CSS](https://tailwindcss.com/) for the beautiful styling
- [Framer Motion](https://www.framer.com/motion/) for smooth animations

## Support

- 🐛 Issues: [GitHub Issues](https://github.com/KirtiJha/langgraph-mcp-client/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/KirtiJha/langgraph-mcp-client/discussions)
- 📧 Contact: Feel free to reach out for questions or collaboration

## Roadmap

### 🎯 Completed Enterprise Features
- [x] **Advanced Model Selection** - Choose from 5+ AI models with intelligent routing for enterprise workloads
- [x] **Postman Collection Import** - Full v2.1 support with automatic MCP server conversion
- [x] **Visual Code Editor** - Professional TypeScript editor with syntax highlighting and export capabilities
- [x] **Universal Config Export** - Export for Claude Desktop, GitHub Copilot, and custom MCP clients
- [x] **Public API Discovery Engine** - Browse 1000+ APIs from multiple sources
- [x] **Interactive API Testing** - Test endpoints with parameter validation
- [x] **One-Click API to MCP Conversion** - Automatic server generation
- [x] **Virtual Scrolling** - Optimized performance for large datasets
- [x] **Real-time Status Updates** - Live server connection monitoring
- [x] **Enhanced Code Generation** - Production-ready TypeScript MCP servers
- [x] **Beautiful Loading States** - Modern UI with smooth animations

### 🚀 Upcoming Enterprise Features
- [ ] **Advanced Model Orchestration** - AI-powered model selection based on task complexity
- [ ] **Enterprise Team Collaboration** - Multi-user workspaces with role-based access control
- [ ] **Custom Model Integration** - Support for custom enterprise AI models and on-premise deployments
- [ ] **Advanced Postman Features** - Support for Postman environments, pre-request scripts, and test automation
- [ ] **Visual Workflow Builder** - Drag-and-drop interface for creating complex MCP server workflows
- [ ] **Enterprise Analytics** - Usage tracking, performance metrics, and cost optimization insights
- [ ] **Multi-language Support** - Support for Python, JavaScript, and Go MCP server generation
- [ ] **API Collections** - Save and organize favorite APIs for quick access
- [ ] **Custom API Import** - Import custom OpenAPI specs from URLs or files
- [ ] **Webhook Support** - Handle webhook endpoints in generated servers
- [ ] **API Monitoring** - Track usage, performance, and error rates
- [ ] **Cloud Sync** - Synchronize servers and configurations across devices
- [ ] **Plugin Marketplace** - Community-contributed API plugins and templates
- [ ] **Advanced Authentication** - OAuth2 flow handling and token management
- [ ] **API Versioning** - Support for multiple API versions and migration paths
- [ ] **Performance Analytics** - Detailed metrics and optimization suggestions

### 🔮 Future Enterprise Vision
- [ ] **AI-Powered API Discovery** - Intelligent API recommendations based on user intent and enterprise requirements
- [ ] **Natural Language API Query** - "Find me a weather API" → automatic discovery and setup
- [ ] **Enterprise Mobile Companion** - Mobile app for API management and monitoring
- [ ] **Advanced Security Features** - SSO integration, audit logs, compliance reporting, and data governance

---

Made with ❤️ by [Kirti Jha](https://github.com/KirtiJha)
