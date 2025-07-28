import React from "react";
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Tooltip,
  Stack,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as DisconnectedIcon,
  Build as BuildIcon,
  Description as DescriptionIcon,
  AutoAwesome as AutoAwesomeIcon,
} from "@mui/icons-material";
import { ServerStatus, ServerConfig } from "../../shared/types";

interface ServerListProps {
  servers: ServerStatus[];
  onConnect: (serverId: string) => void;
  onDisconnect: (serverId: string) => void;
  onRemove: (serverId: string) => void;
  onEdit: (serverId: string) => void;
  onSelect: (serverId: string) => void;
  selectedServerId: string | null;
  connectingServers?: Set<string>;
}

const ServerList: React.FC<ServerListProps> = ({
  servers,
  onConnect,
  onDisconnect,
  onRemove,
  onEdit,
  onSelect,
  selectedServerId,
  connectingServers = new Set(),
}) => {
  const renderStatusIcon = (server: ServerStatus) => {
    if (server.error) {
      return <ErrorIcon color="error" />;
    }
    if (server.connected) {
      return <CheckCircleIcon color="success" />;
    }
    return <DisconnectedIcon color="disabled" />;
  };

  const renderServerStats = (server: ServerStatus) => {
    const stats = [
      { label: "Tools", count: server.tools?.length || 0, icon: <BuildIcon /> },
      {
        label: "Resources",
        count: server.resources?.length || 0,
        icon: <DescriptionIcon />,
      },
      {
        label: "Prompts",
        count: server.prompts?.length || 0,
        icon: <AutoAwesomeIcon />,
      },
    ];

    return (
      <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
        {stats.map((stat) => (
          <Chip
            key={stat.label}
            icon={stat.icon}
            label={`${stat.count} ${stat.label}`}
            size="small"
            variant="outlined"
            color={stat.count > 0 ? "primary" : "default"}
          />
        ))}
      </Stack>
    );
  };

  if (servers.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No MCP Servers
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add your first MCP server to get started
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        MCP Servers
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Manage your Model Context Protocol servers
      </Typography>

      <Stack spacing={2}>
        {servers.map((server) => (
          <Card
            key={server.id}
            variant="outlined"
            sx={{
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
              border: selectedServerId === server.id ? 2 : 1,
              borderColor:
                selectedServerId === server.id ? "primary.main" : "divider",
              "&:hover": {
                borderColor: "primary.main",
                boxShadow: 2,
              },
            }}
            onClick={() => onSelect(server.id)}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                {renderStatusIcon(server)}
                <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
                  {server.name}
                </Typography>
                <Chip
                  label={server.connected ? "Connected" : "Disconnected"}
                  color={server.connected ? "success" : "default"}
                  size="small"
                />
              </Box>

              {server.error && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="error">
                    Error: {server.error}
                  </Typography>
                </Box>
              )}

              {server.connected && renderServerStats(server)}
            </CardContent>

            <CardActions>
              <Stack direction="row" spacing={1} sx={{ flexGrow: 1 }}>
                {server.connected ? (
                  <Tooltip title="Disconnect">
                    <Button
                      startIcon={
                        connectingServers.has(server.id) ? (
                          <CircularProgress size={16} />
                        ) : (
                          <StopIcon />
                        )
                      }
                      color="warning"
                      disabled={connectingServers.has(server.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDisconnect(server.id);
                      }}
                    >
                      {connectingServers.has(server.id)
                        ? "Disconnecting..."
                        : "Disconnect"}
                    </Button>
                  </Tooltip>
                ) : (
                  <Tooltip title="Connect">
                    <Button
                      startIcon={
                        connectingServers.has(server.id) ? (
                          <CircularProgress size={16} />
                        ) : (
                          <PlayIcon />
                        )
                      }
                      color="primary"
                      disabled={connectingServers.has(server.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onConnect(server.id);
                      }}
                    >
                      {connectingServers.has(server.id)
                        ? "Connecting..."
                        : "Connect"}
                    </Button>
                  </Tooltip>
                )}

                <Tooltip title="Edit Configuration">
                  <IconButton
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(server.id);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Remove Server">
                  <IconButton
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(server.id);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </CardActions>
          </Card>
        ))}
      </Stack>
    </Box>
  );
};

export default ServerList;
