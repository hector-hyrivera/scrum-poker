import { getSocketUrl } from './env';

/**
 * Represents a user in a room.
 */
export interface User {
  /**
   * Unique user ID.
   */
  id: string;
  /**
   * User's name.
   */
  name: string;
  /**
   * User's current vote, or null if not voted.
   */
  vote: string | null;
  /**
   * User's session ID.
   */
  sessionId: string;
}

/**
 * Represents the state of a room.
 */
export interface RoomState {
  /**
   * List of users in the room.
   */
  users: User[];
  /**
   * Whether votes are currently revealed.
   */
  revealed: boolean;
  /**
   * History of winning votes.
   */
  winningVoteHistory: VoteHistoryEntry[];
}

/**
 * Represents a single entry in the vote history.
 */
export interface VoteHistoryEntry {
  /**
   * Round identifier (custom or sequential).
   */
  id: string;
  /**
   * Array of votes for the round.
   */
  votes: { name: string; vote: string | null; sessionId: string }[];
  /**
   * Number of participants in the round.
   */
  participants: number;
  /**
   * The winning card value.
   */
  winningCard: string;
  /**
   * Name of the winning participant (if any).
   */
  winnerName?: string;
  /**
   * Timestamp of the round.
   */
  timestamp: number;
}

/**
 * WebSocket message interface.
 */
interface WebSocketMessage {
  type: string;
  data?: any;
}

