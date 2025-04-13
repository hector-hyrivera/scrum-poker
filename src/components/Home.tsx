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
      © {new Date().getFullYear()} Hector Rivera. All rights reserved.
    </Typography>
  </Box>
);

const Home = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const roomId = searchParams.get('room');

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
              maxWidth: "1140px", // Ensure consistent max width
              margin: "16px auto", // Add consistent vertical and horizontal margins
              p: 3,
              bgcolor: "transparent", // Fully transparent background
              backdropFilter: "blur(10px)",
              borderRadius: 2,
              boxSizing: "border-box", // Ensure consistent box sizing
            }}
          >
            <Stack spacing={3}>
              <Typography variant="h3" component="h1" align="center" color="primary" gutterBottom>
                SCRUM Poker
              </Typography>
              <Typography variant="subtitle1" align="center" color="text.secondary" paragraph>
                {roomId ? 'Join the planning poker room' : 'Create a planning poker room'}
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
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && name.trim()) {
                    if (roomId) {
                      handleJoinRoom(roomId);
                    } else {
                      handleCreateRoom();
                    }
                  }
                }}
              />

              {roomId ? (
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={() => handleJoinRoom(roomId)}
                  disabled={!name.trim()}
                >
                  Join Room
                </Button>
              ) : (
                <Button
                  fullWidth
                  variant="contained"
                  color="success" // Change to success for green
                  size="large"
                  startIcon={<AddIcon />}
                  onClick={handleCreateRoom}
                  disabled={!name.trim()}
                >
                  Create New Room
                </Button>
              )}
            </Stack>
          </Paper>
        </motion.div>
      </Box>
      <Footer />
    </Box>
  );
};

export default Home;