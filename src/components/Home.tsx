import { useState, useEffect, JSX } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createRoom, joinRoom } from '../socket';
import { useSocketEvent } from './use-socket-event';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Stack,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

interface ServerErrorPayload {
  message: string;
}

/**
 * Footer component for displaying copyright.
 * @returns JSX.Element
 */
function Footer(): JSX.Element {
  return (
    <Box
      component="footer"
      sx={{
        mt: 4,
        py: 2,
        textAlign: "center",
        backgroundColor: "transparent",
        color: "text.secondary",
      }}
    >
      <Typography variant="body2">
        {new Date().getFullYear()} Hector Rivera. All rights reserved.
      </Typography>
    </Box>
  );
}

/**
 * Home page for SCRUM Poker. Handles room creation and joining, user input, and error feedback.
 * @returns JSX.Element
 */
export function Home(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [roomCode, setRoomCode] = useState(() => searchParams.get("room") || "");
  const [hasRoom, setHasRoom] = useState(false);
  const hasRoomInQuery = !!searchParams.get("room");

  useEffect(() => {
    if (hasRoomInQuery) setHasRoom(true);
  }, [hasRoomInQuery]);

  useSocketEvent<ServerErrorPayload>("serverError", (payload) => {
    setError(payload.message);
  });

  const handleCreateRoom = async () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    try {
      const { roomId } = await createRoom(name);
      await joinRoom(roomId, name);
      navigate(`/room/${roomId}`, { state: { name } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    }
  };

  const handleJoinRoom = async (roomIdToJoin: string) => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!roomIdToJoin.trim()) {
      setError("Please enter a room code");
      return;
    }
    try {
      await joinRoom(roomIdToJoin, name);
      navigate(`/room/${roomIdToJoin}`, { state: { name } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
    }
  };

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      width="100%"
      p={2}
      sx={{ flexDirection: "column" }}
    >
      <Box sx={{ width: "100%", maxWidth: "600px" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Paper
            elevation={3}
            sx={{
              width: "100%",
              maxWidth: "1140px",
              margin: "16px auto",
              p: 3,
              bgcolor: "background.paper",
              color: "text.primary",
              backdropFilter: "blur(10px)",
              borderRadius: 2,
              boxSizing: "border-box",
            }}
          >
            <Stack spacing={3}>
              <Typography variant="h3" component="h1" align="center" color="primary" gutterBottom>
                SCRUM Poker
              </Typography>
              <Typography variant="subtitle1" align="center" color="text.secondary" paragraph>
                {hasRoomInQuery
                  ? "Join this room by entering your name."
                  : hasRoom
                  ? "Join an existing room by entering your name and the room code."
                  : "Create a new room by entering just your name."}
              </Typography>
              {!hasRoomInQuery && (
                <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
                  <Typography variant="body2">
                    {hasRoom ? "Want to create a new room?" : "Already have a room?"}
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                      setHasRoom((v) => !v);
                      setError("");
                    }}
                    sx={{ textTransform: "none" }}
                  >
                    {hasRoom ? "Create New Room" : "Join Existing Room"}
                  </Button>
                </Stack>
              )}
              <TextField
                fullWidth
                label="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={!!error && !name.trim()}
                helperText={!!error && !name.trim() ? error : ""}
                placeholder="Enter your name"
                variant="outlined"
                autoFocus
                sx={{
                  bgcolor: "background.paper",
                  color: "text.primary",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: "background.paper",
                    borderRadius: 1,
                    border: "none",
                  },
                }}
                InputLabelProps={{
                  style: { color: "text.secondary" },
                }}
                InputProps={{
                  style: { color: "text.primary" },
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) {
                    if (hasRoomInQuery) {
                      handleJoinRoom(roomCode.trim());
                    } else if (!hasRoom) {
                      handleCreateRoom();
                    } else if (hasRoom && roomCode.trim()) {
                      handleJoinRoom(roomCode.trim());
                    }
                  }
                }}
              />
              {!hasRoomInQuery && hasRoom && (
                <TextField
                  fullWidth
                  label="Room Code (e.g. blue-apple-42)"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  error={!!error && (!roomCode.trim() || !name.trim())}
                  helperText={!!error && (!roomCode.trim() || !name.trim()) ? error : ""}
                  placeholder="Enter a room code to join"
                  variant="outlined"
                  sx={{
                    bgcolor: "background.paper",
                    color: "text.primary",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: "background.paper",
                      borderRadius: 1,
                      border: "none",
                    },
                  }}
                  InputLabelProps={{
                    style: { color: "text.secondary" },
                  }}
                  InputProps={{
                    style: { color: "text.primary" },
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && name.trim() && roomCode.trim()) {
                      handleJoinRoom(roomCode.trim());
                    }
                  }}
                />
              )}
              <Button
                fullWidth
                variant="contained"
                color={hasRoomInQuery || hasRoom ? "primary" : "success"}
                size="large"
                startIcon={!hasRoomInQuery && !hasRoom ? <AddIcon /> : undefined}
                onClick={() => {
                  if (hasRoomInQuery) {
                    handleJoinRoom(roomCode.trim());
                  } else if (hasRoom) {
                    handleJoinRoom(roomCode.trim());
                  } else {
                    handleCreateRoom();
                  }
                }}
                disabled={hasRoomInQuery ? !name.trim() : hasRoom ? !name.trim() || !roomCode.trim() : !name.trim()}
              >
                {hasRoomInQuery ? "Join Room" : hasRoom ? "Join Room" : "Create New Room"}
              </Button>
            </Stack>
          </Paper>
        </motion.div>
      </Box>
      <Footer />
    </Box>
  );
}

export default Home;