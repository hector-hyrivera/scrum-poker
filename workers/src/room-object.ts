import { 
  User, 
  RoomState, 
  VoteHistoryEntry, 
  WebSocketMessage, 
  Env,
  RoomRow,
  UserRow,
  VoteHistoryRow
} from './types';

/**
 * Durable Object that manages a single room's state and WebSocket connections.
 */
export class RoomObject {
  private state: DurableObjectState;
  private env: Env;
  private sessions: Map<WebSocket, { userId: string; sessionId: string }> = new Map();
  private users: Map<string, User> = new Map();
  private revealed: boolean = false;
  private roomId: string = '';
  private isProcessingReveal: boolean = false;
  private isProcessingReset: boolean = false;

  constructor(state: DurableObjectState, env: Env) {
    console.log('RoomObject constructor called for room:', state.id.toString());
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    this.users = new Map();
    this.revealed = false;
    this.roomId = '';
    this.isProcessingReveal = false;
    this.isProcessingReset = false;
  }

  /**
   * Handles HTTP requests to the Durable Object.
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const roomId = url.pathname.split('/')[2];
    this.roomId = roomId;

    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // Handle HTTP API requests
    if (request.method === 'POST') {
      return this.handleApiRequest(request);
    }

    return new Response('Not found', { status: 404 });
  }

  /**
   * Handles WebSocket connections for real-time communication.
   */
  private async handleWebSocket(request: Request): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    server.accept();

