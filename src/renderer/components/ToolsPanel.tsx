import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Box,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tooltip,
  Divider,
} from "@mui/material";
import {
  PlayArrow as PlayIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  Build as BuildIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { ServerStatus, Tool } from "../../shared/types";

interface ToolsPanelProps {
  servers: ServerStatus[];
  selectedServerId: string | null;
  onSelectServer: (serverId: string) => void;
}

const ToolsPanel: React.FC<ToolsPanelProps> = ({
  servers,
  selectedServerId,
  onSelectServer,
}) => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(false);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [toolArgs, setToolArgs] = useState<string>("{}");
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [togglingTools, setTogglingTools] = useState<Set<string>>(new Set());

  const connectedServers = servers.filter((s) => s.connected);

  useEffect(() => {
    console.log(
      "ToolsPanel: useEffect triggered with selectedServerId:",
      selectedServerId
    );
    console.log("ToolsPanel: All servers:", servers);

    const connectedServers = servers.filter((s) => s.connected);
    console.log(
      "ToolsPanel: Connected servers:",
      connectedServers.map((s) => s.id)
    );

    if (selectedServerId) {
      const selectedServer = servers.find((s) => s.id === selectedServerId);
      console.log("ToolsPanel: Selected server:", selectedServer);

      if (selectedServer && selectedServer.connected) {
        console.log(
          "ToolsPanel: Loading tools for connected selected server:",
          selectedServerId
        );
        loadTools(selectedServerId);
      } else {
        console.log(
          "ToolsPanel: Selected server is not connected, clearing tools"
        );
        setTools([]);
      }
    } else if (connectedServers.length > 0) {
      console.log(
        "ToolsPanel: Auto-selecting first connected server:",
        connectedServers[0].id
      );
      onSelectServer(connectedServers[0].id);
    } else {
      console.log("ToolsPanel: No connected servers, clearing tools");
      setTools([]);
    }
  }, [selectedServerId, servers]);

  const loadTools = async (serverId: string) => {
    console.log("ToolsPanel: loadTools called with serverId:", serverId);
    setLoading(true);
    try {
      const serverTools = await window.electronAPI.listTools(serverId);
      console.log("ToolsPanel: Received tools:", serverTools);
      setTools(serverTools);
    } catch (error) {
      console.error("ToolsPanel: Failed to load tools:", error);
      setTools([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteTool = async () => {
    if (!selectedTool || !selectedServerId) return;

    setExecuting(true);
    setExecutionError(null);
    setExecutionResult(null);

    try {
      const args = JSON.parse(toolArgs);
      const result = await window.electronAPI.executeTool(
        selectedServerId,
        selectedTool.name,
        args
      );
      setExecutionResult(result);
    } catch (error: any) {
      setExecutionError(error.message || "Failed to execute tool");
    } finally {
      setExecuting(false);
    }
  };

  const openExecuteDialog = (tool: Tool) => {
    setSelectedTool(tool);
    setToolArgs(JSON.stringify({}, null, 2));
    setExecutionResult(null);
    setExecutionError(null);
    setExecuteDialogOpen(true);
  };

  const closeExecuteDialog = () => {
    setExecuteDialogOpen(false);
    setSelectedTool(null);
    setExecutionResult(null);
    setExecutionError(null);
  };

  const handleToolToggle = async (tool: Tool) => {
    if (!tool.serverId) return;

    const toolKey = `${tool.serverId}:${tool.name}`;
    setTogglingTools((prev) => new Set(prev).add(toolKey));

    try {
      const newState = await window.electronAPI.toggleToolState(
        tool.name,
        tool.serverId
      );

      // Update the tool state in our local state
      setTools((prevTools) =>
        prevTools.map((t) =>
          t.name === tool.name && t.serverId === tool.serverId
            ? { ...t, enabled: newState }
            : t
        )
      );
    } catch (error) {
      console.error("Failed to toggle tool state:", error);
    } finally {
      setTogglingTools((prev) => {
        const next = new Set(prev);
        next.delete(toolKey);
        return next;
      });
    }
  };

  const getToolKey = (tool: Tool): string => {
    return `${tool.serverId}:${tool.name}`;
  };

  const isToolToggling = (tool: Tool): boolean => {
    return togglingTools.has(getToolKey(tool));
  };

  const renderToolSchema = (tool: Tool) => {
    if (!tool.inputSchema) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Input Schema:
        </Typography>
        <Paper
          sx={{
            p: 2,
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <Box
            component="pre"
            sx={{
              margin: 0,
              fontSize: "12px",
              overflow: "auto",
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
            }}
          >
            {JSON.stringify(tool.inputSchema, null, 2)}
          </Box>
        </Paper>
      </Box>
    );
  };

  if (connectedServers.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: "center" }}>
        <BuildIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Connected Servers
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Connect to an MCP server to view available tools
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Typography variant="h5" gutterBottom>
        Tools
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Execute tools from your connected MCP servers and control which tools
        are available to the AI assistant
      </Typography>

      {/* Server Selector */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Select Server</InputLabel>
        <Select
          value={selectedServerId || ""}
          onChange={(e) => onSelectServer(e.target.value)}
          label="Select Server"
        >
          {connectedServers.map((server) => (
            <MenuItem key={server.id} value={server.id}>
              {server.name} ({server.tools?.length || 0} tools)
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Tools Summary */}
      {tools.length > 0 && (
        <Paper
          sx={{ p: 2, mb: 3, backgroundColor: "rgba(255, 255, 255, 0.02)" }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <SettingsIcon sx={{ color: "primary.main" }} />
            <Typography variant="subtitle1">Tools Summary</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
            <Chip
              label={`${
                tools.filter((t) => t.enabled !== false).length
              } Enabled`}
              color="success"
              variant="outlined"
              size="small"
            />
            <Chip
              label={`${
                tools.filter((t) => t.enabled === false).length
              } Disabled`}
              color="default"
              variant="outlined"
              size="small"
            />
            <Chip
              label={`${
                tools.filter((t) => t.isSystemTool).length
              } System Tools`}
              color="secondary"
              variant="outlined"
              size="small"
            />
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: "block" }}
          >
            Only enabled tools will be available to the AI assistant for
            automated execution
          </Typography>
        </Paper>
      )}

      {/* Scrollable Tools Content */}
      <Box sx={{ flexGrow: 1, overflow: "auto" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : tools.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Tools Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This server doesn't expose any tools
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {tools.map((tool, index) => (
              <Card key={`${tool.name}-${index}`} variant="outlined">
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <CodeIcon sx={{ mr: 1, color: "primary.main" }} />
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {tool.name}
                    </Typography>

                    {/* Tool Status Indicators */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {tool.isSystemTool && (
                        <Chip
                          label="System"
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      )}

                      {/* Enable/Disable Toggle */}
                      {tool.serverId && (
                        <Tooltip
                          title={
                            tool.enabled !== false
                              ? "Disable tool for agent"
                              : "Enable tool for agent"
                          }
                        >
                          <FormControlLabel
                            control={
                              <Switch
                                checked={tool.enabled !== false}
                                onChange={() => handleToolToggle(tool)}
                                disabled={isToolToggling(tool)}
                                size="small"
                                color="primary"
                              />
                            }
                            label=""
                            sx={{ mr: 0 }}
                          />
                        </Tooltip>
                      )}

                      {isToolToggling(tool) && <CircularProgress size={16} />}
                    </Box>
                  </Box>

                  {/* Tool Status Message */}
                  {tool.enabled === false && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      This tool is disabled and won't be available to the AI
                      assistant
                    </Alert>
                  )}

                  {tool.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      {tool.description}
                    </Typography>
                  )}

                  {renderToolSchema(tool)}
                </CardContent>

                <CardActions sx={{ justifyContent: "space-between" }}>
                  <Button
                    startIcon={<PlayIcon />}
                    color="primary"
                    onClick={() => openExecuteDialog(tool)}
                  >
                    Execute
                  </Button>

                  <Chip
                    label={tool.enabled !== false ? "Enabled" : "Disabled"}
                    size="small"
                    color={tool.enabled !== false ? "success" : "default"}
                    variant="outlined"
                  />
                </CardActions>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

      {/* Execute Tool Dialog */}
      <Dialog
        open={executeDialogOpen}
        onClose={closeExecuteDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Execute Tool: {selectedTool?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {selectedTool?.description && (
              <Typography variant="body2" color="text.secondary">
                {selectedTool.description}
              </Typography>
            )}

            <TextField
              label="Arguments (JSON)"
              multiline
              rows={8}
              value={toolArgs}
              onChange={(e) => setToolArgs(e.target.value)}
              fullWidth
              sx={{
                "& .MuiInputBase-input": {
                  fontFamily: "monospace",
                  fontSize: "14px",
                },
              }}
            />

            {executionError && <Alert severity="error">{executionError}</Alert>}

            {executionResult && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Result:
                </Typography>
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: "rgba(34, 197, 94, 0.1)",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                  }}
                >
                  <Box
                    component="pre"
                    sx={{
                      margin: 0,
                      fontSize: "12px",
                      overflow: "auto",
                      fontFamily: "monospace",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {JSON.stringify(executionResult, null, 2)}
                  </Box>
                </Paper>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeExecuteDialog}>Close</Button>
          <Button
            onClick={handleExecuteTool}
            disabled={executing || !selectedTool}
            startIcon={
              executing ? <CircularProgress size={16} /> : <PlayIcon />
            }
            color="primary"
          >
            {executing ? "Executing..." : "Execute"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ToolsPanel;
