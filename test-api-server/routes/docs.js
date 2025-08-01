const express = require("express");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const router = express.Router();

// Serve OpenAPI JSON specification
router.get("/openapi.json", (req, res) => {
  try {
    const yamlPath = path.join(__dirname, "../openapi.yaml");
    const yamlContent = fs.readFileSync(yamlPath, "utf8");
    const openApiSpec = yaml.load(yamlContent);

    // Update server URL based on request
    const protocol = req.get("x-forwarded-proto") || req.protocol;
    const host = req.get("host");
    const baseUrl = `${protocol}://${host}`;

    openApiSpec.servers = [
      {
        url: baseUrl,
        description: "Current server",
      },
      {
        url: "http://localhost:3001",
        description: "Development server",
      },
    ];

    res.json(openApiSpec);
  } catch (error) {
    res.status(500).json({
      error: "Failed to load OpenAPI specification",
      message: error.message,
    });
  }
});

// Serve OpenAPI YAML specification
router.get("/openapi.yaml", (req, res) => {
  try {
    const yamlPath = path.join(__dirname, "../openapi.yaml");
    const yamlContent = fs.readFileSync(yamlPath, "utf8");

    res.setHeader("Content-Type", "text/yaml");
    res.send(yamlContent);
  } catch (error) {
    res.status(500).json({
      error: "Failed to load OpenAPI specification",
      message: error.message,
    });
  }
});

// API Documentation
router.get("/docs", (req, res) => {
  const protocol = req.get("x-forwarded-proto") || req.protocol;
  const host = req.get("host");
  const baseUrl = `${protocol}://${host}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>MCP Test API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
    <style>
        html {
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
        }
        *, *:before, *:after {
            box-sizing: inherit;
        }
        body {
            margin:0;
            background: #fafafa;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: '${baseUrl}/openapi.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout"
            });
        };
    </script>
</body>
</html>`;

  res.send(html);
});

module.exports = router;
