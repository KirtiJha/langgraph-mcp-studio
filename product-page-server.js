const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS for all routes
app.use(cors());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Route for the product page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route for health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'MCP Studio Product Page Server' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 MCP Studio Product Page Server running on http://localhost:${PORT}`);
    console.log(`📱 Open your browser and navigate to: http://localhost:${PORT}`);
});

module.exports = app;
