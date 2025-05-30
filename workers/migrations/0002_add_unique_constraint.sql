-- Migration 0002: Add unique constraint to vote_history table

-- Create a new table with the unique constraint
CREATE TABLE vote_history_new (
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

-- Copy data from old table to new table (removing duplicates by keeping the latest timestamp)
INSERT INTO vote_history_new (id, room_id, round_id, votes, participants, winning_card, winner_name, timestamp)
SELECT id, room_id, round_id, votes, participants, winning_card, winner_name, timestamp
FROM vote_history vh1
WHERE timestamp = (
  SELECT MAX(timestamp) 
  FROM vote_history vh2 
  WHERE vh2.room_id = vh1.room_id AND vh2.round_id = vh1.round_id
);

-- Drop the old table
DROP TABLE vote_history;

-- Rename the new table
ALTER TABLE vote_history_new RENAME TO vote_history;

-- Recreate the index
CREATE INDEX idx_vote_history_room_id ON vote_history(room_id); 