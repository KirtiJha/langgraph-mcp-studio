# MCP Studio

A modern, professional desktop application for managing and interacting with Model Context Protocol (MCP) servers. Built with Electron, React, TypeScript, and enhanced with beautiful Tailwind CSS styling.

![MCP Studio](https://via.placeholder.com/800x400/1e293b/f1f5f9?text=MCP+Studio)

## Features

### 🚀 Modern UI/UX

- **Compact Modern Design**: Professional SaaS-style interface with reduced font sizes and compact spacing
- **Dark Theme**: Beautiful dark interface with gradient accents and modern styling
- **Server Configuration Modal**: Rich tabbed interface for viewing and editing server configurations
- **Real-time Tool Execution**: Enhanced visual indicators showing which tools are being executed
- **Interactive Chat**: Rich chat interface with the AI assistant
- **Responsive Design**: Optimized for desktop use across Mac and Windows

### 🔧 MCP Server Management

- **Easy Server Setup**: Add MCP servers with a simple, intuitive form
- **Advanced Configuration**: Tabbed modal interface for server settings (Basic, Command, Environment, Context, JSON)
- **Connection Status**: Real-time server connection monitoring and status indicators
- **Server Configuration**: Support for environment variables, custom arguments, and working directories
- **Protocol Support**: Supports both stdio and SSE (Server-Sent Events) transports
- **Tool Count Display**: Live tool count display for each connected server

### 🤖 AI Assistant Integration

- **LangGraph Integration**: Powered by LangGraph React agents with IBM WatsonX AI
- **Enhanced Tool Execution**: Detailed tool configuration with argument validation and JSON preview
- **Tool Schema Validation**: Comprehensive tool argument display with type information and validation
- **Collapsible Tool Results**: Clean separation between AI responses and detailed tool execution data
- **Real-time Updates**: Live status indicators during processing and tool execution

### 🛠️ Developer Tools

- **Real-time Logs Console**: Built-in logging system capturing system events, errors, and debug information
- **Live Log Streaming**: Real-time log updates with filtering and auto-scroll functionality
- **Enhanced Tool Testing**: Execute tools manually with proper argument configuration and validation
- **Server Stats**: Monitor server performance and connection status
- **Keyboard Shortcuts**: Efficient navigation with hotkeys
- **Scrollable Interfaces**: Improved scrolling in all panels for better content navigation

## Recent Updates

### Version 1.2.0 - Enhanced Add Server Flow

#### 🎯 Major New Features

- **Tabbed Server Configuration**: New tabbed interface with Manual Setup, Import JSON, and Tool Configuration tabs
- **JSON Import Support**: Import standard MCP server configuration JSON (e.g., `mcpServers` format) with automatic field population
- **Auto-Tool Discovery**: Automatically discover available tools and their parameters when adding a server
- **Pre-configured Tool Parameters**: Configure default parameter values for tools during server setup
- **Enhanced Tool Execution**: Tool parameters are pre-filled from server configurations with visual indicators
- **Rich Error Handling**: Comprehensive error messages and user feedback throughout the flow
- **Modern UI Components**: Beautiful, responsive interface with improved accessibility

#### 🔧 Technical Enhancements

- **Type Safety**: Enhanced TypeScript interfaces for better type checking and IntelliSense
- **Component Architecture**: Completely refactored AddServerDialog and ToolExecution components
- **Parameter Pre-filling**: Server tool configurations automatically populate tool execution forms
- **Visual Indicators**: Clear indication of which parameters are pre-configured from server settings
- **Robust Validation**: JSON parsing validation and comprehensive error handling

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
   git clone https://github.com/KirtiJha/langgraph-mcp-studio.git
   cd langgraph-mcp-studio
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
   npm run dev
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
│   ├── renderer/       # React frontend
│   │   ├── components/ # UI components
│   │   ├── styles/     # Tailwind CSS
│   │   └── types/      # TypeScript definitions
│   └── shared/         # Shared types and utilities
├── assets/             # Static assets
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

- 🐛 Issues: [GitHub Issues](https://github.com/KirtiJha/langgraph-mcp-studio/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/KirtiJha/langgraph-mcp-studio/discussions)
- 📧 Contact: Feel free to reach out for questions or collaboration

## Roadmap

- [ ] Plugin system for custom MCP servers
- [ ] Multi-language support
- [ ] Advanced server management features
- [ ] Cloud synchronization
- [ ] Custom themes and styling options
- [ ] Performance monitoring and analytics
- [ ] Docker container support
- [ ] CLI tool for server management

---

Made with ❤️ by [Kirti Jha](https://github.com/KirtiJha)
