# Migration Guide: Socket.IO to Cloudflare Workers

This document outlines the migration from Socket.IO to Cloudflare Workers with Durable Objects and D1 database.

## Overview

The application has been successfully migrated from a traditional Node.js + Socket.IO backend to a modern serverless architecture using Cloudflare Workers. This migration provides several benefits:

- **Global Edge Network**: Reduced latency with Cloudflare's worldwide presence
- **Automatic Scaling**: No server management required
- **Persistent Storage**: D1 database for reliable data persistence
- **Cost Efficiency**: Pay-per-use pricing model
- **Enhanced Performance**: Durable Objects for stateful real-time applications

## What Changed

### Backend Architecture

**Before (Socket.IO):**
```
Client ↔ Socket.IO Server ↔ In-Memory State
```

**After (Cloudflare Workers):**
```
Client ↔ WebSocket (Workers) ↔ Durable Objects ↔ D1 Database
```

### Key Changes

1. **Real-time Communication**
   - **Before**: Socket.IO with custom events
   - **After**: Native WebSockets with JSON messages

2. **State Management**
   - **Before**: In-memory JavaScript objects
   - **After**: Durable Objects with D1 persistence

3. **Data Persistence**
   - **Before**: No persistence (data lost on restart)
   - **After**: D1 SQLite database with full persistence

4. **Deployment**
   - **Before**: Traditional server deployment
   - **After**: Serverless deployment to Cloudflare's edge

## API Compatibility

The frontend API remains **100% compatible**. All existing components work without changes:

```typescript
// These functions work exactly the same
import { 
  createRoom, 
  joinRoom, 
  vote, 
  revealVotes, 
  resetVotes,
  onUserJoined,
  onUserVoted,
  onVotesRevealed,
  onVotesReset
} from './socket';
```

## Data Structure Changes

### Vote History Enhancement

The vote history has been enhanced with more detailed information:

**Before:**
```typescript
interface RoomState {
  users: User[];
  revealed: boolean;
  winningVoteHistory: string[]; // Simple array of winning cards
}
```

**After:**
```typescript
interface RoomState {
  users: User[];
  revealed: boolean;
  winningVoteHistory: VoteHistoryEntry[]; // Detailed history entries
}

interface VoteHistoryEntry {
  id: string;
  votes: { name: string; vote: string | null; sessionId: string }[];
  participants: number;
  winningCard: string;
  winnerName?: string;
  timestamp: number;
}
```

## Environment Configuration

Update your environment variables:

**Before:**
```bash
# Socket.IO server URL
VITE_SOCKET_URL=http://localhost:3001
```

**After:**
```bash
# Cloudflare Workers URL
VITE_SOCKET_URL=http://localhost:8787  # Development
# or
VITE_SOCKET_URL=https://your-worker.workers.dev  # Production
```

## Development Workflow

**Before:**
```bash
# Start backend
cd server && npm run dev

# Start frontend
npm run dev
```

**After:**
```bash
# Start Cloudflare Workers
npm run workers:dev

# Start frontend
npm run dev
```

## Deployment Changes

**Before:**
- Deploy Node.js server to hosting provider
- Manage server infrastructure
- Handle scaling and load balancing

**After:**
```bash
# Deploy to Cloudflare Workers
npm run workers:deploy

# Frontend can be deployed to any static hosting
npm run build
```

## Benefits of Migration

1. **Performance**: Reduced latency with edge computing
2. **Reliability**: Built-in redundancy and failover
3. **Scalability**: Automatic scaling without configuration
4. **Cost**: Pay only for actual usage
5. **Maintenance**: No server management required
6. **Global**: Instant worldwide deployment

## Troubleshooting

### Common Issues

1. **WebSocket Connection Fails**
   - Check that Workers are running on port 8787
   - Verify CORS headers are properly set
   - Ensure WebSocket upgrade is handled correctly

2. **Database Errors**
   - Run migrations: `cd workers && npm run db:migrate`
   - Check D1 database configuration in wrangler.toml
   - Verify database ID is correct

3. **Room State Not Persisting**
   - Ensure D1 database is properly configured
   - Check Durable Objects are saving to database
   - Verify database permissions

### Getting Help

- Check the [README.md](README.md) for setup instructions
- Review Cloudflare Workers documentation
- Check the browser console for WebSocket errors
- Verify network connectivity to Workers endpoints

## Rollback Plan

If needed, the original Socket.IO implementation is preserved in:
- `src/socket.ts.bak` - Original Socket.IO client
- `server/` directory - Original Node.js server

To rollback:
1. Restore `src/socket.ts` from backup
2. Update package.json to include Socket.IO dependencies
3. Start the original server: `cd server && npm run dev` 