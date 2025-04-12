import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../socket';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Stack,
  Paper,
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  QrCode as QrCodeIcon,
  ExitToApp as ExitToAppIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  EmojiEvents as EmojiEventsIcon,
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
  const [winningValue, setWinningValue] = useState<string | null>(null);

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

    const handleVotesRevealed = (state: { users: Participant[]; revealed: boolean }) => {
      console.log('Votes revealed, state:', state);
      setParticipants(state.users);
      setIsRevealed(true);
    };

    const handleVotesReset = () => {
      console.log('Votes reset');
      setIsRevealed(false);
      setVote(null);
      setWinningValue(null);
    };

    const handleRoomNotFound = () => {
      console.log('Room not found');
      setError('Room not found');
      setTimeout(() => navigate('/'), 2000);
    };

    if (roomId && name) {
      console.log('Joining room:', roomId, 'with name:', name);
      const sessionId = localStorage.getItem('sessionId');
      socket.emit('joinRoom', { roomId, name, sessionId });
    }

    socket.on('userJoined', handleUserJoined);
    socket.on('userVoted', handleUserVoted);
    socket.on('votesRevealed', handleVotesRevealed);
    socket.on('votesReset', handleVotesReset);
    socket.on('roomNotFound', handleRoomNotFound);
    socket.emit('getRoomState', roomId);
    socket.on('roomState', (state: { users: Participant[]; revealed: boolean }) => {
      console.log('Received initial room state:', state);
      setParticipants(state.users);
      setIsRevealed(state.revealed);
    });

    return () => {
      socket.off('userJoined', handleUserJoined);
      socket.off('userVoted', handleUserVoted);
      socket.off('votesRevealed', handleVotesRevealed);
      socket.off('votesReset', handleVotesReset);
      socket.off('roomNotFound', handleRoomNotFound);
      socket.off('roomState');
    };
  }, [roomId, name, navigate]);

  useEffect(() => {
    if (isRevealed && participants.length > 0) {
      const votes = participants
        .map(p => p.vote)
        .filter((v): v is string => v !== null);

      if (votes.length === 0) {
        setWinningValue(null);
        return;
      }

      const counts: Record<string, number> = votes.reduce((acc, vote) => {
        acc[vote] = (acc[vote] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const countValues = Object.values(counts);
      const uniqueVoteValues = Object.keys(counts);

      if (countValues.length === 0) {
        setWinningValue(null);
        return;
      }

      const averageCount = countValues.reduce((sum, count) => sum + count, 0) / countValues.length;

      const differences = uniqueVoteValues.map(value => ({
        value,
        count: counts[value],
        diff: Math.abs(counts[value] - averageCount),
      }));

      const minDifference = Math.min(...differences.map(d => d.diff));

      let closestValues = differences.filter(d => d.diff === minDifference);

      if (closestValues.length > 1) {
        const maxCount = Math.max(...closestValues.map(v => v.count));
        closestValues = closestValues.filter(v => v.count === maxCount);

        if (closestValues.length > 1) {
          closestValues.sort((a, b) => {
            const aIsNum = !isNaN(Number(a.value));
            const bIsNum = !isNaN(Number(b.value));

            if (aIsNum && !bIsNum) return 1;
            if (!aIsNum && bIsNum) return -1;
            if (aIsNum && bIsNum) return Number(b.value) - Number(a.value);
            return b.value.localeCompare(a.value);
          });
        }
      }

      setWinningValue(closestValues[0].value);
    } else {
      setWinningValue(null);
    }
  }, [participants, isRevealed]);

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
    setVote(null);
    setWinningValue(null);
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
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="flex-start"
      sx={{
        background: 'linear-gradient(135deg, #ece9e6 0%, #ffffff 100%)',
        p: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Paper elevation={2} sx={{ 
        width: '100%', 
        maxWidth: '1140px', 
        margin: '0 auto',
        p: { xs: 2, sm: 3, md: 4 }, 
        mb: 4, 
        bgcolor: 'rgba(255, 255, 255, 0.8)', 
        backdropFilter: 'blur(10px)', 
        borderRadius: 2 
      }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Typography variant="h4" component="h1" color="primary.dark" sx={{ fontWeight: 600 }}>
            Room: {roomId}
          </Typography>
          <Stack direction="row" spacing={1}>
            <IconButton onClick={toggleQRCode} title="Show/Hide QR Code">
              <QrCodeIcon />
            </IconButton>
            <IconButton onClick={() => copyToClipboard(roomUrl)} title="Copy Room Link">
              <ContentCopyIcon />
            </IconButton>
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              startIcon={<ExitToAppIcon />}
              onClick={() => navigate('/')}
              sx={{ borderWidth: 2 }}
            >
              Leave
            </Button>
          </Stack>
        </Stack>
        {showQRCode && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <QRCodeSVG value={roomUrl} size={128} />
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Scan to join or share link: {roomUrl}
            </Typography>
          </Box>
        )}
      </Paper>

      <Box
        display="grid"
        gridTemplateColumns={{ xs: '1fr', md: '2fr 1fr' }}
        gap={4}
        width="100%"
        maxWidth="1200px"
      >
        <Box>
          {isRevealed && winningValue && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Paper elevation={3} sx={{ p: 3, mb: 3, textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                  <EmojiEventsIcon sx={{ fontSize: '2rem' }} />
                  <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                    Winning Value:
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {winningValue}
                  </Typography>
                </Stack>
              </Paper>
            </motion.div>
          )}

          <Paper elevation={2} sx={{ p: 3, bgcolor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', borderRadius: 2 }}>
            <Typography variant="h5" gutterBottom color="text.primary" sx={{ mb: 3, fontWeight: 600 }}>
              Participants ({participants.length})
            </Typography>
            <Stack spacing={2}>
              <AnimatePresence>
                {participants.map(participant => (
                  <motion.div
                    key={participant.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{
                        p: 1.5,
                        borderRadius: 1,
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: participant.id === socket.id ? 700 : 400,
                          color: participant.id === socket.id ? 'primary.dark' : 'text.secondary',
                         }}
                      >
                        {participant.name} {participant.id === socket.id && '(You)'}
                      </Typography>
                      <Chip
                        label={isRevealed ? (participant.vote ?? '...') : (participant.vote ? '✓' : '?')}
                        variant={participant.vote ? "filled" : "outlined"}
                        size="small"
                        sx={{
                          minWidth: '40px',
                          fontWeight: 600,
                          transition: 'all 0.3s ease',
                           ...(isRevealed && {
                              bgcolor: participant.vote === winningValue ? 'success.light' : 'primary.light',
                              color: participant.vote === winningValue ? 'success.contrastText' : 'primary.contrastText',
                           }),
                          ...(!isRevealed && participant.vote && {
                            bgcolor: 'secondary.light',
                            color: 'secondary.contrastText'
                          }),
                           ...(!participant.vote && {
                              borderColor: 'grey.400',
                              color: 'grey.600'
                           })
                        }}
                      />
                    </Box>
                  </motion.div>
                ))}
              </AnimatePresence>
            </Stack>
          </Paper>
        </Box>

        <Paper elevation={2} sx={{ p: 3, bgcolor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', borderRadius: 2, position: 'sticky', top: '20px' }}>
          <Typography variant="h5" gutterBottom color="text.primary" sx={{ mb: 3, fontWeight: 600 }}>
            Vote
          </Typography>
          <Box display="grid" gridTemplateColumns={{ xs: 'repeat(3, 1fr)', sm: 'repeat(3, 1fr)' }} gap={1.5} sx={{ mb: 3 }}>
            {['1', '2', '3', '5', '8', '13', '21', '?', '☕'].map(value => (
              <Box key={value}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    fullWidth
                    variant={vote === value ? "contained" : "outlined"}
                    color={vote === value ? "secondary" : "primary"}
                    onClick={() => handleVote(value)}
                    disabled={isRevealed}
                    sx={{
                      height: '60px',
                      borderWidth: vote === value ? 0 : 1,
                      fontSize: '1.2rem',
                      fontWeight: 600,
                      boxShadow: vote === value ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
                      '&:hover': {
                        borderWidth: 1,
                      },
                      '&.Mui-disabled': {
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
              color="primary"
              startIcon={<VisibilityIcon />}
              onClick={handleReveal}
              disabled={isRevealed || participants.every(p => !p.vote)}
            >
              Reveal Votes
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="secondary"
              startIcon={<RefreshIcon />}
              onClick={handleReset}
              disabled={!isRevealed && participants.every(p => !p.vote)}
              sx={{ borderWidth: 2 }}
            >
              Reset
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
};

export default Room;

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    console.log('Room link copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
}; 