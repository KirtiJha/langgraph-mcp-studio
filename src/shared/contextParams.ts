/**
 * Common MCP Context Parameters Knowledge Base
 * 
 * This file contains common context parameters used by various MCP servers
 * to help users configure their servers correctly.
 */

export interface ContextParamInfo {
  name: string;
  description: string;
  example: string;
  required: boolean;
  serverTypes: string[];
}

export const COMMON_CONTEXT_PARAMS: ContextParamInfo[] = [
  // Git-related parameters
  {
    name: "repo_path",
    description: "Path to the git repository",
    example: "/Users/username/my-project",
    required: true,
    serverTypes: ["git", "github"]
  },
  {
    name: "repository_path", 
    description: "Alternative name for git repository path",
    example: "/Users/username/my-project",
    required: true,
    serverTypes: ["git"]
  },
  
  // GitHub-specific parameters
  {
    name: "github_token",
    description: "GitHub personal access token",
    example: "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    required: false,
    serverTypes: ["github"]
  },
  {
    name: "repo_owner",
    description: "GitHub repository owner/organization",
    example: "microsoft",
    required: false,
    serverTypes: ["github"]
  },
  {
    name: "repo_name",
    description: "GitHub repository name",
    example: "vscode",
    required: false,
    serverTypes: ["github"]
  },

  // Database parameters
  {
    name: "database_url",
    description: "Database connection URL",
    example: "postgresql://user:password@localhost:5432/dbname",
    required: true,
    serverTypes: ["postgres", "mysql", "database"]
  },
  {
    name: "db_host",
    description: "Database host address",
    example: "localhost",
    required: true,
    serverTypes: ["postgres", "mysql", "database"]
  },
  {
    name: "db_port",
    description: "Database port number",
    example: "5432",
    required: true,
    serverTypes: ["postgres", "mysql", "database"]
  },
  {
    name: "db_name",
    description: "Database name",
    example: "myapp_db",
    required: true,
    serverTypes: ["postgres", "mysql", "database"]
  },
  {
    name: "db_user",
    description: "Database username",
    example: "dbuser",
    required: true,
    serverTypes: ["postgres", "mysql", "database"]
  },
  {
    name: "db_password",
    description: "Database password",
    example: "secretpassword",
    required: true,
    serverTypes: ["postgres", "mysql", "database"]
  },

  // File system parameters
  {
    name: "working_directory",
    description: "Working directory for file operations",
    example: "/Users/username/workspace",
    required: false,
    serverTypes: ["filesystem", "files"]
  },
  {
    name: "base_path",
    description: "Base path for relative file operations",
    example: "/Users/username/documents",
    required: false,
    serverTypes: ["filesystem", "files"]
  },

  // Web/API parameters
  {
    name: "base_url",
    description: "Base URL for API requests",
    example: "https://api.example.com",
    required: true,
    serverTypes: ["web", "api", "http"]
  },
  {
    name: "api_key",
    description: "API key for authentication",
    example: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    required: true,
    serverTypes: ["web", "api", "openai", "anthropic"]
  },
  {
    name: "auth_token",
    description: "Authentication token",
    example: "Bearer xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    required: true,
    serverTypes: ["web", "api"]
  },

  // Project/workspace parameters
  {
    name: "project_id",
    description: "Project identifier",
    example: "my-project-123",
    required: true,
    serverTypes: ["gcp", "project"]
  },
  {
    name: "workspace_id",
    description: "Workspace identifier", 
    example: "workspace-456",
    required: true,
    serverTypes: ["slack", "notion", "workspace"]
  },

  // Time/timezone parameters
  {
    name: "timezone",
    description: "Timezone for time-based operations",
    example: "America/New_York",
    required: false,
    serverTypes: ["time", "calendar", "scheduling"]
  },

  // Language/locale parameters
  {
    name: "language",
    description: "Language code for localization",
    example: "en-US",
    required: false,
    serverTypes: ["translation", "i18n"]
  },
  {
    name: "locale",
    description: "Locale for formatting",
    example: "en_US.UTF-8",
    required: false,
    serverTypes: ["translation", "i18n"]
  }
];

/**
 * Get suggested context parameters for a server based on its name/command
 */
export function getSuggestedContextParams(serverName: string, command?: string): ContextParamInfo[] {
  const searchText = `${serverName} ${command || ''}`.toLowerCase();
  
  return COMMON_CONTEXT_PARAMS.filter(param => {
    // Check if any of the server types match the search text
    return param.serverTypes.some(type => 
      searchText.includes(type) || 
      searchText.includes(param.name.toLowerCase())
    );
  });
}

/**
 * Get context parameter by name
 */
export function getContextParamInfo(paramName: string): ContextParamInfo | undefined {
  return COMMON_CONTEXT_PARAMS.find(param => 
    param.name.toLowerCase() === paramName.toLowerCase()
  );
}

/**
 * Validate context parameter value
 */
export function validateContextParam(paramName: string, value: string): string | null {
  const param = getContextParamInfo(paramName);
  if (!param) return null;

  // Basic validation rules
  if (param.required && !value.trim()) {
    return `${param.name} is required`;
  }

  if (paramName.includes('url') && value && !isValidUrl(value)) {
    return `${param.name} must be a valid URL`;
  }

  if (paramName.includes('path') && value && !isValidPath(value)) {
    return `${param.name} must be a valid file path`;
  }

  if (paramName.includes('port') && value && !isValidPort(value)) {
    return `${param.name} must be a valid port number (1-65535)`;
  }

  return null;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidPath(path: string): boolean {
  // Basic path validation - check if it looks like a valid path
  return path.length > 0 && (
    path.startsWith('/') || // Unix absolute path
    /^[A-Za-z]:/.test(path) || // Windows drive path
    path.startsWith('./') || // Relative path
    path.startsWith('../') // Parent relative path
  );
}

function isValidPort(port: string): boolean {
  const num = parseInt(port, 10);
  return !isNaN(num) && num >= 1 && num <= 65535;
}
