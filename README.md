# Scrum Poker Application

A real-time Scrum Poker application built with React and powered by Cloudflare Workers with Durable Objects and D1 database.

## Features

- Real-time voting with WebSocket connections
- Persistent vote history stored in D1 database
- Room-based sessions with unique room IDs
- Automatic reconnection handling
- Dark/light theme support
- Responsive Material-UI design

## Architecture

This application has been migrated from Socket.IO to Cloudflare Workers:

- **Frontend**: React with TypeScript, Material-UI, and Vite
- **Backend**: Cloudflare Workers with Durable Objects for real-time state management
- **Database**: Cloudflare D1 (SQLite) for persistent storage
- **Real-time Communication**: WebSockets via Cloudflare Workers

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account (for deployment)
- Wrangler CLI

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install Cloudflare Workers dependencies
npm run workers:install
```

### 2. Set up Cloudflare Workers

```bash
# Install Wrangler CLI globally if not already installed
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create D1 database
cd workers
wrangler d1 create scrum-poker-db

# Update wrangler.toml with your database ID
# Copy the database_id from the output above and update wrangler.toml
```

### 3. Database Setup

```bash
# Run database migrations
cd workers
npm run db:migrate

# For local development, also run:
npm run db:migrate:local
```

### 4. Development

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account (for Workers deployment)

### Setup

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd scrum-poker
   ```

2. **Install dependencies:**

   ```bash
   npm install
   cd workers && npm install
   ```

3. **Configure environment (Important for CORS):**

   Copy the example environment file:

   ```bash
   cp env.example .env
   ```

   **For development**, we recommend using the deployed backend to avoid CORS issues:

   ```bash
   # .env
   VITE_SOCKET_URL=https://scrum-poker.rivera-family.workers.dev
   ```

   **Alternative**: If you want to run everything locally, you can use:

   ```bash
   # .env  
   VITE_SOCKET_URL=http://localhost:8787
   ```

   But note that this may cause CORS issues when the frontend tries to connect to the local Workers server.

4. **Deploy Cloudflare Workers (recommended first step):**

   ```bash
   cd workers
   wrangler login  # If not already logged in
   npm run deploy
   ```

5. **Start the development server:**

   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173` and will connect to either the deployed Workers (recommended) or local Workers at `http://localhost:8787`.

### Troubleshooting CORS Issues

If you encounter CORS errors like:

```bash
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at http://localhost:8787/api/rooms
```

This typically happens when:

1. The frontend is trying to connect to a local Workers server that doesn't have proper CORS headers
2. The environment variables are not properly set

**Solution**: Use the deployed backend for development by setting:

```bash
# .env
VITE_SOCKET_URL=https://scrum-poker.rivera-family.workers.dev
```

### Local Socket URL Configuration

The application automatically detects the appropriate API URL based on the environment:

```typescript
export const getSocketUrl = (): string => {
  // For development
  if (import.meta.env.DEV) {
    return 'https://scrum-poker.rivera-family.workers.dev';
  }
  
  // For production - replace with your deployed Workers URL
  return 'https://scrum-poker.rivera-family.workers.dev';
};
```

## Deployment

### Deploy Cloudflare Workers

```bash
cd workers

# Deploy to development environment
npm run deploy

# Deploy to production environment
npm run deploy:production
```

### Deploy Frontend

The frontend can be deployed to any static hosting service (Vercel, Netlify, Cloudflare Pages, etc.).

```bash
# Build the frontend
npm run build

# The dist/ folder contains the built application
```

## Migration from Socket.IO

This application has been successfully migrated from Socket.IO to Cloudflare Workers. The key changes include:

1. **Real-time Communication**: Replaced Socket.IO with native WebSockets via Cloudflare Workers
2. **State Management**: Moved from in-memory state to Durable Objects with D1 persistence
3. **Scalability**: Leveraged Cloudflare's global edge network for better performance
4. **Data Persistence**: Added proper database storage for vote history and room state

### API Compatibility

The frontend API remains the same, so existing components work without changes:

```typescript
import { createRoom, joinRoom, vote, revealVotes, resetVotes } from './socket';
```

## Project Structure

```plaintext
├── src/                    # Frontend React application
│   ├── components/         # React components
│   │   ├── cloudflare-client.ts # Cloudflare Workers client
│   │   └── socket.ts          # API compatibility layer
│   ├── workers/               # Cloudflare Workers
│   │   ├── src/
│   │   │   ├── index.ts       # Main worker entry point
│   │   │   ├── room-object.ts # Durable Object implementation
│   │   │   └── types.ts       # TypeScript types
│   │   └── migrations/        # D1 database migrations
│   └── wrangler.toml         # Cloudflare Workers configuration
└── wrangler.toml         # Cloudflare Workers configuration
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with both frontend and workers
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
