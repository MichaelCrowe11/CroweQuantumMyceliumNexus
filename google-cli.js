#!/usr/bin/env node

/**
 * CroweQuantumMyceliumNexus Google API CLI
 * Interactive command-line interface for Google API integration
 */

const readline = require('readline');
const https = require('https');
const http = require('http');

const API_BASE_URL = 'http://localhost:8300/api/google';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Helper function to make API requests
function apiRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Display banner
function displayBanner() {
  console.clear();
  console.log(`${colors.cyan}${colors.bright}
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║     🌐 CroweQuantumMyceliumNexus Google API CLI                 ║
║     Integrated Google Cloud Services Interface                  ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
${colors.reset}`);
}

// Display main menu
function displayMenu() {
  console.log(`\n${colors.green}Available Commands:${colors.reset}

${colors.cyan}[Maps & Location]${colors.reset}
  1. geocode <address>         - Get coordinates for an address
  2. elevation <lat,lng>       - Get elevation data
  3. place <placeId>          - Get place details

${colors.cyan}[Environmental Analysis]${colors.reset}
  4. analyze-zone <lat> <lng>  - Analyze environmental zone
  5. hotspots                  - Get environmental hotspots
  6. satellite-tracking        - Track satellites in real-time

${colors.cyan}[Data Management]${colors.reset}
  7. store-mycelium <json>     - Store mycelium data
  8. get-mycelium              - Retrieve mycelium data
  9. query <sql>               - Query BigQuery dataset

${colors.cyan}[IoT & Sensors]${colors.reset}
  10. list-devices             - List IoT devices
  11. publish <topic> <data>   - Publish to Pub/Sub topic

${colors.cyan}[Vision & AI]${colors.reset}
  12. analyze-image <path>     - Analyze image with Vision API

${colors.cyan}[Storage]${colors.reset}
  13. upload <file> <content>  - Upload to Cloud Storage
  14. download <file>          - Download from Cloud Storage

${colors.cyan}[System]${colors.reset}
  15. status                   - Check Google API status
  16. help                     - Show this menu
  17. clear                    - Clear screen
  18. exit                     - Exit CLI

${colors.yellow}Type a command to continue...${colors.reset}`);
}

