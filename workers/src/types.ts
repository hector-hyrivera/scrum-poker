/**
 * Represents a user in a room.
 */
export interface User {
  /** Unique user ID. */
  id: string;
  /** User's name. */
  name: string;
  /** User's current vote, or null if not voted. */
  vote: string | null;
  /** User's session ID. */
  sessionId: string;
}

/**
 * Represents the state of a room.
 */
export interface RoomState {
  /** List of users in the room. */
  users: User[];
  /** Whether votes are currently revealed. */
  revealed: boolean;
  /** History of winning votes. */
  winningVoteHistory: VoteHistoryEntry[];
}

/**
 * Represents a single entry in the vote history.
 */
export interface VoteHistoryEntry {
  /** Round identifier (custom or sequential). */
  id: string;
  /** Array of votes for the round. */
  votes: { name: string; vote: string | null; sessionId: string }[];
  /** Number of participants in the round. */
  participants: number;
  /** The winning card value. */
  winningCard: string;
  /** Name of the winning participant (if any). */
  winnerName?: string;
  /** Timestamp of the round. */
  timestamp: number;
}

/**
 * WebSocket message types for real-time communication.
 */
export interface WebSocketMessage {
  type: string;
  data?: any;
  roomId?: string;
}

/**
 * Environment bindings for Cloudflare Workers.
 */
export interface Env {
  ROOM_OBJECT: DurableObjectNamespace;
  DB: D1Database;
  ENVIRONMENT?: string;
  ASSETS: Fetcher;
}

/**
 * Database row types.
 */
export interface RoomRow {
  id: string;
  created_at: number;
  last_activity: number;
  revealed: number;
  current_round_id: string | null;
}

export interface UserRow {
  id: string;
  room_id: string;
  name: string;
  session_id: string;
  current_vote: string | null;
  joined_at: number;
  last_seen: number;
}

export interface VoteHistoryRow {
  id: string;
  room_id: string;
  round_id: string;
  votes: string;
  participants: number;
  winning_card: string;
  winner_name: string | null;
  timestamp: number;
} 