import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Force development mode if NODE_ENV is set to development in .env
  const isDev = env.NODE_ENV === 'development' || mode === 'development';
  
  console.log('🔧 Vite Config:', {
    mode,
    envNodeEnv: env.NODE_ENV,
    isDev,
    processNodeEnv: process.env.NODE_ENV
  });
  
  return {
    plugins: [react()],
    base: "./",
    root: path.resolve(__dirname, "src/renderer"),
    build: {
      outDir: path.resolve(__dirname, "dist/renderer"),
      emptyOutDir: true,
    },
    server: {
      port: 3000,
    },
    css: {
      postcss: path.resolve(__dirname, "postcss.config.js"),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src/renderer"),
      },
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(isDev ? "development" : "production"),
      "__DEV__": JSON.stringify(isDev),
    },
  };
});
