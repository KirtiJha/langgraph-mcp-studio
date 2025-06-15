import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
} from "@mui/material";
import {
  Description as DescriptionIcon,
  Visibility as ViewIcon,
  Link as LinkIcon,
} from "@mui/icons-material";
import { ServerStatus, Resource } from "../../shared/types";

interface ResourcesPanelProps {
  servers: ServerStatus[];
  selectedServerId: string | null;
  onSelectServer: (serverId: string) => void;
}

const ResourcesPanel: React.FC<ResourcesPanelProps> = ({
  servers,
  selectedServerId,
  onSelectServer,
}) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null
  );
  const [resourceContent, setResourceContent] = useState<any>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  const connectedServers = servers.filter((s) => s.connected);

  useEffect(() => {
    if (selectedServerId) {
      loadResources(selectedServerId);
    } else if (connectedServers.length > 0) {
      onSelectServer(connectedServers[0].id);
    }
  }, [selectedServerId, servers]);

  const loadResources = async (serverId: string) => {
    setLoading(true);
    try {
      const serverResources = await window.electronAPI.listResources(serverId);
      setResources(serverResources);
    } catch (error) {
      console.error("Failed to load resources:", error);
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewResource = async (resource: Resource) => {
    if (!selectedServerId) return;

    setSelectedResource(resource);
    setViewDialogOpen(true);
    setContentLoading(true);
    setContentError(null);
    setResourceContent(null);

    try {
      const content = await window.electronAPI.readResource(
        selectedServerId,
        resource.uri
      );
      setResourceContent(content);
    } catch (error: any) {
      setContentError(error.message || "Failed to read resource");
    } finally {
      setContentLoading(false);
    }
  };

  const closeViewDialog = () => {
    setViewDialogOpen(false);
    setSelectedResource(null);
    setResourceContent(null);
    setContentError(null);
  };

  const renderResourceContent = () => {
    if (contentLoading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (contentError) {
      return <Alert severity="error">{contentError}</Alert>;
    }

    if (!resourceContent) {
      return null;
    }

    // Handle different content types
    if (Array.isArray(resourceContent)) {
      return (
        <Stack spacing={2}>
          {resourceContent.map((content, index) => (
            <Paper
              key={index}
              sx={{
                p: 2,
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              {content.type === "text" ? (
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {content.text}
                </Typography>
              ) : (
                <pre style={{ margin: 0, fontSize: "12px", overflow: "auto" }}>
                  {JSON.stringify(content, null, 2)}
                </pre>
              )}
            </Paper>
          ))}
        </Stack>
      );
    }

    return (
      <Paper
        sx={{
          p: 2,
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <pre style={{ margin: 0, fontSize: "12px", overflow: "auto" }}>
          {JSON.stringify(resourceContent, null, 2)}
        </pre>
      </Paper>
    );
  };

  const getMimeTypeColor = (mimeType?: string) => {
    if (!mimeType) return "default";
    if (mimeType.startsWith("text/")) return "primary";
    if (mimeType.startsWith("application/json")) return "secondary";
    if (mimeType.startsWith("image/")) return "success";
    return "default";
  };

  if (connectedServers.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: "center" }}>
        <DescriptionIcon
          sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
        />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Connected Servers
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Connect to an MCP server to view available resources
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Resources
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Browse and view resources from your connected MCP servers
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
              {server.name} ({server.resources?.length || 0} resources)
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : resources.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Resources Available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This server doesn't expose any resources
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {resources.map((resource, index) => (
            <Card key={`${resource.uri}-${index}`} variant="outlined">
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <DescriptionIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    {resource.name || "Unnamed Resource"}
                  </Typography>
                  {resource.mimeType && (
                    <Chip
                      label={resource.mimeType}
                      size="small"
                      color={getMimeTypeColor(resource.mimeType) as any}
                    />
                  )}
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ display: "flex", alignItems: "center" }}
                  >
                    <LinkIcon sx={{ mr: 1, fontSize: "16px" }} />
                    {resource.uri}
                  </Typography>
                </Box>

                {resource.description && (
                  <Typography variant="body2" color="text.secondary">
                    {resource.description}
                  </Typography>
                )}
              </CardContent>

              <CardActions>
                <Button
                  startIcon={<ViewIcon />}
                  color="primary"
                  onClick={() => handleViewResource(resource)}
                >
                  View Content
                </Button>
              </CardActions>
            </Card>
          ))}
        </Stack>
      )}

      {/* View Resource Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={closeViewDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: "60vh" },
        }}
      >
        <DialogTitle>
          Resource: {selectedResource?.name || selectedResource?.uri}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {selectedResource && (
              <Box>
                <Typography variant="body2" color="text.secondary">
                  URI: {selectedResource.uri}
                </Typography>
                {selectedResource.mimeType && (
                  <Typography variant="body2" color="text.secondary">
                    Type: {selectedResource.mimeType}
                  </Typography>
                )}
                {selectedResource.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    {selectedResource.description}
                  </Typography>
                )}
              </Box>
            )}

            {renderResourceContent()}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeViewDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ResourcesPanel;
