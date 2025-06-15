# MCP Studio

A modern, professional desktop application for managing and interacting with Model Context Protocol (MCP) servers. Built with Electron, React, TypeScript, and enhanced with beautiful Tailwind CSS styling.

![MCP Studio](https://via.placeholder.com/800x400/1e293b/f1f5f9?text=MCP+Studio)

## Features

### 🚀 Modern UI/UX
- **Dark Theme**: Professional dark interface with gradient accents and modern styling
- **Real-time Tool Execution**: Visual indicators showing which tools are being executed
- **Interactive Chat**: Rich chat interface with the AI assistant
- **Responsive Design**: Optimized for desktop use across Mac and Windows

### 🔧 MCP Server Management
- **Easy Server Setup**: Add MCP servers with a simple, intuitive form
- **Connection Status**: Real-time server connection monitoring and status indicators
- **Server Configuration**: Support for environment variables, custom arguments, and working directories
- **Protocol Support**: Supports both stdio and SSE (Server-Sent Events) transports

### 🤖 AI Assistant Integration
- **LangGraph Integration**: Powered by LangGraph React agents with IBM WatsonX AI
- **Tool Execution Visualization**: See exactly which tools the AI is using in real-time
- **Collapsible Tool Results**: Clean separation between AI responses and detailed tool execution data
- **Real-time Updates**: Live status indicators during processing and tool execution
### 🛠️ Developer Tools
- **Logs Console**: Built-in logging for debugging and monitoring
- **Tool Testing**: Execute tools manually for testing and validation
- **Server Stats**: Monitor server performance and connection status
- **Keyboard Shortcuts**: Efficient navigation with hotkeys

## Screenshots

*Coming soon - Screenshots will be added after initial release*

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
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/directory"],
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
