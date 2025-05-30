import { useState, useCallback, useEffect, JSX } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { socket, vote as castVote, revealVotes, resetVotes, getCurrentSessionId, joinRoom, VoteHistoryEntry } from "../socket";
import { useSocketEvent } from "./use-socket-event";
import { motion, AnimatePresence } from "framer-motion";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Stack,
  Paper,
  TextField,
} from "@mui/material";
import {
  ContentCopy as ContentCopyIcon,
  ExitToApp as ExitToAppIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  EmojiEvents as EmojiEventsIcon,
} from "@mui/icons-material";
import React, { Suspense } from 'react';
const WinningVoteHistory = React.lazy(() => import('./WinningVoteHistory'));

interface Participant {
  id: string;
  name: string;
  vote: string | null;
  sessionId: string;
}

/**
 * Footer component for displaying copyright.
 * @returns {JSX.Element}
 */
const Footer = (): JSX.Element => (
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

/**
 * Room page. Handles SCRUM Poker voting, socket events, and round state.
 * @returns {JSX.Element}
 */
const Room = (): JSX.Element => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [vote, setVote] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [winningValue, setWinningValue] = useState<string | null>(null);
  const [customRoundId, setCustomRoundId] = useState("");
  const [currentRoundLabel, setCurrentRoundLabel] = useState<string>("");
  const [voteHistory, setVoteHistory] = useState<VoteHistoryEntry[]>([]);

  const name = location.state?.name;

  const handleVote = useCallback(
    (value: string) => {
      if (!roomId || !name) return;
      setVote(value);
      castVote(roomId, value);

      if (isRevealed) {
        const currentSessionId = getCurrentSessionId();
        const updatedParticipants = participants.map((p) =>
          p.sessionId === currentSessionId ? { ...p, vote: value } : p
        );
        setParticipants(updatedParticipants);
      }
    },
    [roomId, name, isRevealed, participants]
  );

  const handleReveal = useCallback(() => {
    if (!roomId) return;
    // If user entered a custom round label, use it, else undefined
    revealVotes(roomId, customRoundId.trim() || undefined);
    setCustomRoundId("");
  }, [roomId, customRoundId]);

  const handleReset = useCallback(() => {
    if (!roomId) return;
    // Don't optimistically update state - let the server response handle it
    // This ensures vote history is preserved correctly
    resetVotes(roomId);
  }, [roomId]);

  // Socket event handlers
  function handleUserJoined(state: { users: Participant[]; revealed: boolean; winningVoteHistory?: VoteHistoryEntry[] }) {
    setParticipants(state.users);
    setIsRevealed(state.revealed);
    // Only update vote history if server sends non-empty history
    if (state.winningVoteHistory && state.winningVoteHistory.length > 0) {
      setVoteHistory(state.winningVoteHistory);
    }
    
    // Update current user's vote state
    const currentSessionId = getCurrentSessionId();
    const currentUser = state.users.find(u => u.sessionId === currentSessionId);
    if (currentUser) {
      setVote(currentUser.vote);
    }
  }
  function handleUserVoted(state: { users: Participant[]; revealed: boolean; winningVoteHistory?: VoteHistoryEntry[] }) {
    setParticipants(state.users);
    setIsRevealed(state.revealed);
    // Only update vote history if server sends non-empty history
    if (state.winningVoteHistory && state.winningVoteHistory.length > 0) {
      setVoteHistory(state.winningVoteHistory);
    }
    
    // Update current user's vote state
    const currentSessionId = getCurrentSessionId();
    const currentUser = state.users.find(u => u.sessionId === currentSessionId);
    if (currentUser) {
      setVote(currentUser.vote);
    }
  }
  function handleVotesRevealed(state: { users: Participant[]; revealed: boolean; winningVoteHistory?: VoteHistoryEntry[] }) {
    setParticipants(state.users);
    setIsRevealed(true);
    // Always update vote history on reveal since this is when new history is created
    if (state.winningVoteHistory) {
      setVoteHistory(state.winningVoteHistory);
    }
  }
  function handleVotesReset(state: { users: Participant[]; revealed: boolean; winningVoteHistory?: VoteHistoryEntry[] }) {
    setParticipants(state.users);
    setIsRevealed(state.revealed);
    setVote(null);
    setWinningValue(null);
    
    // Preserve vote history - if server sends empty history, keep the current history
    // This ensures vote history is never lost from the UI perspective
    if (state.winningVoteHistory && state.winningVoteHistory.length > 0) {
      setVoteHistory(state.winningVoteHistory);
    }
    // If server sends empty history, keep existing history (works around backend issue)
  }
  function handleRoomNotFound() {
    setTimeout(() => navigate("/"), 2000);
  }

  // Use socket event hook
  useSocketEvent<{ users: Participant[]; revealed: boolean }>("userJoined", handleUserJoined);
  useSocketEvent<{ users: Participant[]; revealed: boolean }>("userVoted", handleUserVoted);
  useSocketEvent<{ users: Participant[]; revealed: boolean }>("votesRevealed", handleVotesRevealed);
  useSocketEvent("roomNotFound", handleRoomNotFound);
  useSocketEvent<{ users: Participant[]; revealed: boolean }>("votesReset", handleVotesReset);

  // Listen for vote history updates to get the latest round label
  useSocketEvent<VoteHistoryEntry[]>(
    "updateWinningVoteHistory",
    (history) => {
      if (history && history.length > 0) {
        const last = history[history.length - 1];
        setCurrentRoundLabel(last.id);
        setVoteHistory(history);
      }
    }
  );

  // Join room and subscribe to roomState
  // (Retain useEffect for imperative join/emit logic, not for socket event subscriptions)
  useEffect(() => {
    if (!roomId || !name) {
      navigate("/");
      return;
    }
    
    // Use the joinRoom method instead of socket.emit
    joinRoom(roomId, name)
      .then((state) => {
        setParticipants(state.users);
        setIsRevealed(state.revealed);
        if (state.winningVoteHistory && state.winningVoteHistory.length > 0) {
          setCurrentRoundLabel(state.winningVoteHistory[state.winningVoteHistory.length - 1].id);
          setVoteHistory(state.winningVoteHistory);
        }
        
        // Set current user's vote state
        const currentSessionId = getCurrentSessionId();
        const currentUser = state.users.find(u => u.sessionId === currentSessionId);
        if (currentUser) {
          setVote(currentUser.vote);
        }
      })
      .catch((error) => {
        console.error('Failed to join room:', error);
        navigate("/");
      });

    function handleRoomState(state: { users: Participant[]; revealed: boolean; winningValue?: string | null; history?: { id: string }[] }) {
      setParticipants(state.users);
      setIsRevealed(state.revealed);
      if (state.winningValue) setWinningValue(state.winningValue);
      if (state.history && state.history.length > 0) {
        setCurrentRoundLabel(state.history[state.history.length - 1].id);
      }
    }
    socket.on("roomState", handleRoomState);
    return () => {
      socket.off("roomState", handleRoomState);
    };
  }, [roomId, name, navigate]);

  useEffect(() => {
    if (isRevealed && participants.length > 0) {
      // Exclude '?' and '☕' from the vote tally
      const votes = participants
        .map((p) => p.vote)
        .filter((v): v is string => v !== null && v !== '?' && v !== '☕');

      if (votes.length === 0) {
        setWinningValue(null);
        return;
      }

      // Count votes
      const counts: Record<string, number> = votes.reduce((acc, vote) => {
        acc[vote] = (acc[vote] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Find the max count (majority)
      const maxCount = Math.max(...Object.values(counts));
      const majorityVotes = Object.entries(counts)
        .filter(([_, count]) => count === maxCount)
        .map(([value]) => value);

      let winning: string;
      if (majorityVotes.length === 1) {
        // Clear majority
        winning = majorityVotes[0];
      } else {
        // Tie: pick the highest value (numeric if possible, else lexicographic)
        winning = majorityVotes.sort((a, b) => {
          const aNum = Number(a);
          const bNum = Number(b);
          const aIsNum = !isNaN(aNum);
          const bIsNum = !isNaN(bNum);
          if (aIsNum && bIsNum) return bNum - aNum;
          if (aIsNum) return -1;
          if (bIsNum) return 1;
          return b.localeCompare(a);
        })[0];
      }
      setWinningValue(winning);
    } else {
      setWinningValue(null);
    }
  }, [participants, isRevealed]);

  const roomUrl = `${window.location.origin}/?room=${roomId}`;

  return (
    <Box
      minHeight="100vh"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="flex-start"
      sx={{
        backgroundColor: "background.default", // Dynamically adapt to theme
        color: "text.primary", // Ensure text color adapts to theme
        p: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Paper
        elevation={2}
        sx={{
          width: "100%",
          maxWidth: "1400px",
          margin: "0 auto 16px",
          p: { xs: 2, sm: 3, md: 4 },
          bgcolor: "background.paper", // Adapt to theme
          color: "text.primary", // Ensure text color adapts to theme
          backdropFilter: "blur(10px)",
          borderRadius: 2,
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)", // Add shadow for distinction
          border: "1px solid",
          borderColor: "divider", // Ensure border adapts to theme
          boxSizing: "border-box",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
          sx={{
            position: "relative", // Ensure proper positioning
            zIndex: 2, // Raise the z-index to prevent overlap
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            color="primary.dark"
            sx={{ fontWeight: 600 }}
          >
            Room: {roomId}
          </Typography>
          {isRevealed && currentRoundLabel && (
            <Typography
              variant="subtitle1"
              color="secondary"
              sx={{ fontWeight: 500, ml: 2 }}
              aria-label="Current round label"
            >
              Round: {currentRoundLabel}
            </Typography>
          )}
          <Stack direction="row" spacing={1}>
            <IconButton
              onClick={() => copyToClipboard(roomUrl)}
              title="Copy Room Link"
              aria-label="Copy Room Link"
            >
              <ContentCopyIcon />
            </IconButton>
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              startIcon={<ExitToAppIcon />}
              onClick={() => navigate("/")}
              sx={{ borderWidth: 2 }}
            >
              Leave
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Box
        display="grid"
        gridTemplateColumns={{ xs: "1fr", md: "2fr 1fr" }} // Adjusted column proportions
        alignItems="start" // Align items to the top
        justifyItems="stretch" // Stretch items to fill available space
        gap={4}
        width="100%"
        maxWidth="1400px" // Increased max width for better spacing
      >
        <Box>
          {isRevealed && winningValue && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  mb: 3,
                  textAlign: "center",
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  borderRadius: 2,
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="center"
                >
                  <EmojiEventsIcon sx={{ fontSize: "2rem" }} />
                  <Typography
                    variant="h5"
                    component="div"
                    sx={{ fontWeight: "bold" }}
                  >
                    Winning Value:
                  </Typography>
                  <Typography
                    variant="h4"
                    component="div"
                    sx={{ fontWeight: "bold" }}
                  >
                    {winningValue}
                  </Typography>
                </Stack>
              </Paper>
            </motion.div>
          )}

          <Paper
            elevation={2}
            sx={{
              width: "100%",
              maxWidth: "1400px",
              margin: "0 auto 16px",
              p: { xs: 2, sm: 3, md: 4 },
              bgcolor: "background.paper", // Adapt to theme
              color: "text.primary", // Ensure text color adapts to theme
              backdropFilter: "blur(10px)",
              borderRadius: 2,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)", // Add shadow for distinction
              border: "1px solid",
              borderColor: "divider", // Ensure border adapts to theme
              boxSizing: "border-box",
            }}
          >
            <Typography
              variant="h5"
              gutterBottom
              color="text.primary"
              sx={{ mb: 3, fontWeight: 600 }}
            >
              Participants ({participants.length})
            </Typography>
            <Stack spacing={2}>
              <AnimatePresence>
                {participants.map((participant) => (
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
                          fontWeight: participant.sessionId === getCurrentSessionId() ? 700 : 400,
                          color:
                            participant.sessionId === getCurrentSessionId()
                              ? "primary.dark"
                              : "text.secondary",
                        }}
                      >
                        {participant.name}{" "}
                        {participant.sessionId === getCurrentSessionId() && "(You)"}
                      </Typography>
                      <Chip
                        label={
                          isRevealed
                            ? participant.vote ?? "..."
                            : participant.vote
                            ? "✓"
                            : "?"
                        }
                        variant={participant.vote ? "filled" : "outlined"}
                        size="small"
                        sx={{
                          minWidth: "44px",
                          fontWeight: 700,
                          fontSize: '1.05rem',
                          letterSpacing: 0.5,
                          transition: "all 0.3s cubic-bezier(.4,0,.2,1)",
                          boxShadow: isRevealed && participant.vote === winningValue ? '0 2px 8px #22c55e55' : undefined,
                          ...(isRevealed && {
                            bgcolor:
                              participant.vote === winningValue
                                ? (theme) => theme.palette.mode === 'dark' ? '#22c55e' : '#5bc254'
                                : (theme) => theme.palette.mode === 'dark' ? '#2563eb' : '#2563eb',
                            color: '#fff',
                            border: 'none',
                          }),
                          ...(!isRevealed &&
                            participant.vote && {
                              bgcolor: (theme) => theme.palette.mode === 'dark' ? '#334155' : '#e0e7ef',
                              color: (theme) => theme.palette.mode === 'dark' ? '#fff' : '#2563eb',
                              border: 'none',
                            }),
                          ...(!participant.vote && {
                            borderColor: 'grey.400',
                            color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : 'grey.600',
                            bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : 'transparent',
                          }),
                        }}
                        aria-label={
                          isRevealed
                            ? `Vote: ${participant.vote ?? 'No vote'}`
                            : participant.vote
                            ? 'Voted'
                            : 'Not voted'
                        }
                      />
                    </Box>
                  </motion.div>
                ))}
              </AnimatePresence>
            </Stack>
          </Paper>
        </Box>

        <Paper
          elevation={2}
          sx={{
            width: "100%",
            maxWidth: "1400px",
            margin: "0 auto 16px",
            p: { xs: 2, sm: 3, md: 4 },
            bgcolor: "background.paper", // Adapt to theme
            color: "text.primary", // Ensure text color adapts to theme
            backdropFilter: "blur(10px)",
            borderRadius: 2,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)", // Add shadow for distinction
            border: "1px solid",
            borderColor: "divider", // Ensure border adapts to theme
            boxSizing: "border-box",
          }}
        >
          <Typography
            variant="h5"
            gutterBottom
            color="text.primary"
            sx={{ mb: 3, fontWeight: 600 }}
          >
            Vote
          </Typography>
          <Box
            display="grid"
            gridTemplateColumns={{ xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(4, 1fr)" }}
            gap={2}
            sx={{
              width: "100%",
              maxWidth: "1400px",
              margin: "0 auto",
              p: 3,
              backdropFilter: "blur(10px)",
              borderRadius: 2,
              borderColor: "divider",
              boxSizing: "border-box",
            }}
          >
            {["1", "2", "3", "5", "8", "13", "21", "?", "☕"].map((value) => (
              <motion.div
                key={value}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.96 }}
              >
                <Button
                  fullWidth
                  variant={vote === value ? "contained" : "outlined"}
                  color={vote === value ? "primary" : "secondary"}
                  onClick={() => handleVote(value)}
                  disabled={isRevealed}
                  sx={{
                    height: "64px",
                    fontSize: "1.15rem",
                    fontWeight: 700,
                    letterSpacing: 1,
                    borderWidth: 2,
                    borderColor: vote === value ? (theme) => theme.palette.primary.main : (theme) => theme.palette.divider,
                    boxShadow: vote === value ? "0 6px 18px rgba(34,197,94,0.18)" : "none",
                    background: vote === value
                      ? (theme) => theme.palette.mode === 'dark'
                        ? 'linear-gradient(90deg,#22c55e 0%,#2563eb 100%)'
                        : 'linear-gradient(90deg,#5bc254 0%,#2563eb 100%)'
                      : (theme) => theme.palette.background.paper,
                    color: vote === value
                      ? (theme) => theme.palette.mode === 'dark' ? '#fff' : theme.palette.primary.contrastText
                      : (theme) => theme.palette.text.primary,
                    transition: 'all 0.18s cubic-bezier(.4,0,.2,1)',
                    '&:hover': {
                      background: vote === value
                        ? (theme) => theme.palette.mode === 'dark'
                          ? 'linear-gradient(90deg,#16a34a 0%,#1d4ed8 100%)'
                          : 'linear-gradient(90deg,#4ea746 0%,#1d4ed8 100%)'
                        : (theme) => theme.palette.action.hover,
                      color: vote === value
                        ? (theme) => theme.palette.primary.contrastText
                        : (theme) => theme.palette.text.primary,
                      borderColor: vote === value
                        ? (theme) => theme.palette.primary.dark
                        : (theme) => theme.palette.divider,
                    },
                    outline: vote === value ? '2px solid #22c55e' : undefined,
                  }}
                  aria-label={`Vote ${value}`}
                >
                  {value}
                </Button>
              </motion.div>
            ))}
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              label="Round label (optional)"
              value={customRoundId}
              onChange={(e) => setCustomRoundId(e.target.value)}
              sx={{
                minWidth: 180,
                '& .MuiInputBase-input': {
                  color: 'text.primary',
                  backgroundColor: 'background.paper',
                },
                '& .MuiInputLabel-root': {
                  color: 'text.secondary',
                  // Improve label contrast in dark mode
                  '&.Mui-focused': {
                    color: 'primary.main',
                  },
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'divider',
                },
              }}
              InputLabelProps={{
                sx: {
                  color: 'text.secondary',
                  '&.Mui-focused': {
                    color: 'primary.main',
                  },
                },
              }}
              InputProps={{
                sx: {
                  color: 'text.primary',
                  backgroundColor: 'background.paper',
                },
              }}
            />
            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={<VisibilityIcon />}
              onClick={handleReveal}
              disabled={isRevealed || participants.every((p) => !p.vote)}
              sx={{
                backgroundColor: "#5bc254",
                color: "#fff",
                '&:hover': {
                  backgroundColor: "#4ea746",
                  color: "#fff",
                },
              }}
            >
              Reveal Votes
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="secondary"
              startIcon={<RefreshIcon />}
              onClick={handleReset}
              disabled={!isRevealed && participants.every((p) => !p.vote)}
              sx={{
                borderWidth: 2,
                borderColor: "#5bc254",
                color: "#5bc254",
                '&:hover': {
                  backgroundColor: "rgba(91, 196, 84, 0.12)",
                  borderColor: "#4ea746",
                  color: "#4ea746",
                },
              }}
            >
              Reset
            </Button>
          </Stack>
        </Paper>
      </Box>
      <Suspense fallback={<div>Loading history...</div>}>
        <WinningVoteHistory voteHistory={voteHistory} />
      </Suspense>
      <Footer />
    </Box>
  );
};

export default Room;

/**
 * Copies text to clipboard and logs the result.
 * @param text - The text to copy
 */
const copyToClipboard = (text: string): void => {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      console.log("Room link copied to clipboard");
    })
    .catch((err) => {
      console.error("Failed to copy text: ", err);
    });
};
