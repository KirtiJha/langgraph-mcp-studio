// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { MCPManager } from './mcp/MCPManager';
import { LangGraphAgent } from './agent/LangGraphAgent';
import Store from 'electron-store';
import { IpcChannels } from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let mcpManager: MCPManager;
let agent: LangGraphAgent;
const store = new Store();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    vibrancy: process.platform === 'darwin' ? 'sidebar' : undefined,
    backgroundColor: '#0f0f0f',
    show: false,
    icon: process.platform === 'win32' ? path.join(__dirname, '../../assets/icon.ico') : undefined,
    title: 'MCP Studio'
  });

  if (process.env.NODE_ENV === 'development' && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  createWindow();
  
  // Initialize MCP Manager
  mcpManager = new MCPManager(store);
  
  // Initialize Agent with error handling
  try {
    agent = new LangGraphAgent(mcpManager);
    console.log('LangGraph Agent initialized successfully');
  } catch (error) {
    console.warn('Failed to initialize LangGraph Agent:', error);
    console.warn('Chat functionality will be limited. Please configure Watsonx credentials.');
    // Continue without agent - the app can still manage MCP servers
  }
  
  // Setup IPC handlers
  setupIpcHandlers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

function setupIpcHandlers() {
  // Server management
  ipcMain.handle(IpcChannels.ADD_SERVER, async (_, config) => {
    return await mcpManager.addServer(config);
  });

  ipcMain.handle(IpcChannels.REMOVE_SERVER, async (_, id) => {
    return await mcpManager.removeServer(id);
  });

  ipcMain.handle(IpcChannels.LIST_SERVERS, async () => {
    return mcpManager.listServers();
  });

  ipcMain.handle(IpcChannels.CONNECT_SERVER, async (_, id) => {
    const result = await mcpManager.connectServer(id);
    
    // Refresh the agent with updated tools when a server connects
    if (agent) {
      await agent.refreshAgent();
    }
    
    return result;
  });

  ipcMain.handle(IpcChannels.DISCONNECT_SERVER, async (_, id) => {
    return await mcpManager.disconnectServer(id);
  });

  // Tool operations
  ipcMain.handle(IpcChannels.LIST_TOOLS, async (_, serverId) => {
    console.log('Main process: LIST_TOOLS called with serverId:', serverId);
    try {
      const result = await mcpManager.listTools(serverId);
      console.log('Main process: LIST_TOOLS returning:', result.length, 'tools');
      return result;
    } catch (error) {
      console.error('Main process: Error listing tools:', error);
      throw error;
    }
  });

  ipcMain.handle(IpcChannels.EXECUTE_TOOL, async (_, { serverId, toolName, args }) => {
    return await mcpManager.callTool(toolName, args, serverId);
  });

  // Agent operations
  ipcMain.handle(IpcChannels.SEND_MESSAGE, async (_, message) => {
    if (!agent) {
      throw new Error('Chat agent is not available. Please configure Watsonx credentials in your environment variables.');
    }
    return await agent.processMessage(message);
  });

  // Resource operations
  ipcMain.handle(IpcChannels.LIST_RESOURCES, async (_, serverId) => {
    return await mcpManager.listResources(serverId);
  });

  ipcMain.handle(IpcChannels.READ_RESOURCE, async (_, { serverId, uri }) => {
    return await mcpManager.readResource(serverId, uri);
  });

  // Prompt operations
  ipcMain.handle(IpcChannels.LIST_PROMPTS, async (_, serverId) => {
    return await mcpManager.listPrompts(serverId);
  });

  ipcMain.handle(IpcChannels.GET_PROMPT, async (_, { serverId, name, args }) => {
    return await mcpManager.getPrompt(serverId, name, args);
  });

  // Context parameter discovery
  ipcMain.handle(IpcChannels.DISCOVER_CONTEXT_PARAMS, async (_, serverId) => {
    return await mcpManager.discoverContextParameters(serverId);
  });

  // Server configuration
  ipcMain.handle(IpcChannels.GET_SERVER_CONFIG, async (_, id) => {
    return mcpManager.getServerConfig(id);
  });

  ipcMain.handle(IpcChannels.UPDATE_SERVER, async (_, id, config) => {
    return await mcpManager.updateServer(id, config);
  });

  // Server events
  mcpManager.on('server-connected', (serverId) => {
    mainWindow?.webContents.send('server-connected', serverId);
  });

  mcpManager.on('server-disconnected', (serverId) => {
    mainWindow?.webContents.send('server-disconnected', serverId);
  });

  mcpManager.on('server-error', (serverId, error) => {
    mainWindow?.webContents.send('server-error', { serverId, error });
  });

  mcpManager.on('tool-executed', (result) => {
    mainWindow?.webContents.send('tool-executed', result);
  });
}
