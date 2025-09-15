/**
 * Health Check Script for MCP Server
 */

const http = require('http');

const options = {
    hostname: 'localhost',
    port: process.env.MCP_PORT || 8080,
    path: '/health',
    timeout: 3000,
    method: 'GET'
};

const request = http.request(options, (res) => {
    if (res.statusCode === 200) {
        console.log('MCP Server health check passed');
        process.exit(0);
    } else {
        console.log(`MCP Server health check failed with status: ${res.statusCode}`);
        process.exit(1);
    }
});

request.on('error', (err) => {
    console.log(`MCP Server health check failed: ${err.message}`);
    process.exit(1);
});

request.on('timeout', () => {
    console.log('MCP Server health check timed out');
    request.destroy();
    process.exit(1);
});

request.end();