    server.addEventListener('message', async (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data as string);
        await this.handleWebSocketMessage(server, message);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        server.send(JSON.stringify({ type: 'error', data: 'Invalid message format' }));
      }
    });

    server.addEventListener('close', () => {
      this.handleDisconnect(server);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Handles WebSocket messages from clients.
   */
  private async handleWebSocketMessage(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    switch (message.type) {
      case 'join':
        await this.handleJoin(ws, message.data);
        break;
      case 'vote':
        await this.handleVote(ws, message.data);
        break;
      case 'reveal':
        await this.handleReveal(ws, message.data);
        break;
      case 'reset':
        await this.handleReset(ws);
        break;
      case 'ping':
        // Respond to ping with pong for heartbeat
        ws.send(JSON.stringify({ 
          type: 'pong', 
          data: { timestamp: message.data?.timestamp || Date.now() } 
        }));
        break;
      default:
        ws.send(JSON.stringify({ type: 'error', data: 'Unknown message type' }));
    }
  }

  /**
   * Handles user joining a room.
   */
  private async handleJoin(ws: WebSocket, data: { name: string; sessionId: string }): Promise<void> {
    const { name, sessionId } = data;
    
    // Load room state from database only if not already loaded
    if (this.users.size === 0) {
      await this.loadRoomState();
    }

    // Check if user already exists (reconnection)
    let user = Array.from(this.users.values()).find(u => u.sessionId === sessionId);
    
    if (user) {
      // User is reconnecting - keep existing user ID and data
      // Remove the old user entry if it exists with a different key
      const existingKey = Array.from(this.users.entries()).find(([key, u]) => u.sessionId === sessionId)?.[0];
      if (existingKey && existingKey !== user.id) {
        this.users.delete(existingKey);
      }
      this.users.set(user.id, user);
    } else {
      // Check if name is taken by any user currently in memory or active sessions
      const activeUserIds = new Set(Array.from(this.sessions.values()).map(session => session.userId));
      const activeUsers = Array.from(this.users.values()).filter(u => activeUserIds.has(u.id));
      const nameExists = activeUsers.some(u => u.name === name && u.sessionId !== sessionId);
      
      if (nameExists) {
        ws.send(JSON.stringify({ type: 'nameTaken' }));
        return;
      }

      // Create new user
      user = {
        id: this.generateUserId(),
        name,
        vote: null,
        sessionId
      };
      this.users.set(user.id, user);
    }

    // Store session
    this.sessions.set(ws, { userId: user.id, sessionId });

    // Save user to database
    await this.saveUserToDatabase(user);

    // Send current state to the joining user
    const roomState = await this.getRoomState();
    ws.send(JSON.stringify({ type: 'userJoined', data: roomState }));

    // Broadcast to all other users
    this.broadcast({ type: 'userJoined', data: roomState }, ws);
  }

  /**
   * Handles user voting.
   */
  private async handleVote(ws: WebSocket, data: { vote: string }): Promise<void> {
    const session = this.sessions.get(ws);
    if (!session) return;

    const user = this.users.get(session.userId);
    if (!user) return;

    user.vote = data.vote;
    await this.saveUserToDatabase(user);

    const roomState = await this.getRoomState();
    this.broadcast({ type: 'userVoted', data: roomState });
  }

  /**
   * Handles revealing votes.
   */
  private async handleReveal(ws: WebSocket, data: { roundId?: string }): Promise<void> {
    // Prevent concurrent reveal operations
    if (this.isProcessingReveal || this.revealed) {
      console.log('handleReveal - Already revealed or processing reveal, ignoring');
      return;
    }

    this.isProcessingReveal = true;
    
    try {
      this.revealed = true;
      
      // Ensure room exists in database before saving vote history
      await this.saveRoomToDatabase();
      console.log('handleReveal - Room saved to database');

      // Calculate winning vote and save to history
      const votes = Array.from(this.users.values())
        .map(u => u.vote)
        .filter((vote): vote is string => vote !== null);

      if (votes.length > 0) {
        const counts = votes.reduce((acc: Record<string, number>, vote: string) => {
          acc[vote] = (acc[vote] || 0) + 1;
          return acc;
        }, {});

        const winningCard = Object.keys(counts).reduce((a, b) => 
          counts[a] > counts[b] ? a : b
        );

        const winner = Array.from(this.users.values()).find(u => u.vote === winningCard);

        // Generate a more robust round ID to prevent collisions
        const roundId = data.roundId || `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

        const historyEntry: VoteHistoryEntry = {
          id: roundId,
          votes: Array.from(this.users.values()).map(u => ({
            name: u.name,
            vote: u.vote,
            sessionId: u.sessionId
          })),
          participants: this.users.size,
          winningCard,
          winnerName: winner?.name,
          timestamp: Date.now()
        };

        console.log('handleReveal - Saving vote history entry:', { roundId, participants: historyEntry.participants });
        
        try {
          await this.saveVoteHistoryToDatabase(historyEntry);
          console.log('handleReveal - Vote history entry saved successfully');
        } catch (error) {
          console.error('handleReveal - Failed to save vote history:', error);
          // Don't fail the entire operation if vote history save fails
        }
      }

      const roomState = await this.getRoomState();
      this.broadcast({ type: 'votesRevealed', data: roomState });
    } finally {
      this.isProcessingReveal = false;
    }
  }

  /**
   * Handles resetting votes.
   */
  private async handleReset(ws: WebSocket): Promise<void> {
    // Prevent concurrent reset operations
    if (this.isProcessingReset) {
      console.log('handleReset - Already processing reset, ignoring');
      return;
    }

    this.isProcessingReset = true;
    
    try {
      console.log('handleReset - Starting reset for room:', this.roomId);
      this.revealed = false;
      
      // Reset all user votes
      for (const user of this.users.values()) {
        user.vote = null;
        await this.saveUserToDatabase(user);
      }

      await this.saveRoomToDatabase();
      console.log('handleReset - Saved room state, getting current room state...');

      // Add a small delay to ensure database transaction is committed
      await new Promise(resolve => setTimeout(resolve, 10));

      // Check vote history before getRoomState
      console.log('handleReset - Double checking vote history before getRoomState...');
      const directHistoryCheck = await this.env.DB.prepare(
        'SELECT COUNT(*) as count FROM vote_history WHERE room_id = ?'
      ).bind(this.roomId).first<{ count: number }>();
      console.log('handleReset - Direct count check:', directHistoryCheck?.count || 0);

      const roomState = await this.getRoomState();
      console.log('handleReset - Room state retrieved, vote history length:', roomState.winningVoteHistory?.length || 0);
      this.broadcast({ type: 'votesReset', data: roomState });
    } finally {
      this.isProcessingReset = false;
    }
  }

  /**
   * Handles user disconnection.
   */
  private async handleDisconnect(ws: WebSocket): Promise<void> {
    const session = this.sessions.get(ws);
    if (!session) return;

    this.sessions.delete(ws);

    // Update user's last_seen timestamp for cleanup purposes but keep them in DB for reconnection
    const user = this.users.get(session.userId);
    if (user) {
      await this.env.DB.prepare(
        'UPDATE users SET last_seen = ? WHERE id = ? AND room_id = ?'
      ).bind(Date.now(), user.id, this.roomId).run();
    }

    const roomState = await this.getRoomState();
    this.broadcast({ type: 'userLeft', data: roomState });
  }

  /**
   * Handles HTTP API requests.
   */
  private async handleApiRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    try {
      switch (action) {
        case 'createRoom':
          return await this.handleCreateRoom(request);
        case 'getRoomState':
          return await this.handleGetRoomState();
        case 'testDatabase':
          return await this.handleTestDatabase();
        default:
          return new Response('Unknown action', { 
            status: 400,
            headers: corsHeaders
          });
      }
    } catch (error) {
      console.error('Error handling API request:', error);
      return new Response('Internal server error', { 
        status: 500,
        headers: corsHeaders
      });
    }
  }

  /**
   * Handles room creation.
   */
  private async handleCreateRoom(request: Request): Promise<Response> {
    const data = await request.json() as { name: string; sessionId: string };
    const { name, sessionId } = data;
    
    // Initialize room in database
    await this.saveRoomToDatabase();

    // Create initial user
    const user: User = {
      id: this.generateUserId(),
      name,
      vote: null,
      sessionId
    };

    this.users.set(user.id, user);
    await this.saveUserToDatabase(user);

    return new Response(JSON.stringify({ 
      roomId: this.roomId, 
      sessionId 
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  /**
   * Handles getting room state.
   */
  private async handleGetRoomState(): Promise<Response> {
    const roomState = await this.getRoomState();
    return new Response(JSON.stringify(roomState), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  /**
   * Test database operations to debug vote history issues.
   */
  private async handleTestDatabase(): Promise<Response> {
    try {
      console.log('testDatabase - Starting database test for room:', this.roomId);

      // Ensure room exists in database first
      await this.saveRoomToDatabase();
      console.log('testDatabase - Room saved to database');

      // Test 1: Insert a test vote history entry
      const testEntry: VoteHistoryEntry = {
        id: `test-${Date.now()}`,
        votes: [{ name: 'TestUser', vote: '5', sessionId: 'test-session' }],
        participants: 1,
        winningCard: '5',
        winnerName: 'TestUser',
        timestamp: Date.now()
      };

      await this.saveVoteHistoryToDatabase(testEntry);
      console.log('testDatabase - Test entry saved');

      // Test 2: Query all vote history
      const allHistory = await this.env.DB.prepare(
        'SELECT * FROM vote_history WHERE room_id = ? ORDER BY timestamp DESC'
      ).bind(this.roomId).all<VoteHistoryRow>();

      console.log('testDatabase - Found entries:', allHistory.results.length);

      // Test 3: Get room state
      const roomState = await this.getRoomState();
      console.log('testDatabase - Room state history length:', roomState.winningVoteHistory.length);

      return new Response(JSON.stringify({
        success: true,
        testEntryId: testEntry.id,
        dbEntries: allHistory.results.length,
        roomStateEntries: roomState.winningVoteHistory.length,
        entries: allHistory.results.map(r => ({
          id: r.round_id,
          room_id: r.room_id,
          timestamp: r.timestamp
        }))
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    } catch (error) {
      console.error('testDatabase - Error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }
  }

  /**
   * Cleans up inactive users from the database.
   * Removes users who haven't been seen for more than 24 hours.
   */
  private async cleanupInactiveUsers(): Promise<void> {
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    try {
      await this.env.DB.prepare(
        'DELETE FROM users WHERE room_id = ? AND last_seen < ?'
      ).bind(this.roomId, twentyFourHoursAgo).run();
    } catch (error) {
      console.error('Error cleaning up inactive users:', error);
    }
  }

  /**
   * Loads room state from the database.
   */
  private async loadRoomState(): Promise<void> {
    // Clean up old users first
    await this.cleanupInactiveUsers();
    
    // Load room info
    const roomResult = await this.env.DB.prepare(
      'SELECT * FROM rooms WHERE id = ?'
    ).bind(this.roomId).first<RoomRow>();

    if (roomResult) {
      this.revealed = roomResult.revealed === 1;
    }

    // Load users
    const usersResult = await this.env.DB.prepare(
      'SELECT * FROM users WHERE room_id = ?'
    ).bind(this.roomId).all<UserRow>();

    this.users.clear();
    for (const userRow of usersResult.results) {
      const user: User = {
        id: userRow.id,
        name: userRow.name,
        vote: userRow.current_vote,
        sessionId: userRow.session_id
      };
      this.users.set(user.id, user);
    }
  }

  /**
   * Gets the current room state including vote history.
   */
  private async getRoomState(): Promise<RoomState> {
    // Get vote history
    console.log('getRoomState - Querying vote history for room:', this.roomId);
    
    try {
      const historyResult = await this.env.DB.prepare(
        'SELECT * FROM vote_history WHERE room_id = ? ORDER BY timestamp DESC'
      ).bind(this.roomId).all<VoteHistoryRow>();

      console.log('getRoomState - DB query for vote history:', historyResult.results.length, 'entries for room:', this.roomId);
      console.log('getRoomState - Full DB result:', {
        results: historyResult.results,
        success: historyResult.success,
        meta: historyResult.meta
      });
      
      if (historyResult.results.length > 0) {
        console.log('Vote history entries from DB:', historyResult.results.map(r => ({ 
          id: r.round_id, 
          room_id: r.room_id,
          timestamp: r.timestamp,
          winning_card: r.winning_card
        })));
      }

      const winningVoteHistory: VoteHistoryEntry[] = historyResult.results.map(row => ({
        id: row.round_id,
        votes: JSON.parse(row.votes),
        participants: row.participants,
        winningCard: row.winning_card,
        winnerName: row.winner_name || undefined,
        timestamp: row.timestamp
      }));

      console.log('getRoomState - Final vote history array length:', winningVoteHistory.length);

      // Only return users who have active WebSocket sessions
      const activeUserIds = new Set(Array.from(this.sessions.values()).map(session => session.userId));
      const activeUsers = Array.from(this.users.values()).filter(user => activeUserIds.has(user.id));

      return {
        users: activeUsers,
        revealed: this.revealed,
        winningVoteHistory
      };
    } catch (error) {
      console.error('getRoomState - Error querying vote history:', error);
      // Return empty history on error rather than failing completely
      
      // Only return users who have active WebSocket sessions
      const activeUserIds = new Set(Array.from(this.sessions.values()).map(session => session.userId));
      const activeUsers = Array.from(this.users.values()).filter(user => activeUserIds.has(user.id));
      
      return {
        users: activeUsers,
        revealed: this.revealed,
        winningVoteHistory: []
      };
    }
  }

  /**
   * Saves room data to the database.
   */
  private async saveRoomToDatabase(): Promise<void> {
    const now = Date.now();
    await this.env.DB.prepare(`
      INSERT OR REPLACE INTO rooms (id, created_at, last_activity, revealed)
      VALUES (?, ?, ?, ?)
    `).bind(
      this.roomId,
      now,
      now,
      this.revealed ? 1 : 0
    ).run();
  }

  /**
   * Saves user data to the database.
   */
  private async saveUserToDatabase(user: User): Promise<void> {
    const now = Date.now();
    
    // Ensure room exists first to avoid foreign key constraint failures
    await this.saveRoomToDatabase();
    
    // Check if user already exists to preserve joined_at timestamp
    const existingUser = await this.env.DB.prepare(
      'SELECT joined_at FROM users WHERE id = ? AND room_id = ?'
    ).bind(user.id, this.roomId).first();
    
    const joinedAt = existingUser ? existingUser.joined_at : now;
    
    await this.env.DB.prepare(`
      INSERT OR REPLACE INTO users (id, room_id, name, session_id, current_vote, joined_at, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user.id,
      this.roomId,
      user.name,
      user.sessionId,
      user.vote,
      joinedAt,
      now
    ).run();
  }

  /**
   * Saves vote history to the database.
   */
  private async saveVoteHistoryToDatabase(entry: VoteHistoryEntry): Promise<void> {
    try {
      // Ensure room exists first to avoid foreign key constraint failures
      await this.saveRoomToDatabase();
      
      const uniqueId = crypto.randomUUID();
      console.log('saveVoteHistoryToDatabase - Attempting to save:', { 
        uniqueId, 
        roomId: this.roomId, 
        roundId: entry.id,
        participants: entry.participants,
        winningCard: entry.winningCard
      });

      // Use INSERT OR REPLACE to handle potential unique constraint violations
      const result = await this.env.DB.prepare(`
        INSERT OR REPLACE INTO vote_history (id, room_id, round_id, votes, participants, winning_card, winner_name, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        uniqueId,
        this.roomId,
        entry.id,
        JSON.stringify(entry.votes),
        entry.participants,
        entry.winningCard,
        entry.winnerName || null,
        entry.timestamp
      ).run();

      console.log('saveVoteHistoryToDatabase - Save successful:', { 
        success: result.success,
        meta: result.meta
      });

      // Verify the entry was saved by querying it back
      const verifyResult = await this.env.DB.prepare(
        'SELECT COUNT(*) as count FROM vote_history WHERE room_id = ? AND round_id = ?'
      ).bind(this.roomId, entry.id).first<{ count: number }>();

      console.log('saveVoteHistoryToDatabase - Verification:', { 
        expectedRoundId: entry.id,
        foundCount: verifyResult?.count || 0
      });

    } catch (error) {
      console.error('saveVoteHistoryToDatabase - Error saving vote history:', error);
      throw error;
    }
  }

  /**
   * Broadcasts a message to all connected clients except the sender.
   */
  private broadcast(message: WebSocketMessage, exclude?: WebSocket): void {
    const messageStr = JSON.stringify(message);
    for (const [ws] of this.sessions) {
      if (ws !== exclude && ws.readyState === 1) { // 1 = OPEN state
        ws.send(messageStr);
      }
    }
  }

  /**
   * Generates a unique user ID.
   */
  private generateUserId(): string {
    return crypto.randomUUID();
  }
} 