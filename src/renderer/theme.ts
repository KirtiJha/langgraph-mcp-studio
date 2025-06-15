import { createTheme } from "@mui/material/styles";

// Modern, professional theme for MCP Studio
export const mcpStudioTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#6366f1", // Modern indigo
      light: "#8b5cf6",
      dark: "#4338ca",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#ec4899", // Modern pink accent
      light: "#f472b6",
      dark: "#be185d",
      contrastText: "#ffffff",
    },
    background: {
      default: "#0f0f0f", // Deep dark
      paper: "#1a1a1a", // Dark card background
    },
    surface: {
      main: "#262626", // Medium surface
      light: "#404040", // Light surface
      dark: "#171717", // Dark surface
    },
    text: {
      primary: "#f5f5f5", // Primary text - very light
      secondary: "#a3a3a3", // Secondary text - medium gray
      disabled: "#525252", // Disabled text - darker gray
    },
    divider: "#404040",
    success: {
      main: "#10b981",
      light: "#34d399",
      dark: "#047857",
    },
    warning: {
      main: "#f59e0b",
      light: "#fbbf24",
      dark: "#d97706",
    },
    error: {
      main: "#ef4444",
      light: "#f87171",
      dark: "#dc2626",
    },
    info: {
      main: "#3b82f6",
      light: "#60a5fa",
      dark: "#1d4ed8",
    },
  },
  typography: {
    fontFamily:
      '"Inter", "SF Pro Display", "Segoe UI", "Roboto", "Helvetica Neue", sans-serif',
    h1: {
      fontSize: "2.5rem",
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: "-0.025em",
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: "-0.02em",
    },
    h3: {
      fontSize: "1.75rem",
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: "-0.015em",
    },
    h4: {
      fontSize: "1.5rem",
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: "-0.01em",
    },
    h5: {
      fontSize: "1.25rem",
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: "-0.005em",
    },
    h6: {
      fontSize: "1.125rem",
      fontWeight: 600,
      lineHeight: 1.4,
    },
    subtitle1: {
      fontSize: "1rem",
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: "0.875rem",
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: "0.875rem",
      fontWeight: 400,
      lineHeight: 1.6,
    },
    body2: {
      fontSize: "0.8125rem",
      fontWeight: 400,
      lineHeight: 1.5,
    },
    caption: {
      fontSize: "0.75rem",
      fontWeight: 400,
      lineHeight: 1.4,
      color: "#a3a3a3",
    },
    overline: {
      fontSize: "0.75rem",
      fontWeight: 600,
      lineHeight: 1.4,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
    },
  },
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily:
            '"Inter", "SF Pro Display", "Segoe UI", "Roboto", "Helvetica Neue", sans-serif',
          backgroundColor: "#0f0f0f",
          color: "#f5f5f5",
          "-webkit-font-smoothing": "antialiased",
          "-moz-osx-font-smoothing": "grayscale",
        },
        "*::-webkit-scrollbar": {
          width: "8px",
        },
        "*::-webkit-scrollbar-track": {
          background: "#1a1a1a",
        },
        "*::-webkit-scrollbar-thumb": {
          background: "#404040",
          borderRadius: "4px",
        },
        "*::-webkit-scrollbar-thumb:hover": {
          background: "#525252",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
          fontSize: "0.875rem",
          borderRadius: "8px",
          padding: "8px 16px",
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0 4px 12px rgba(99, 102, 241, 0.15)",
          },
        },
        contained: {
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          "&:hover": {
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
          },
        },
        outlined: {
          borderColor: "#404040",
          color: "#f5f5f5",
          "&:hover": {
            borderColor: "#6366f1",
            backgroundColor: "rgba(99, 102, 241, 0.04)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: "#1a1a1a",
          border: "1px solid #262626",
          boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: "#1a1a1a",
          border: "1px solid #262626",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            backgroundColor: "#171717",
            borderRadius: "8px",
            "& fieldset": {
              borderColor: "#404040",
            },
            "&:hover fieldset": {
              borderColor: "#525252",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#6366f1",
              borderWidth: "2px",
            },
            "& input": {
              color: "#f5f5f5",
            },
            "& textarea": {
              color: "#f5f5f5",
            },
          },
          "& .MuiInputLabel-root": {
            color: "#a3a3a3",
            "&.Mui-focused": {
              color: "#6366f1",
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: "#171717",
          color: "#f5f5f5",
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          backgroundColor: "#1a1a1a",
          color: "#f5f5f5",
          "&:hover": {
            backgroundColor: "#262626",
          },
          "&.Mui-selected": {
            backgroundColor: "rgba(99, 102, 241, 0.12)",
            "&:hover": {
              backgroundColor: "rgba(99, 102, 241, 0.16)",
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: "#262626",
          color: "#f5f5f5",
          border: "1px solid #404040",
          "&:hover": {
            backgroundColor: "#404040",
          },
        },
        filled: {
          backgroundColor: "rgba(99, 102, 241, 0.12)",
          color: "#8b5cf6",
          border: "1px solid rgba(99, 102, 241, 0.24)",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: "8px",
          border: "1px solid",
        },
        standardError: {
          backgroundColor: "rgba(239, 68, 68, 0.12)",
          borderColor: "rgba(239, 68, 68, 0.24)",
          color: "#fca5a5",
        },
        standardWarning: {
          backgroundColor: "rgba(245, 158, 11, 0.12)",
          borderColor: "rgba(245, 158, 11, 0.24)",
          color: "#fcd34d",
        },
        standardInfo: {
          backgroundColor: "rgba(59, 130, 246, 0.12)",
          borderColor: "rgba(59, 130, 246, 0.24)",
          color: "#93c5fd",
        },
        standardSuccess: {
          backgroundColor: "rgba(16, 185, 129, 0.12)",
          borderColor: "rgba(16, 185, 129, 0.24)",
          color: "#6ee7b7",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontSize: "0.875rem",
          fontWeight: 500,
          color: "#a3a3a3",
          "&.Mui-selected": {
            color: "#6366f1",
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: "#6366f1",
          height: "3px",
          borderRadius: "3px",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: "#1a1a1a",
          border: "1px solid #262626",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: "1.25rem",
          fontWeight: 600,
          color: "#f5f5f5",
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: "8px",
          margin: "2px 0",
          "&:hover": {
            backgroundColor: "#262626",
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: "#a3a3a3",
          "&:hover": {
            backgroundColor: "rgba(99, 102, 241, 0.08)",
            color: "#6366f1",
          },
        },
      },
    },
  },
});

// Custom color palette extensions
declare module "@mui/material/styles" {
  interface Palette {
    surface: {
      main: string;
      light: string;
      dark: string;
    };
  }

  interface PaletteOptions {
    surface?: {
      main: string;
      light: string;
      dark: string;
    };
  }
}