// Process commands
async function processCommand(input) {
  const [command, ...args] = input.trim().split(' ');

  try {
    switch(command.toLowerCase()) {
      case '1':
      case 'geocode':
        if (args.length === 0) {
          console.log(`${colors.red}Error: Address required${colors.reset}`);
          break;
        }
        const address = args.join(' ');
        console.log(`${colors.yellow}Geocoding: ${address}...${colors.reset}`);
        const geocodeResult = await apiRequest('/geocode', 'POST', { address });
        console.log(`${colors.green}Result:${colors.reset}`, JSON.stringify(geocodeResult, null, 2));
        break;

      case '2':
      case 'elevation':
        if (args.length === 0) {
          console.log(`${colors.red}Error: Coordinates required (format: lat,lng)${colors.reset}`);
          break;
        }
        console.log(`${colors.yellow}Getting elevation...${colors.reset}`);
        const elevResult = await apiRequest('/elevation', 'POST', { locations: args[0] });
        console.log(`${colors.green}Result:${colors.reset}`, JSON.stringify(elevResult, null, 2));
        break;

      case '3':
      case 'place':
        if (args.length === 0) {
          console.log(`${colors.red}Error: Place ID required${colors.reset}`);
          break;
        }
        console.log(`${colors.yellow}Getting place details...${colors.reset}`);
        const placeResult = await apiRequest(`/place/${args[0]}`);
        console.log(`${colors.green}Result:${colors.reset}`, JSON.stringify(placeResult, null, 2));
        break;

      case '4':
      case 'analyze-zone':
        if (args.length < 2) {
          console.log(`${colors.red}Error: Latitude and longitude required${colors.reset}`);
          break;
        }
        console.log(`${colors.yellow}Analyzing environmental zone...${colors.reset}`);
        const zoneResult = await apiRequest('/analyze/zone', 'POST', {
          latitude: parseFloat(args[0]),
          longitude: parseFloat(args[1])
        });
        console.log(`${colors.green}Environmental Analysis:${colors.reset}`);
        console.log(JSON.stringify(zoneResult, null, 2));
        break;

      case '5':
      case 'hotspots':
        console.log(`${colors.yellow}Fetching environmental hotspots...${colors.reset}`);
        const hotspots = await apiRequest('/hotspots');
        console.log(`${colors.green}Hotspots:${colors.reset}`);
        console.log(JSON.stringify(hotspots, null, 2));
        break;

      case '6':
      case 'satellite-tracking':
        console.log(`${colors.yellow}Tracking satellites...${colors.reset}`);
        const satellites = await apiRequest('/satellite/tracking');
        console.log(`${colors.green}Satellite Positions:${colors.reset}`);
        if (satellites.satellites) {
          satellites.satellites.forEach(sat => {
            console.log(`\n${colors.cyan}${sat.id}${colors.reset}`);
            console.log(`  Position: ${sat.position.lat.toFixed(4)}°, ${sat.position.lng.toFixed(4)}°`);
            console.log(`  Altitude: ${(sat.position.alt / 1000).toFixed(0)} km`);
            console.log(`  Status: ${colors.green}${sat.status}${colors.reset}`);
            console.log(`  Next Pass: ${new Date(sat.nextPass).toLocaleString()}`);
          });
        }
        break;

      case '7':
      case 'store-mycelium':
        if (args.length === 0) {
          console.log(`${colors.red}Error: JSON data required${colors.reset}`);
          break;
        }
        console.log(`${colors.yellow}Storing mycelium data...${colors.reset}`);
        const storeData = JSON.parse(args.join(' '));
        const storeResult = await apiRequest('/firestore/mycelium', 'POST', { data: storeData });
        console.log(`${colors.green}Result:${colors.reset}`, storeResult);
        break;

      case '8':
      case 'get-mycelium':
        console.log(`${colors.yellow}Retrieving mycelium data...${colors.reset}`);
        const getData = await apiRequest('/firestore/mycelium');
        console.log(`${colors.green}Mycelium Data:${colors.reset}`);
        console.log(JSON.stringify(getData, null, 2));
        break;

      case '9':
      case 'query':
        if (args.length === 0) {
          console.log(`${colors.red}Error: SQL query required${colors.reset}`);
          break;
        }
        console.log(`${colors.yellow}Executing BigQuery...${colors.reset}`);
        const queryResult = await apiRequest('/bigquery/query', 'POST', { query: args.join(' ') });
        console.log(`${colors.green}Query Results:${colors.reset}`, queryResult);
        break;

      case '10':
      case 'list-devices':
        console.log(`${colors.yellow}Listing IoT devices...${colors.reset}`);
        const devices = await apiRequest('/iot/devices');
        console.log(`${colors.green}IoT Devices:${colors.reset}`, devices);
        break;

      case '11':
      case 'publish':
        if (args.length < 2) {
          console.log(`${colors.red}Error: Topic and data required${colors.reset}`);
          break;
        }
        console.log(`${colors.yellow}Publishing to Pub/Sub...${colors.reset}`);
        const pubResult = await apiRequest('/pubsub/publish', 'POST', {
          topic: args[0],
          data: JSON.parse(args.slice(1).join(' '))
        });
        console.log(`${colors.green}Result:${colors.reset}`, pubResult);
        break;

      case '12':
      case 'analyze-image':
        if (args.length === 0) {
          console.log(`${colors.red}Error: Image path required${colors.reset}`);
          break;
        }
        console.log(`${colors.yellow}Analyzing image...${colors.reset}`);
        const visionResult = await apiRequest('/vision/analyze', 'POST', { imagePath: args[0] });
        console.log(`${colors.green}Vision Analysis:${colors.reset}`, visionResult);
        break;

      case '13':
      case 'upload':
        if (args.length < 2) {
          console.log(`${colors.red}Error: Filename and content required${colors.reset}`);
          break;
        }
        console.log(`${colors.yellow}Uploading to Cloud Storage...${colors.reset}`);
        const uploadResult = await apiRequest('/storage/upload', 'POST', {
          fileName: args[0],
          content: args.slice(1).join(' ')
        });
        console.log(`${colors.green}Result:${colors.reset}`, uploadResult);
        break;

      case '14':
      case 'download':
        if (args.length === 0) {
          console.log(`${colors.red}Error: Filename required${colors.reset}`);
          break;
        }
        console.log(`${colors.yellow}Downloading from Cloud Storage...${colors.reset}`);
        const downloadResult = await apiRequest(`/storage/download/${args[0]}`);
        console.log(`${colors.green}File Content:${colors.reset}`, downloadResult);
        break;

      case '15':
      case 'status':
        console.log(`${colors.yellow}Checking Google API status...${colors.reset}`);
        const status = await apiRequest('/status');
        console.log(`\n${colors.green}Google API Status:${colors.reset}`);
        console.log(`Initialized: ${status.initialized ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`);
        console.log(`\n${colors.cyan}Services:${colors.reset}`);
        Object.entries(status.services).forEach(([service, enabled]) => {
          console.log(`  ${service}: ${enabled ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`);
        });
        console.log(`\n${colors.cyan}Configuration:${colors.reset}`);
        console.log(`  Project ID: ${status.configuration.projectId}`);
        console.log(`  Has Credentials: ${status.configuration.hasCredentials ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`);
        console.log(`  Has Maps Key: ${status.configuration.hasMapsKey ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`);
        break;

      case '16':
      case 'help':
        displayMenu();
        break;

      case '17':
      case 'clear':
        displayBanner();
        displayMenu();
        break;

      case '18':
      case 'exit':
      case 'quit':
        console.log(`${colors.green}Goodbye!${colors.reset}`);
        process.exit(0);
        break;

      default:
        console.log(`${colors.red}Unknown command: ${command}${colors.reset}`);
        console.log(`Type 'help' for available commands`);
    }
  } catch (error) {
    console.log(`${colors.red}Error: ${error.message}${colors.reset}`);
  }
}

// Main CLI loop
async function main() {
  displayBanner();

  // Check server status
  console.log(`${colors.yellow}Connecting to backend server...${colors.reset}`);
  try {
    const status = await apiRequest('/status');
    console.log(`${colors.green}✓ Connected to CroweQuantumMyceliumNexus Backend${colors.reset}`);
    console.log(`${colors.dim}Google APIs: ${status.initialized ? 'Initialized' : 'Partially Initialized'}${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}✗ Cannot connect to backend server${colors.reset}`);
    console.log(`${colors.yellow}Make sure the backend is running on port 8300${colors.reset}`);
    console.log(`${colors.dim}Run: cd backend && npm start${colors.reset}`);
  }

  displayMenu();

  // Start interactive prompt
  const prompt = () => {
    rl.question(`\n${colors.cyan}google-cli>${colors.reset} `, async (input) => {
      if (input.trim()) {
        await processCommand(input);
      }
      prompt();
    });
  };

  prompt();
}

// Handle exit
process.on('SIGINT', () => {
  console.log(`\n${colors.green}Goodbye!${colors.reset}`);
  process.exit(0);
});

// Start CLI
main();