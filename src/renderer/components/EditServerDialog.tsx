import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography,
  IconButton,
  Box,
  Divider,
  Chip,
  Alert,
  Tabs,
  Tab,
  Paper,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Upload as UploadIcon,
  Code as CodeIcon,
} from "@mui/icons-material";
import { ServerConfig } from "../../shared/types";

interface EditServerDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (config: ServerConfig) => void;
  serverConfig: ServerConfig | null;
}

const EditServerDialog: React.FC<EditServerDialogProps> = ({
  open,
  onClose,
  onSave,
  serverConfig,
}) => {
  const [config, setConfig] = useState<ServerConfig>({
    id: "",
    name: "",
    type: "stdio",
    command: "",
    args: [],
    env: {},
    contextParams: {},
  });

  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>(
    []
  );
  const [contextParams, setContextParams] = useState<
    Array<{ key: string; value: string }>
  >([]);
  const [argsText, setArgsText] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [jsonConfig, setJsonConfig] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (serverConfig && open) {
      setConfig(serverConfig);

      // Convert env object to array for editing
      const envArray = Object.entries(serverConfig.env || {}).map(
        ([key, value]) => ({
          key,
          value: value || "",
        })
      );
      setEnvVars(envArray);

      // Convert contextParams object to array for editing
      const contextArray = Object.entries(serverConfig.contextParams || {}).map(
        ([key, value]) => ({
          key,
          value: value || "",
        })
      );
      setContextParams(contextArray);

      // Convert args array to text for editing
      setArgsText((serverConfig.args || []).join(" "));

      // Initialize JSON config
      const exportConfig = {
        mcpServers: {
          [serverConfig.name]: {
            command: serverConfig.command,
            args: serverConfig.args || [],
            env: serverConfig.env || {},
            contextParams: serverConfig.contextParams || {},
            ...(serverConfig.url && { url: serverConfig.url }),
          },
        },
      };
      setJsonConfig(JSON.stringify(exportConfig, null, 2));
    } else if (!serverConfig && open) {
      // Reset for new server
      resetForm();
    }
  }, [serverConfig, open]);

  const resetForm = () => {
    setConfig({
      id: "",
      name: "",
      type: "stdio",
      command: "",
      args: [],
      env: {},
      contextParams: {},
    });
    setEnvVars([]);
    setContextParams([]);
    setArgsText("");
    setJsonConfig("");
    setJsonError(null);
    setTabValue(0);
  };

  const handleSave = () => {
    // Convert arrays back to objects
    const envObj = envVars.reduce((acc, { key, value }) => {
      if (key.trim()) {
        acc[key.trim()] = value;
      }
      return acc;
    }, {} as Record<string, string>);

    const contextObj = contextParams.reduce((acc, { key, value }) => {
      if (key.trim()) {
        acc[key.trim()] = value;
      }
      return acc;
    }, {} as Record<string, string>);

    // Parse args from text
    const argsArray = argsText
      .split(" ")
      .map((arg) => arg.trim())
      .filter((arg) => arg.length > 0);

    const finalConfig: ServerConfig = {
      ...config,
      env: envObj,
      contextParams: contextObj,
      args: argsArray,
    };

    onSave(finalConfig);
  };

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: "", value: "" }]);
  };

  const removeEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const updateEnvVar = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const updated = [...envVars];
    updated[index][field] = value;
    setEnvVars(updated);
  };

  const addContextParam = () => {
    setContextParams([...contextParams, { key: "", value: "" }]);
  };

  const removeContextParam = (index: number) => {
    setContextParams(contextParams.filter((_, i) => i !== index));
  };

  const updateContextParam = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const updated = [...contextParams];
    updated[index][field] = value;
    setContextParams(updated);
  };

  const getExampleForServerType = () => {
    switch (config.type) {
      case "stdio":
        return {
          command: "uvx",
          args: "mcp-server-git --repository /path/to/repo",
          contextParams: "repo_path: /Users/yourname/project",
        };
      case "sse":
        return {
          url: "http://localhost:3000/sse",
          contextParams: "api_key: your-api-key",
        };
      default:
        return {};
    }
  };

  const examples = getExampleForServerType();

  const exportToJson = () => {
    const currentConfig = {
      name: config.name,
      type: config.type,
      command: config.command,
      args: argsText.split(" ").filter((arg) => arg.trim()),
      env: envVars.reduce((acc, { key, value }) => {
        if (key.trim()) acc[key.trim()] = value;
        return acc;
      }, {} as Record<string, string>),
      contextParams: contextParams.reduce((acc, { key, value }) => {
        if (key.trim()) acc[key.trim()] = value;
        return acc;
      }, {} as Record<string, string>),
      ...(config.url && { url: config.url }),
    };

    const exportConfig = {
      mcpServers: {
        [config.name || "server"]: currentConfig,
      },
    };
    setJsonConfig(JSON.stringify(exportConfig, null, 2));
    setJsonError(null);
    setTabValue(1);
  };

  const importFromJson = () => {
    try {
      setJsonError(null);
      const parsed = JSON.parse(jsonConfig);

      // Handle standard MCP configuration format
      if (parsed.mcpServers) {
        const serverNames = Object.keys(parsed.mcpServers);
        if (serverNames.length === 0) {
          throw new Error("No servers found in configuration");
        }

        // Use the first server in the configuration
        const serverName = serverNames[0];
        const serverConfig = parsed.mcpServers[serverName];

        // Extract configuration
        const newConfig: ServerConfig = {
          id: config.id || `server-${Date.now()}`, // Keep existing ID or generate new one
          name: serverConfig.name || serverName,
          command: serverConfig.command || "",
          args: serverConfig.args || [],
          env: serverConfig.env || {},
          contextParams: serverConfig.contextParams || {},
          type: serverConfig.url ? "sse" : "stdio",
          ...(serverConfig.url && { url: serverConfig.url }),
        };

        setConfig(newConfig);

        // Update UI state
        const envArray = Object.entries(newConfig.env || {}).map(
          ([key, value]) => ({
            key,
            value: value || "",
          })
        );
        setEnvVars(envArray);

        const contextArray = Object.entries(newConfig.contextParams || {}).map(
          ([key, value]) => ({
            key,
            value: value || "",
          })
        );
        setContextParams(contextArray);

        setArgsText((newConfig.args || []).join(" "));
        setTabValue(0); // Switch back to form view
      } else {
        throw new Error(
          'Invalid configuration format. Expected "mcpServers" property.'
        );
      }
    } catch (error: any) {
      setJsonError(error.message || "Invalid JSON configuration");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: "70vh" },
      }}
    >
      <DialogTitle>
        {serverConfig ? "Edit Server Configuration" : "Add New Server"}
      </DialogTitle>

      <DialogContent dividers>
        {/* Tabs for Form vs JSON */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            aria-label="Configuration input method"
          >
            <Tab label="Form Input" icon={<CodeIcon />} />
            <Tab label="JSON Configuration" icon={<UploadIcon />} />
          </Tabs>
        </Box>

        {/* Tab Content */}
        {tabValue === 0 && (
          /* Form Input Tab */
          <Stack spacing={3}>
            {/* Basic Configuration */}
            <Box>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={2}
              >
                <Typography variant="h6">Basic Configuration</Typography>
                <Button
                  onClick={exportToJson}
                  startIcon={<UploadIcon />}
                  size="small"
                  variant="outlined"
                >
                  Export to JSON
                </Button>
              </Box>

              <Stack spacing={2}>
                <TextField
                  label="Server Name"
                  value={config.name}
                  onChange={(e) =>
                    setConfig({ ...config, name: e.target.value })
                  }
                  fullWidth
                  required
                  helperText="A friendly name for this MCP server"
                />

                <FormControl fullWidth required>
                  <InputLabel>Server Type</InputLabel>
                  <Select
                    value={config.type}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        type: e.target.value as "stdio" | "sse",
                      })
                    }
                  >
                    <MenuItem value="stdio">Standard I/O (stdio)</MenuItem>
                    <MenuItem value="sse">Server-Sent Events (SSE)</MenuItem>
                  </Select>
                </FormControl>

                {config.type === "stdio" ? (
                  <>
                    <TextField
                      label="Command"
                      value={config.command}
                      onChange={(e) =>
                        setConfig({ ...config, command: e.target.value })
                      }
                      fullWidth
                      required
                      helperText={`Example: ${examples.command || "uvx"}`}
                    />

                    <TextField
                      label="Arguments"
                      value={argsText}
                      onChange={(e) => setArgsText(e.target.value)}
                      fullWidth
                      multiline
                      rows={2}
                      helperText={`Space-separated arguments. Example: ${
                        examples.args || "mcp-server-time"
                      }`}
                    />
                  </>
                ) : (
                  <TextField
                    label="URL"
                    value={config.url || ""}
                    onChange={(e) =>
                      setConfig({ ...config, url: e.target.value })
                    }
                    fullWidth
                    required
                    helperText={`Example: ${
                      examples.url || "http://localhost:3000/sse"
                    }`}
                  />
                )}
              </Stack>
            </Box>

            <Divider />

            {/* Environment Variables */}
            <Box>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={2}
              >
                <Typography variant="h6">Environment Variables</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={addEnvVar}
                  size="small"
                  variant="outlined"
                >
                  Add Variable
                </Button>
              </Box>

              {envVars.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No environment variables configured
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {envVars.map((envVar, index) => (
                    <Box key={index} display="flex" gap={1} alignItems="center">
                      <TextField
                        label="Name"
                        value={envVar.key}
                        onChange={(e) =>
                          updateEnvVar(index, "key", e.target.value)
                        }
                        size="small"
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        label="Value"
                        value={envVar.value}
                        onChange={(e) =>
                          updateEnvVar(index, "value", e.target.value)
                        }
                        size="small"
                        sx={{ flex: 2 }}
                      />
                      <IconButton
                        onClick={() => removeEnvVar(index)}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>

            <Divider />

            {/* Context Parameters */}
            <Box>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={2}
              >
                <Typography variant="h6">Context Parameters</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={addContextParam}
                  size="small"
                  variant="outlined"
                >
                  Add Parameter
                </Button>
              </Box>

              <Alert severity="info" sx={{ mb: 2 }}>
                Context parameters are automatically injected into tool calls.
                For example, set "repo_path" to automatically provide the
                repository path to git tools.
              </Alert>

              {contextParams.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No context parameters configured
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {contextParams.map((param, index) => (
                    <Box key={index} display="flex" gap={1} alignItems="center">
                      <TextField
                        label="Parameter Name"
                        value={param.key}
                        onChange={(e) =>
                          updateContextParam(index, "key", e.target.value)
                        }
                        size="small"
                        sx={{ flex: 1 }}
                        helperText={
                          index === 0 ? "e.g., repo_path, api_key" : undefined
                        }
                      />
                      <TextField
                        label="Value"
                        value={param.value}
                        onChange={(e) =>
                          updateContextParam(index, "value", e.target.value)
                        }
                        size="small"
                        sx={{ flex: 2 }}
                        helperText={
                          index === 0 ? "e.g., /Users/name/project" : undefined
                        }
                      />
                      <IconButton
                        onClick={() => removeContextParam(index)}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              )}

              {examples.contextParams && (
                <Typography variant="caption" color="text.secondary" mt={1}>
                  Example: {examples.contextParams}
                </Typography>
              )}
            </Box>

            {/* Configuration Preview */}
            {config.name && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Configuration Preview
                </Typography>
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: "grey.900",
                    borderRadius: 1,
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                    color: "grey.100",
                    maxHeight: 200,
                    overflow: "auto",
                  }}
                >
                  <pre style={{ margin: 0, color: "inherit" }}>
                    {JSON.stringify(
                      {
                        name: config.name,
                        type: config.type,
                        command: config.command,
                        args: argsText.split(" ").filter((arg) => arg.trim()),
                        env: envVars.reduce((acc, { key, value }) => {
                          if (key.trim()) acc[key.trim()] = value;
                          return acc;
                        }, {} as Record<string, string>),
                        contextParams: contextParams.reduce(
                          (acc, { key, value }) => {
                            if (key.trim()) acc[key.trim()] = value;
                            return acc;
                          },
                          {} as Record<string, string>
                        ),
                        ...(config.url && { url: config.url }),
                      },
                      null,
                      2
                    )}
                  </pre>
                </Paper>
              </Box>
            )}
          </Stack>
        )}

        {tabValue === 1 && (
          /* JSON Configuration Tab */
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" gutterBottom>
                JSON Configuration
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Paste a complete MCP server configuration in JSON format, or
                edit the exported configuration below.
              </Alert>

              <TextField
                label="JSON Configuration"
                value={jsonConfig}
                onChange={(e) => setJsonConfig(e.target.value)}
                multiline
                rows={12}
                fullWidth
                variant="outlined"
                placeholder={`{
  "mcpServers": {
    "my-server": {
      "command": "uvx",
      "args": ["mcp-server-git", "--repository", "/path/to/repo"],
      "env": {
        "API_KEY": "your-key"
      },
      "contextParams": {
        "repo_path": "/Users/yourname/project"
      }
    }
  }
}`}
                sx={{
                  "& .MuiInputBase-input": {
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                  },
                }}
              />

              {jsonError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {jsonError}
                </Alert>
              )}

              <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={importFromJson}
                  disabled={!jsonConfig.trim()}
                  startIcon={<UploadIcon />}
                >
                  Import Configuration
                </Button>
                <Button variant="outlined" onClick={() => setJsonConfig("")}>
                  Clear
                </Button>
              </Box>
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} startIcon={<CancelIcon />}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={
            !config.name ||
            (!config.command && config.type === "stdio") ||
            (!config.url && config.type === "sse")
          }
        >
          {serverConfig ? "Save Changes" : "Add Server"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditServerDialog;
