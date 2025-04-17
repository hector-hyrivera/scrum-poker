import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createRoom, joinRoom } from '../socket';
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

const Footer = () => (
  <Box
    component="footer"
    sx={{
      mt: 4,
      py: 2,
      textAlign: "center",
      backgroundColor: "transparent", // Fully transparent background
      color: "text.secondary",
    }}
  >
    <Typography variant="body2">
      {new Date().getFullYear()} Hector Rivera. All rights reserved.
    </Typography>
  </Box>
);

const Home = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [roomCode, setRoomCode] = useState(() => searchParams.get('room') || '');

  const handleCreateRoom = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    try {
      console.log('Creating room with name:', name);
      const { roomId } = await createRoom(name);
      console.log('Room created with ID:', roomId);
      const roomState = await joinRoom(roomId, name);
      console.log('Joined room with state:', roomState);
      navigate(`/room/${roomId}`, { state: { name } });
    } catch (err) {
      console.error('Failed to create room:', err);
      setError(err instanceof Error ? err.message : 'Failed to create room');
    }
  };

  const handleJoinRoom = async (roomIdToJoin: string) => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    try {
      const roomState = await joinRoom(roomIdToJoin, name);
      console.log('Joined room with state:', roomState);
      navigate(`/room/${roomIdToJoin}`, { state: { name } });
    } catch (err) {
      console.error('Failed to join room:', err);
      setError(err instanceof Error ? err.message : 'Failed to join room');
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
      <Box sx={{ width: '100%', maxWidth: '600px' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
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
                Create a planning poker room or join an existing one
              </Typography>

              <TextField
                fullWidth
                label="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={!!error}
                helperText={error}
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
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && name.trim()) {
                    if (roomCode.trim()) {
                      handleJoinRoom(roomCode.trim());
                    } else {
                      handleCreateRoom();
                    }
                  }
                }}
              />

              <TextField
                fullWidth
                label="Room Code (e.g. blue-apple-42)"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
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
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && name.trim() && roomCode.trim()) {
                    handleJoinRoom(roomCode.trim());
                  }
                }}
              />

              <Button
                fullWidth
                variant="contained"
                color={roomCode.trim() ? "primary" : "success"}
                size="large"
                startIcon={!roomCode.trim() ? <AddIcon /> : undefined}
                onClick={() => {
                  if (roomCode.trim()) {
                    handleJoinRoom(roomCode.trim());
                  } else {
                    handleCreateRoom();
                  }
                }}
                disabled={!name.trim()}
              >
                {roomCode.trim() ? 'Join Room' : 'Create New Room'}
              </Button>
            </Stack>
          </Paper>
        </motion.div>
      </Box>
      <Footer />
    </Box>
  );
};

export default Home;