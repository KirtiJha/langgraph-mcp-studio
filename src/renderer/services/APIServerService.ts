import { APIServerConfig, APIServerStatus } from "../../shared/apiServerTypes";

class APIServerRendererService {
  async getAllServers(): Promise<APIServerConfig[]> {
    return await window.electronAPI["api-server:get-all"]();
  }

  async saveServer(config: APIServerConfig): Promise<APIServerConfig> {
    return await window.electronAPI["api-server:save"](config);
  }

  async deleteServer(serverId: string): Promise<boolean> {
    return await window.electronAPI["api-server:delete"](serverId);
  }

  async startServer(serverId: string): Promise<APIServerStatus> {
    return await window.electronAPI["api-server:start"](serverId);
  }

  async stopServer(serverId: string): Promise<boolean> {
    return await window.electronAPI["api-server:stop"](serverId);
  }

  async getServerStatus(serverId: string): Promise<APIServerStatus | null> {
    return await window.electronAPI["api-server:get-status"](serverId);
  }

  async testEndpoint(
    serverId: string,
    endpointId: string,
    params?: Record<string, any>
  ): Promise<any> {
    return await window.electronAPI["api-server:test-endpoint"](
      serverId,
      endpointId,
      params
    );
  }

  async generateDocumentation(serverId: string): Promise<string> {
    return await window.electronAPI["api-server:generate-docs"](serverId);
  }
}

export default new APIServerRendererService();
