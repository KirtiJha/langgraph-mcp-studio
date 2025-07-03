import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { LogEntry } from "../../shared/types";

interface LogsContextType {
  logs: LogEntry[];
  addLog: (log: LogEntry) => void;
  setLogs: (logs: LogEntry[]) => void;
  clearLogs: () => void;
  loadLogs: () => Promise<void>;
  clearAllLogs: () => Promise<void>;
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

interface LogsProviderProps {
  children: ReactNode;
}

export const LogsProvider: React.FC<LogsProviderProps> = ({ children }) => {
  const [logs, setLogsState] = useState<LogEntry[]>([]);

  const addLog = (log: LogEntry) => {
    setLogsState((prev) => [...prev, log]);
  };

  const setLogs = (logs: LogEntry[]) => {
    setLogsState(logs);
  };

  const clearLogs = () => {
    setLogsState([]);
  };

  const loadLogs = async () => {
    try {
      if (!window.electronAPI) {
        console.warn(
          "ElectronAPI not available - logs not accessible in browser mode"
        );
        return;
      }
      const logs = await (window as any).electronAPI.getLogs();
      setLogsState(logs);
    } catch (error) {
      console.error("Failed to load logs:", error);
    }
  };

  const clearAllLogs = async () => {
    try {
      await (window as any).electronAPI.clearLogs();
      setLogsState([]);
    } catch (error) {
      console.error("Failed to clear logs:", error);
    }
  };

  // Load logs on mount
  useEffect(() => {
    loadLogs();
  }, []);

  // Listen for new log events
  useEffect(() => {
    const unsubscribe = (window as any).electronAPI.on(
      "log-event",
      (logEntry: LogEntry) => {
        addLog(logEntry);
      }
    );

    const unsubscribeClear = (window as any).electronAPI.on(
      "clear-logs",
      () => {
        clearLogs();
      }
    );

    return () => {
      unsubscribe();
      unsubscribeClear();
    };
  }, []);

  const value: LogsContextType = {
    logs,
    addLog,
    setLogs,
    clearLogs,
    loadLogs,
    clearAllLogs,
  };

  return <LogsContext.Provider value={value}>{children}</LogsContext.Provider>;
};

export const useLogsStore = () => {
  const context = useContext(LogsContext);
  if (context === undefined) {
    throw new Error("useLogsStore must be used within a LogsProvider");
  }
  return context;
};