class CloudflareClient {
  private baseUrl: string;
  private ws: WebSocket | null = null;
  private currentRoomId: string | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnected = false;
  private isReconnecting = false;
  private lastPingTime = 0;
  private connectionTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.baseUrl = getSocketUrl();
    this.setupEventListeners();
  }

  /**
   * Sets up page visibility event listeners for connection management.
   */
  private setupEventListeners(): void {
    if (typeof window !== 'undefined') {
      // Handle page hide/show for back-forward cache
      window.addEventListener('pagehide', () => {
        this.handlePageHide();
      });
      
      window.addEventListener('pageshow', (event) => {
        if (event.persisted && this.currentRoomId) {
          this.handlePageShow();
        }
      });

      // Handle visibility changes (tab switching, minimizing window, etc.)
      document.addEventListener('visibilitychange', () => {
        this.handleVisibilityChange();
      });

      // Handle focus/blur events as backup
      window.addEventListener('focus', () => {
        this.handleWindowFocus();
      });

      window.addEventListener('blur', () => {
        this.handleWindowBlur();
      });

      // Handle online/offline events
      window.addEventListener('online', () => {
        this.handleOnline();
      });

      window.addEventListener('offline', () => {
        this.handleOffline();
      });
    }
  }

  /**
   * Handles page hide event.
   */
  private handlePageHide(): void {
    console.log('Page hidden, pausing heartbeat');
    this.stopHeartbeat();
  }

  /**
   * Handles page show event.
   */
  private handlePageShow(): void {
    console.log('Page shown, checking connection');
    this.checkAndReconnectIfNeeded();
  }

  /**
   * Handles visibility change event.
   */
  private handleVisibilityChange(): void {
    if (document.hidden) {
      console.log('Tab hidden, pausing heartbeat');
      this.stopHeartbeat();
    } else {
      console.log('Tab visible, checking connection');
      this.checkAndReconnectIfNeeded();
    }
  }

  /**
   * Handles window focus event.
   */
  private handleWindowFocus(): void {
    console.log('Window focused, checking connection');
    this.checkAndReconnectIfNeeded();
  }

  /**
   * Handles window blur event.
   */
  private handleWindowBlur(): void {
    console.log('Window blurred');
    // Don't immediately disconnect, just note the event
  }

  /**
   * Handles online event.
   */
  private handleOnline(): void {
    console.log('Connection online, attempting reconnect');
    this.checkAndReconnectIfNeeded();
  }

  /**
   * Handles offline event.
   */
  private handleOffline(): void {
    console.log('Connection offline');
    this.stopHeartbeat();
    this.emit('connectionStatus', { status: 'offline' });
  }

  /**
   * Checks connection health and reconnects if needed.
   */
  private checkAndReconnectIfNeeded(): void {
    if (!this.currentRoomId) return;

    // If we're already reconnecting, don't start another attempt
    if (this.isReconnecting) return;

    // Check if WebSocket is in a bad state
    const needsReconnect = !this.ws || 
                          this.ws.readyState === WebSocket.CLOSED || 
                          this.ws.readyState === WebSocket.CLOSING ||
                          (!this.isConnected && this.ws.readyState === WebSocket.OPEN);

    if (needsReconnect) {
      console.log('Connection needs repair, reconnecting...');
      this.reconnectToRoom();
    } else if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isConnected) {
      // Connection seems good, but let's test it with a ping
      this.sendPing();
      this.startHeartbeat();
    }
  }

  /**
   * Reconnects to the current room with better error handling.
   */
  private reconnectToRoom(): void {
    if (this.isReconnecting) return;
    
    this.isReconnecting = true;
    this.emit('connectionStatus', { status: 'reconnecting' });

    const roomId = localStorage.getItem('roomId');
    const name = localStorage.getItem('name');
    
    if (roomId && name) {
      this.currentRoomId = roomId;
      this.connectWebSocket(roomId);
      
      // Set a timeout for the reconnection attempt
      this.connectionTimeout = setTimeout(() => {
        if (this.isReconnecting) {
          console.log('Reconnection timeout, retrying...');
          this.isReconnecting = false;
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => this.reconnectToRoom(), this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
          } else {
            this.emit('connectionStatus', { status: 'failed' });
          }
        }
      }, 10000); // 10 second timeout
      
      const sessionId = this.getSessionId();
      const onConnect = () => {
        this.sendMessage({
          type: 'join',
          data: { name, sessionId }
        });
        this.off('connect', onConnect);
      };

      this.on('connect', onConnect);
    } else {
      this.isReconnecting = false;
    }
  }

  /**
   * Starts heartbeat mechanism to keep connection alive.
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN && !document.hidden) {
        this.sendPing();
      }
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Stops heartbeat mechanism.
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Sends a ping to test connection health.
   */
  private sendPing(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.lastPingTime = Date.now();
      this.sendMessage({ type: 'ping', data: { timestamp: this.lastPingTime } });
    }
  }

  /**
   * Creates a new room.
   */
  async createRoom(name: string): Promise<{ roomId: string; sessionId: string }> {
    const sessionId = this.getSessionId();
    
    const response = await fetch(`${this.baseUrl}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, sessionId }),
    });

    if (!response.ok) {
      throw new Error('Failed to create room');
    }

    const result = await response.json();
    localStorage.setItem('roomId', result.roomId);
    localStorage.setItem('name', name);
    
    return result;
  }

  /**
   * Joins a room and establishes WebSocket connection.
   */
  async joinRoom(roomId: string, name: string): Promise<RoomState> {
    return new Promise((resolve, reject) => {
      const sessionId = this.getSessionId();
      this.currentRoomId = roomId;

      // Connect to WebSocket
      this.connectWebSocket(roomId);

      // Set up one-time listeners for join response
      const onUserJoined = (state: RoomState) => {
        localStorage.setItem('roomId', roomId);
        localStorage.setItem('name', name);
        this.off('userJoined', onUserJoined);
        this.off('nameTaken', onNameTaken);
        this.off('roomNotFound', onRoomNotFound);
        resolve(state);
      };

      const onNameTaken = () => {
        this.off('userJoined', onUserJoined);
        this.off('nameTaken', onNameTaken);
        this.off('roomNotFound', onRoomNotFound);
        reject(new Error('Name is already taken in this room'));
      };

      const onRoomNotFound = () => {
        this.off('userJoined', onUserJoined);
        this.off('nameTaken', onNameTaken);
        this.off('roomNotFound', onRoomNotFound);
        reject(new Error('Room not found'));
      };

      this.on('userJoined', onUserJoined);
      this.on('nameTaken', onNameTaken);
      this.on('roomNotFound', onRoomNotFound);

      // Send join message once connected
      const onConnect = () => {
        this.sendMessage({
          type: 'join',
          data: { name, sessionId }
        });
        this.off('connect', onConnect);
      };

      if (this.ws?.readyState === WebSocket.OPEN) {
        onConnect();
      } else {
        this.on('connect', onConnect);
      }
    });
  }

  /**
   * Connects to WebSocket for a specific room.
   */
  private connectWebSocket(roomId: string): void {
    if (this.ws) {
      this.ws.close();
    }

    // Clear any existing connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    const wsUrl = this.baseUrl.replace(/^http/, 'ws') + `/ws/${roomId}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.emit('connect');
      this.emit('connectionStatus', { status: 'connected' });
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        // Handle pong responses
        if (message.type === 'pong') {
          const latency = Date.now() - this.lastPingTime;
          console.log(`Ping latency: ${latency}ms`);
          this.emit('connectionStatus', { status: 'connected', latency });
          return;
        }
        
        this.emit(message.type, message.data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected', event.code, event.reason);
      this.isConnected = false;
      this.stopHeartbeat();
      this.emit('disconnect');
      this.emit('connectionStatus', { status: 'disconnected' });
      
      // Only attempt to reconnect if we have a room and haven't exceeded max attempts
      if (this.currentRoomId && this.reconnectAttempts < this.maxReconnectAttempts && !this.isReconnecting) {
        // Don't immediately reconnect if the tab is hidden
        if (!document.hidden) {
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
          console.log(`Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
          
          setTimeout(() => {
            this.reconnectAttempts++;
            this.reconnectToRoom();
          }, delay);
        } else {
          console.log('Tab is hidden, delaying reconnect until tab becomes visible');
        }
      } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('Max reconnect attempts reached');
        this.emit('connectionStatus', { status: 'failed' });
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.isConnected = false;
      this.emit('connect_error', error);
      this.emit('connectionStatus', { status: 'error', error });
    };
  }

  /**
   * Sends a message through the WebSocket.
   */
  private sendMessage(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  /**
   * Casts a vote.
   */
  vote(_roomId: string, vote: string): void {
    this.sendMessage({
      type: 'vote',
      data: { vote }
    });
  }

  /**
   * Reveals votes.
   */
  revealVotes(_roomId: string, roundId?: string): void {
    this.sendMessage({
      type: 'reveal',
      data: roundId ? { roundId } : {}
    });
  }

  /**
   * Resets votes.
   */
  resetVotes(_roomId: string): void {
    this.sendMessage({
      type: 'reset'
    });
  }

  /**
   * Registers an event listener.
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Registers a one-time event listener.
   */
  once(event: string, callback: Function): void {
    const onceWrapper = (data: any) => {
      callback(data);
      this.off(event, onceWrapper);
    };
    this.on(event, onceWrapper);
  }

  /**
   * Removes an event listener.
   */
  off(event: string, callback?: Function): void {
    if (!this.eventListeners.has(event)) return;
    
    if (callback) {
      const listeners = this.eventListeners.get(event)!;
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    } else {
      this.eventListeners.delete(event);
    }
  }

  /**
   * Emits an event to all registered listeners.
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Disconnects the WebSocket.
   */
  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.currentRoomId = null;
    this.isConnected = false;
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Cleans up all event listeners.
   */
  cleanup(): void {
    this.eventListeners.clear();
    this.disconnect();
  }

  /**
   * Gets or generates a session ID.
   */
  private getSessionId(): string {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15);
      localStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  /**
   * Gets the current session ID.
   */
  getCurrentSessionId(): string {
    return this.getSessionId();
  }
}

// Create a singleton instance
const cloudflareClient = new CloudflareClient();

// Export the same interface as the original socket.ts
export const createRoom = (name: string) => cloudflareClient.createRoom(name);
export const joinRoom = (roomId: string, name: string) => cloudflareClient.joinRoom(roomId, name);
export const vote = (roomId: string, vote: string) => cloudflareClient.vote(roomId, vote);
export const revealVotes = (roomId: string, roundId?: string) => cloudflareClient.revealVotes(roomId, roundId);
export const resetVotes = (roomId: string) => cloudflareClient.resetVotes(roomId);

export const onUserJoined = (callback: (state: RoomState) => void) => cloudflareClient.on('userJoined', callback);
export const onUserVoted = (callback: (state: RoomState) => void) => cloudflareClient.on('userVoted', callback);
export const onVotesRevealed = (callback: () => void) => cloudflareClient.on('votesRevealed', callback);
export const onVotesReset = (callback: () => void) => cloudflareClient.on('votesReset', callback);
export const onRoomNotFound = (callback: () => void) => cloudflareClient.on('roomNotFound', callback);
export const onConnectionStatus = (callback: (status: { status: string; latency?: number; error?: any }) => void) => cloudflareClient.on('connectionStatus', callback);
export const onDisconnect = (callback: () => void) => cloudflareClient.on('disconnect', callback);
export const onConnect = (callback: () => void) => cloudflareClient.on('connect', callback);

export const cleanup = () => cloudflareClient.cleanup();
export const getCurrentSessionId = () => cloudflareClient.getCurrentSessionId();

export { cloudflareClient as socket }; 