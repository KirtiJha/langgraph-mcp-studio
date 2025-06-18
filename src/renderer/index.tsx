import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // Import Tailwind CSS

console.log("🚀 Starting React app...");

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("❌ Root element not found!");
  throw new Error("Root element not found");
}

console.log("✅ Root element found, creating React root...");

try {
  const root = ReactDOM.createRoot(rootElement);
  console.log("✅ React root created, rendering app...");

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  console.log("✅ App rendered successfully");
} catch (error) {
  console.error("❌ Error rendering React app:", error);
}
