import React, { useState, useEffect } from 'react';
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
  TextField,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  PlayArrow as PlayIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import { ServerStatus, Prompt } from '../../shared/types';

interface PromptsPanelProps {
  servers: ServerStatus[];
  selectedServerId: string | null;
  onSelectServer: (serverId: string) => void;
}

const PromptsPanel: React.FC<PromptsPanelProps> = ({
  servers,
  selectedServerId,
  onSelectServer,
}) => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [promptArgs, setPromptArgs] = useState<Record<string, string>>({});
  const [promptResult, setPromptResult] = useState<any>(null);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  const connectedServers = servers.filter(s => s.connected);

  useEffect(() => {
    if (selectedServerId) {
      loadPrompts(selectedServerId);
    } else if (connectedServers.length > 0) {
      onSelectServer(connectedServers[0].id);
    }
  }, [selectedServerId, servers]);

  const loadPrompts = async (serverId: string) => {
    setLoading(true);
    try {
      const serverPrompts = await window.electronAPI.listPrompts(serverId);
      setPrompts(serverPrompts);
    } catch (error) {
      console.error('Failed to load prompts:', error);
      setPrompts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecutePrompt = async () => {
    if (!selectedPrompt || !selectedServerId) return;

    setExecuting(true);
    setPromptError(null);
    setPromptResult(null);

    try {
      const result = await window.electronAPI.getPrompt(
        selectedServerId,
        selectedPrompt.name,
        promptArgs
      );
      setPromptResult(result);
    } catch (error: any) {
      setPromptError(error.message || 'Failed to execute prompt');
    } finally {
      setExecuting(false);
    }
  };

  const openExecuteDialog = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    
    // Initialize prompt args based on the prompt's arguments
    const initialArgs: Record<string, string> = {};
    if (prompt.arguments) {
      prompt.arguments.forEach(arg => {
        initialArgs[arg.name] = '';
      });
    }
    setPromptArgs(initialArgs);
    
    setPromptResult(null);
    setPromptError(null);
    setExecuteDialogOpen(true);
  };

  const closeExecuteDialog = () => {
    setExecuteDialogOpen(false);
    setSelectedPrompt(null);
    setPromptArgs({});
    setPromptResult(null);
    setPromptError(null);
  };

  const handleArgChange = (argName: string, value: string) => {
    setPromptArgs(prev => ({
      ...prev,
      [argName]: value
    }));
  };

  const renderPromptArguments = (prompt: Prompt) => {
    if (!prompt.arguments || prompt.arguments.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          No arguments required
        </Typography>
      );
    }

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Arguments:
        </Typography>
        <Stack spacing={1}>
          {prompt.arguments.map((arg) => (
            <Box key={arg.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={arg.name}
                size="small"
                color={arg.required ? 'primary' : 'default'}
                variant={arg.required ? 'filled' : 'outlined'}
              />
              {arg.description && (
                <Typography variant="caption" color="text.secondary">
                  {arg.description}
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
      </Box>
    );
  };

  const renderPromptResult = () => {
    if (!promptResult) return null;

    return (
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Result:
        </Typography>
        
        {promptResult.messages && Array.isArray(promptResult.messages) ? (
          <Stack spacing={2}>
            {promptResult.messages.map((message: any, index: number) => (
              <Paper
                key={index}
                sx={{
                  p: 2,
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  {message.role}:
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {message.content}
                </Typography>
              </Paper>
            ))}
          </Stack>
        ) : (
          <Paper
            sx={{
              p: 2,
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
          >
            <pre style={{ margin: 0, fontSize: '12px', overflow: 'auto' }}>
              {JSON.stringify(promptResult, null, 2)}
            </pre>
          </Paper>
        )}
      </Box>
    );
  };

  if (connectedServers.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <AutoAwesomeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Connected Servers
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Connect to an MCP server to view available prompts
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Prompts
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Execute prompt templates from your connected MCP servers
      </Typography>

      {/* Server Selector */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Select Server</InputLabel>
        <Select
          value={selectedServerId || ''}
          onChange={(e) => onSelectServer(e.target.value)}
          label="Select Server"
        >
          {connectedServers.map((server) => (
            <MenuItem key={server.id} value={server.id}>
              {server.name} ({server.prompts?.length || 0} prompts)
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : prompts.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Prompts Available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This server doesn't expose any prompts
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {prompts.map((prompt, index) => (
            <Card key={`${prompt.name}-${index}`} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AutoAwesomeIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">{prompt.name}</Typography>
                </Box>
                
                {prompt.description && (
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {prompt.description}
                  </Typography>
                )}

                {renderPromptArguments(prompt)}
              </CardContent>

              <CardActions>
                <Button
                  startIcon={<PlayIcon />}
                  color="primary"
                  onClick={() => openExecuteDialog(prompt)}
                >
                  Execute
                </Button>
              </CardActions>
            </Card>
          ))}
        </Stack>
      )}

      {/* Execute Prompt Dialog */}
      <Dialog
        open={executeDialogOpen}
        onClose={closeExecuteDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Execute Prompt: {selectedPrompt?.name}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {selectedPrompt?.description && (
              <Typography variant="body2" color="text.secondary">
                {selectedPrompt.description}
              </Typography>
            )}

            {selectedPrompt?.arguments && selectedPrompt.arguments.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Arguments:
                </Typography>
                <Stack spacing={2}>
                  {selectedPrompt.arguments.map((arg) => (
                    <TextField
                      key={arg.name}
                      label={arg.name}
                      helperText={arg.description}
                      required={arg.required}
                      value={promptArgs[arg.name] || ''}
                      onChange={(e) => handleArgChange(arg.name, e.target.value)}
                      fullWidth
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {promptError && (
              <Alert severity="error">
                {promptError}
              </Alert>
            )}

            {renderPromptResult()}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeExecuteDialog}>Close</Button>
          <Button
            onClick={handleExecutePrompt}
            disabled={executing || !selectedPrompt}
            startIcon={executing ? <CircularProgress size={16} /> : <PlayIcon />}
            color="primary"
          >
            {executing ? 'Executing...' : 'Execute'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PromptsPanel;
