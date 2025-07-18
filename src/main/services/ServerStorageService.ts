import * as path from "path";
import * as fs from "fs/promises";
import * as os from "os";
import { dialog, app } from "electron";

export class ServerStorageService {
  private static instance: ServerStorageService;
  private customStoragePath: string = "";
  private useCustomPath: boolean = false;

  static getInstance(): ServerStorageService {
    if (!ServerStorageService.instance) {
      ServerStorageService.instance = new ServerStorageService();
    }
    return ServerStorageService.instance;
  }

  /**
   * Get the default storage path for generated servers
   */
  getDefaultStoragePath(): string {
    // Use user's documents folder for generated servers
    return path.join(
      os.homedir(),
      "Documents",
      "MCP-Studio",
      "generated-servers"
    );
  }

  /**
   * Get the current storage path (custom or default)
   */
  getCurrentStoragePath(): string {
    if (this.useCustomPath && this.customStoragePath) {
      return this.customStoragePath;
    }
    return this.getDefaultStoragePath();
  }

  /**
   * Set custom storage path
   */
  setCustomStoragePath(customPath: string, useCustom: boolean = true): void {
    this.customStoragePath = customPath;
    this.useCustomPath = useCustom;
  }

  /**
   * Get storage path for a specific server
   */
  getServerPath(serverId: string): string {
    return path.join(this.getCurrentStoragePath(), serverId);
  }

  /**
   * Ensure the storage directory exists
   */
  async ensureStorageDirectory(): Promise<void> {
    const storagePath = this.getCurrentStoragePath();
    try {
      await fs.mkdir(storagePath, { recursive: true });
    } catch (error) {
      console.error("Failed to create storage directory:", error);
      throw error;
    }
  }

  /**
   * Show directory selection dialog
   */
  async selectDirectory(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      title: "Select Generated Servers Storage Directory",
      properties: ["openDirectory", "createDirectory"],
      defaultPath: this.getDefaultStoragePath(),
      message: "Choose where to store generated MCP server files",
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  }

  /**
   * Get server files information
   */
  async getServerFiles(serverId: string): Promise<{
    exists: boolean;
    files: Array<{
      name: string;
      path: string;
      size: number;
      modified: Date;
      type: "file" | "directory";
    }>;
  }> {
    const serverPath = this.getServerPath(serverId);

    try {
      const stats = await fs.stat(serverPath);
      if (!stats.isDirectory()) {
        return { exists: false, files: [] };
      }

      const entries = await fs.readdir(serverPath, { withFileTypes: true });
      const files = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(serverPath, entry.name);
          const stats = await fs.stat(fullPath);
          return {
            name: entry.name,
            path: fullPath,
            size: stats.size,
            modified: stats.mtime,
            type: entry.isDirectory()
              ? ("directory" as const)
              : ("file" as const),
          };
        })
      );

      return { exists: true, files };
    } catch (error) {
      return { exists: false, files: [] };
    }
  }

  /**
   * Read server code file
   */
  async readServerCode(
    serverId: string,
    fileName: string = "server.ts"
  ): Promise<string> {
    const filePath = path.join(this.getServerPath(serverId), fileName);
    try {
      return await fs.readFile(filePath, "utf-8");
    } catch (error) {
      throw new Error(
        `Failed to read server code: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Write server code file
   */
  async writeServerCode(
    serverId: string,
    fileName: string,
    content: string
  ): Promise<void> {
    const serverPath = this.getServerPath(serverId);
    await fs.mkdir(serverPath, { recursive: true });

    const filePath = path.join(serverPath, fileName);
    try {
      await fs.writeFile(filePath, content, "utf-8");
    } catch (error) {
      throw new Error(
        `Failed to write server code: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Open server folder in system file explorer
   */
  async openServerFolder(serverId: string): Promise<void> {
    const serverPath = this.getServerPath(serverId);
    const { shell } = require("electron");

    try {
      // Ensure directory exists first
      await fs.mkdir(serverPath, { recursive: true });
      await shell.openPath(serverPath);
    } catch (error) {
      throw new Error(
        `Failed to open server folder: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Clean up old server files
   */
  async cleanupOldServers(
    maxAgeMs: number = 30 * 24 * 60 * 60 * 1000
  ): Promise<void> {
    const storagePath = this.getCurrentStoragePath();

    try {
      const entries = await fs.readdir(storagePath, { withFileTypes: true });
      const now = Date.now();

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirPath = path.join(storagePath, entry.name);
          const stats = await fs.stat(dirPath);

          if (now - stats.mtime.getTime() > maxAgeMs) {
            console.log(`Cleaning up old server directory: ${entry.name}`);
            await fs.rm(dirPath, { recursive: true, force: true });
          }
        }
      }
    } catch (error) {
      console.warn("Failed to cleanup old servers:", error);
    }
  }

  /**
   * Get storage usage information
   */
  async getStorageUsage(): Promise<{
    totalSizeMB: number;
    serverCount: number;
    oldestServer: Date | null;
    newestServer: Date | null;
  }> {
    const storagePath = this.getCurrentStoragePath();

    try {
      const entries = await fs.readdir(storagePath, { withFileTypes: true });
      let totalSize = 0;
      let oldestDate: Date | null = null;
      let newestDate: Date | null = null;
      let serverCount = 0;

      for (const entry of entries) {
        if (entry.isDirectory()) {
          serverCount++;
          const dirPath = path.join(storagePath, entry.name);
          const stats = await fs.stat(dirPath);

          // Calculate directory size
          const dirSize = await this.getDirectorySize(dirPath);
          totalSize += dirSize;

          // Track oldest and newest
          if (!oldestDate || stats.mtime < oldestDate) {
            oldestDate = stats.mtime;
          }
          if (!newestDate || stats.mtime > newestDate) {
            newestDate = stats.mtime;
          }
        }
      }

      return {
        totalSizeMB: Math.round((totalSize / (1024 * 1024)) * 100) / 100,
        serverCount,
        oldestServer: oldestDate,
        newestServer: newestDate,
      };
    } catch (error) {
      return {
        totalSizeMB: 0,
        serverCount: 0,
        oldestServer: null,
        newestServer: null,
      };
    }
  }

  /**
   * Get size of a directory recursively
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          totalSize += await this.getDirectorySize(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // Ignore errors and continue
    }

    return totalSize;
  }
}
