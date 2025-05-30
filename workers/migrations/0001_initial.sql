-- Migration 0001: Initial schema for Scrum Poker

-- Rooms table to store basic room information
CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  last_activity INTEGER NOT NULL,
  revealed INTEGER DEFAULT 0,
  current_round_id TEXT
);

-- Users table to store user information
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  current_vote TEXT,
  joined_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- Vote history table to store completed rounds
CREATE TABLE vote_history (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  round_id TEXT NOT NULL,
  votes TEXT NOT NULL, -- JSON string of votes
  participants INTEGER NOT NULL,
  winning_card TEXT NOT NULL,
  winner_name TEXT,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  UNIQUE(room_id, round_id)
);

-- Indexes for better performance
CREATE INDEX idx_users_room_id ON users(room_id);
CREATE INDEX idx_users_session_id ON users(session_id);
CREATE INDEX idx_vote_history_room_id ON vote_history(room_id);
CREATE INDEX idx_rooms_last_activity ON rooms(last_activity); 