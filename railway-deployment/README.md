# QuantumMycelium Nexus API

Backend API for the QuantumMycelium Nexus platform - quantum-enhanced mycelial network computations.

## Features

- **Quantum Circuit Simulation** - Full quantum state vector simulation
- **Mycelium-EI Language** - Custom language for biological network programming
- **User Authentication** - JWT + GitHub OAuth integration
- **Circuit Management** - Save, load, and share quantum circuits
- **Network Simulation** - Quantum-enhanced biological network modeling

## API Endpoints

### Authentication
- `POST /api/auth/session` - Create anonymous session
- `POST /api/auth/github` - GitHub OAuth authentication
- `GET /api/auth/verify` - Verify JWT token

### Quantum Simulation
- `POST /api/quantum/simulate` - Simulate quantum circuits
- `POST /api/quantum/bell-state` - Create Bell states

### Circuit Management
- `POST /api/circuits` - Save quantum circuit
- `GET /api/circuits` - Get user's circuits
- `GET /api/circuits/:id` - Get specific circuit
- `GET /api/circuits/examples` - Get example circuits

### Mycelium-EI Language
- `POST /api/mycelium/compile` - Compile Mycelium-EI code
- `GET /api/mycelium/examples` - Get code examples
- `POST /api/mycelium/syntax-highlight` - Syntax highlighting

### Network Simulation
- `POST /api/simulation/mycelium` - Run network simulations
- `POST /api/simulation/quantum-network` - Quantum-enhanced networks
- `GET /api/simulation/growth-patterns` - Get growth patterns

## Deployment

### Railway.app

1. Connect your GitHub repository to Railway
2. Set environment variables (see `.env.example`)
3. Deploy automatically on git push

### Environment Variables

```env
PORT=3000
NODE_ENV=production
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
JWT_SECRET=your_jwt_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### Local Development

```bash
npm install
npm run dev
```

API will be available at `http://localhost:3000`

## Documentation

Interactive API documentation available at `/api-docs` when running.

## Architecture

- **Express.js** - Web framework
- **Supabase** - Database and authentication
- **JWT** - Session management
- **Swagger** - API documentation
- **Custom Quantum Simulator** - State vector simulation
- **Mycelium-EI Compiler** - Domain-specific language

## License

MIT License - See LICENSE file for details.