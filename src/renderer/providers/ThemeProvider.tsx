import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContext {
  theme: Theme;
  effectiveTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContext | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Load theme from localStorage or default to 'system'
    try {
      // First try to get theme from settings
      const savedSettings = localStorage.getItem("mcp-studio-settings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed?.general?.theme) {
          return parsed.general.theme;
        }
      }
      // Fallback to direct theme storage
      const savedTheme = localStorage.getItem("mcp-studio-theme") as Theme;
      return savedTheme || "system";
    } catch (error) {
      console.error("Failed to load theme from storage:", error);
      return "system";
    }
  });

  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">(
    "dark"
  );

  // Function to get system theme preference
  const getSystemTheme = (): "light" | "dark" => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  // Update effective theme when theme changes or system preference changes
  useEffect(() => {
    const updateEffectiveTheme = () => {
      let newEffectiveTheme: "light" | "dark";

      if (theme === "system") {
        newEffectiveTheme = getSystemTheme();
      } else {
        newEffectiveTheme = theme;
      }

      setEffectiveTheme(newEffectiveTheme);

      // Apply theme to document
      if (newEffectiveTheme === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      }
    };

    updateEffectiveTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        updateEffectiveTheme();
      }
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [theme]);

  // Save theme to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("mcp-studio-theme", theme);
  }, [theme]);

  const value: ThemeContext = {
    theme,
    effectiveTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
