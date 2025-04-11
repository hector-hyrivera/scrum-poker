import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../socket';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Chip,
  Stack,
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  QrCode as QrCodeIcon,
  ExitToApp as ExitToAppIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

interface Participant {
  id: string;
  name: string;
  vote: string | null;
}

const Room = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [vote, setVote] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  const name = location.state?.name;

  useEffect(() => {
    if (!roomId || !name) {
      navigate('/');
      return;
    }

    const handleUserJoined = (state: { users: Participant[]; revealed: boolean }) => {
      console.log('User joined, state:', state);
      setParticipants(state.users);
      setIsRevealed(state.revealed);
    };

    const handleUserVoted = (state: { users: Participant[]; revealed: boolean }) => {
      console.log('User voted, state:', state);
      setParticipants(state.users);
      setIsRevealed(state.revealed);
    };

    const handleVotesRevealed = () => {
      console.log('Votes revealed');
      setIsRevealed(true);
    };

    const handleVotesReset = () => {
      console.log('Votes reset');
      setIsRevealed(false);
      setVote(null);
    };

    const handleRoomNotFound = () => {
      console.log('Room not found');
      setError('Room not found');
      setTimeout(() => navigate('/'), 2000);
    };

    // Initial room join
    if (roomId && name) {
      console.log('Joining room:', roomId, 'with name:', name);
      socket.emit('joinRoom', { roomId, name, sessionId: localStorage.getItem('sessionId') });
    }

    socket.on('userJoined', handleUserJoined);
    socket.on('userVoted', handleUserVoted);
    socket.on('votesRevealed', handleVotesRevealed);
    socket.on('votesReset', handleVotesReset);
    socket.on('roomNotFound', handleRoomNotFound);

    return () => {
      socket.off('userJoined', handleUserJoined);
      socket.off('userVoted', handleUserVoted);
      socket.off('votesRevealed', handleVotesRevealed);
      socket.off('votesReset', handleVotesReset);
      socket.off('roomNotFound', handleRoomNotFound);
    };
  }, [roomId, name, navigate]);

  const handleVote = (value: string) => {
    if (!roomId || !name) return;
    setVote(value);
    socket.emit('vote', { roomId, vote: value });
  };

  const handleReveal = () => {
    if (!roomId) return;
    socket.emit('reveal', roomId);
  };

  const handleReset = () => {
    if (!roomId) return;
    socket.emit('reset', roomId);
  };

  const toggleQRCode = () => {
    setShowQRCode(!showQRCode);
  };

  if (error) {
    return (
      <Box
        minHeight="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        sx={{
          background: 'linear-gradient(135deg, #F5F7FA 0%, #E4E7EB 100%)',
        }}
      >
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <Typography color="error" variant="h6" gutterBottom>
            {error}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Redirecting to home...
          </Typography>
        </Box>
      </Box>
    );
  }

  const roomUrl = `${window.location.origin}/?room=${roomId}`;

  return (
    <Box
      minHeight="100vh"
      width="100%"
      p={2}
    >
      <Stack spacing={4} sx={{ maxWidth: '1200px', mx: 'auto' }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(8px)',
            borderRadius: 2,
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.3)',
          }}
        >
          <Typography variant="h4" component="h1" color="primary">
            Room: {roomId}
          </Typography>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<ExitToAppIcon />}
            onClick={() => navigate('/')}
            sx={{ borderWidth: 2 }}
          >
            Leave Room
          </Button>
        </Box>

        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={4}>
          {/* Participants Section */}
          <Box>
            <Typography variant="h5" gutterBottom color="text.primary" sx={{ mb: 3 }}>
              Participants
            </Typography>
            <Stack spacing={2}>
              {participants.map(participant => (
                <motion.div
                  key={participant.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Box
                    sx={{
                      p: 2,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      bgcolor: 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(8px)',
                      borderRadius: 2,
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.3)',
                    }}
                  >
                    <Typography variant="subtitle1" color="text.primary">
                      {participant.name}
                    </Typography>
                    <Chip
                      label={isRevealed ? (participant.vote || '?') : (participant.vote ? '✓' : '?')}
                      color={isRevealed ? "accent" : "default"}
                      variant={participant.vote ? "filled" : "outlined"}
                      sx={{ 
                        fontWeight: 600,
                        ...(isRevealed && { 
                          bgcolor: 'accent.main',
                          color: 'accent.contrastText'
                        }),
                        ...(!isRevealed && participant.vote && {
                          bgcolor: 'primary.light',
                          color: 'primary.contrastText'
                        })
                      }}
                    />
                  </Box>
                </motion.div>
              ))}
            </Stack>
          </Box>

          {/* Voting Section */}
          <Box>
            <Typography variant="h5" gutterBottom color="text.primary" sx={{ mb: 3 }}>
              Vote
            </Typography>
            <Box display="grid" gridTemplateColumns={{ xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' }} gap={2} sx={{ mb: 3 }}>
              {['1', '2', '3', '5', '8', '13', '21', '?', '☕'].map(value => (
                <Box key={value}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      fullWidth
                      variant={vote === value ? "contained" : "outlined"}
                      color={vote === value ? "accent" : "primary"}
                      onClick={() => handleVote(value)}
                      sx={{ 
                        height: '80px',
                        borderWidth: vote === value ? 0 : 2,
                        backgroundColor: vote === value ? 'accent.main' : 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(8px)',
                        color: vote === value ? 'accent.contrastText' : 'primary.main',
                        fontSize: '1.5rem',
                        fontWeight: 600,
                        '&:hover': {
                          borderWidth: 2,
                          backgroundColor: vote === value ? 'accent.dark' : 'rgba(255, 255, 255, 0.8)',
                        }
                      }}
                    >
                      {value}
                    </Button>
                  </motion.div>
                </Box>
              ))}
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                fullWidth
                variant="contained"
                color="accent"
                startIcon={<VisibilityIcon />}
                onClick={handleReveal}
              >
                Reveal Votes
              </Button>
              <Button
                fullWidth
                variant="outlined"
                color="secondary"
                startIcon={<RefreshIcon />}
                onClick={handleReset}
                sx={{ borderWidth: 2 }}
              >
                Reset
              </Button>
            </Stack>
          </Box>
        </Box>

        {/* Share Section */}
        <Box>
          <Typography variant="h6" gutterBottom color="text.primary" sx={{ mb: 2 }}>
            Share Room
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              value={roomUrl}
              InputProps={{ 
                readOnly: true,
                sx: { 
                  borderRadius: 2,
                  '& fieldset': { borderWidth: 2 },
                  bgcolor: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(8px)',
                }
              }}
              variant="outlined"
            />
            <Stack direction="row" spacing={2}>
              <IconButton
                color="primary"
                onClick={() => navigator.clipboard.writeText(roomUrl)}
                sx={{ 
                  border: 2, 
                  borderColor: 'divider',
                  bgcolor: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(8px)',
                  '&:hover': {
                    bgcolor: 'primary.light',
                    color: 'white',
                    borderColor: 'primary.light'
                  }
                }}
              >
                <ContentCopyIcon />
              </IconButton>
              <IconButton
                color="primary"
                onClick={toggleQRCode}
                sx={{ 
                  border: 2, 
                  borderColor: 'divider',
                  bgcolor: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(8px)',
                  '&:hover': {
                    bgcolor: 'primary.light',
                    color: 'white',
                    borderColor: 'primary.light'
                  }
                }}
              >
                <QrCodeIcon />
              </IconButton>
            </Stack>
          </Stack>
          <AnimatePresence>
            {showQRCode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                  <QRCodeSVG value={roomUrl} size={200} />
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Stack>
    </Box>
  );
};

export default Room; 