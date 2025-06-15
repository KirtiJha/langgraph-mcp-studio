import { BrowserWindow } from "electron";
import { LogEntry, IpcChannels } from "../../shared/types";

export class LoggingService {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs
  private mainWindow: BrowserWindow | null = null;

  constructor(mainWindow: BrowserWindow | null = null) {
    this.mainWindow = mainWindow;
    this.setupConsoleOverride();
  }

  setMainWindow(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  private setupConsoleOverride() {
    // Store original console methods
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug,
    };

    // Override console methods to capture logs
    console.log = (...args: any[]) => {
      originalConsole.log(...args);
      this.addLog("info", "Console", this.formatMessage(args));
    };

    console.warn = (...args: any[]) => {
      originalConsole.warn(...args);
      this.addLog("warning", "Console", this.formatMessage(args));
    };

    console.error = (...args: any[]) => {
      originalConsole.error(...args);
      this.addLog(
        "error",
        "Console",
        this.formatMessage(args),
        args.length > 1 ? args.slice(1) : undefined
      );
    };

    console.info = (...args: any[]) => {
      originalConsole.info(...args);
      this.addLog("info", "Console", this.formatMessage(args));
    };

    console.debug = (...args: any[]) => {
      originalConsole.debug(...args);
      this.addLog("debug", "Console", this.formatMessage(args));
    };
  }

  private formatMessage(args: any[]): string {
    return args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
      )
      .join(" ");
  }

  addLog(
    level: LogEntry["level"],
    source: string,
    message: string,
    details?: any
  ) {
    const logEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      source,
      message,
      details,
    };

    this.logs.push(logEntry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Send log to renderer if window is available
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IpcChannels.LOG_EVENT, logEntry);
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IpcChannels.CLEAR_LOGS);
    }
  }

  log(message: string, details?: any) {
    this.addLog("info", "System", message, details);
  }

  warn(message: string, details?: any) {
    this.addLog("warning", "System", message, details);
  }

  error(message: string, details?: any) {
    this.addLog("error", "System", message, details);
  }

  success(message: string, details?: any) {
    this.addLog("success", "System", message, details);
  }

  debug(message: string, details?: any) {
    this.addLog("debug", "System", message, details);
  }
}

export const loggingService = new LoggingService();
