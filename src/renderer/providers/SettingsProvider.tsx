import React, { createContext, useContext, useEffect, useState } from "react";

export interface AppSettings {
  general: {
    autoStart: boolean;
    minimizeToTray: boolean;
    closeToTray: boolean;
    checkUpdates: boolean;
    theme: "light" | "dark" | "system";
    language: string;
    showWelcomeScreen: boolean;
    confirmExit: boolean;
  };
  serverStorage: {
    customPath: string;
    useCustomPath: boolean;
    autoCleanup: boolean;
    maxStorageSize: number; // in MB
  };
  notifications: {
    serverStatus: boolean;
    toolExecution: boolean;
    errors: boolean;
    updates: boolean;
    connectionIssues: boolean;
    showDesktopNotifications: boolean;
    playNotificationSounds: boolean;
  };
  security: {
    requireConfirmation: boolean;
    allowFileAccess: boolean;
    allowNetworkAccess: boolean;
    logLevel: "debug" | "info" | "warn" | "error";
    maxLogSize: number;
    enableSandboxMode: boolean;
    allowedDirectories: string[];
    blockedCommands: string[];
  };
  appearance: {
    fontSize: "small" | "medium" | "large";
    fontFamily: "system" | "mono" | "serif";
    accentColor: string;
    windowOpacity: number;
    compactMode: boolean;
    showLineNumbers: boolean;
    enableAnimations: boolean;
    sidebarWidth: number;
  };
  advanced: {
    enableDebugMode: boolean;
    maxConcurrentConnections: number;
    connectionTimeout: number;
    retryAttempts: number;
    enableTelemetry: boolean;
    customCSSPath: string;
    enableExperimentalFeatures: boolean;
  };
}

const defaultSettings: AppSettings = {
  general: {
    autoStart: false,
    minimizeToTray: true,
    closeToTray: false,
    checkUpdates: true,
    theme: "system",
    language: "en",
    showWelcomeScreen: true,
    confirmExit: true,
  },
  serverStorage: {
    customPath: "",
    useCustomPath: false,
    autoCleanup: false,
    maxStorageSize: 500, // 500MB default
  },
  notifications: {
    serverStatus: true,
    toolExecution: true,
    errors: true,
    updates: true,
    connectionIssues: true,
    showDesktopNotifications: true,
    playNotificationSounds: false,
  },
  security: {
    requireConfirmation: true,
    allowFileAccess: false,
    allowNetworkAccess: true,
    logLevel: "info",
    maxLogSize: 100, // MB
    enableSandboxMode: true,
    allowedDirectories: [],
    blockedCommands: ["rm", "rmdir", "del", "format"],
  },
  appearance: {
    fontSize: "medium",
    fontFamily: "system",
    accentColor: "#6366f1",
    windowOpacity: 100,
    compactMode: false,
    showLineNumbers: true,
    enableAnimations: true,
    sidebarWidth: 256,
  },
  advanced: {
    enableDebugMode: false,
    maxConcurrentConnections: 10,
    connectionTimeout: 30000,
    retryAttempts: 3,
    enableTelemetry: false,
    customCSSPath: "",
    enableExperimentalFeatures: false,
  },
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (
    section: keyof AppSettings,
    updates: Partial<AppSettings[keyof AppSettings]>
  ) => void;
  resetSettings: (section?: keyof AppSettings) => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};

interface SettingsProviderProps {
  children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
}) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const savedSettings = localStorage.getItem("mcp-studio-settings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        // Merge with defaults to ensure all properties exist
        return {
          ...defaultSettings,
          ...parsed,
          general: { ...defaultSettings.general, ...parsed.general },
          notifications: {
            ...defaultSettings.notifications,
            ...parsed.notifications,
          },
          security: { ...defaultSettings.security, ...parsed.security },
          appearance: { ...defaultSettings.appearance, ...parsed.appearance },
          advanced: { ...defaultSettings.advanced, ...parsed.advanced },
        };
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
    return defaultSettings;
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("mcp-studio-settings", JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }, [settings]);

  const updateSettings = (
    section: keyof AppSettings,
    updates: Partial<AppSettings[keyof AppSettings]>
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...updates,
      },
    }));
  };

  const resetSettings = (section?: keyof AppSettings) => {
    if (section) {
      setSettings((prev) => ({
        ...prev,
        [section]: defaultSettings[section],
      }));
    } else {
      setSettings(defaultSettings);
    }
  };

  const exportSettings = () => {
    return JSON.stringify(settings, null, 2);
  };

  const importSettings = (settingsJson: string): boolean => {
    try {
      const parsed = JSON.parse(settingsJson);
      // Validate structure
      if (typeof parsed === "object" && parsed !== null) {
        setSettings({
          ...defaultSettings,
          ...parsed,
          general: { ...defaultSettings.general, ...parsed.general },
          notifications: {
            ...defaultSettings.notifications,
            ...parsed.notifications,
          },
          security: { ...defaultSettings.security, ...parsed.security },
          appearance: { ...defaultSettings.appearance, ...parsed.appearance },
          advanced: { ...defaultSettings.advanced, ...parsed.advanced },
        });
        return true;
      }
    } catch (error) {
      console.error("Failed to import settings:", error);
    }
    return false;
  };

  const value: SettingsContextType = {
    settings,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
