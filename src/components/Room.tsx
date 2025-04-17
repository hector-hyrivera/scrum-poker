import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { socket } from "../socket";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
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
  QrCode as QrCodeIcon,
  ExitToApp as ExitToAppIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  EmojiEvents as EmojiEventsIcon,
} from "@mui/icons-material";
import { WinningVoteHistory } from "./WinningVoteHistory";

interface Participant {
  id: string;
  name: string;
  vote: string | null;
}

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

const Room = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [vote, setVote] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [winningValue, setWinningValue] = useState<string | null>(null);
  const [customRoundId, setCustomRoundId] = useState("");

  const name = location.state?.name;

  const handleVote = useCallback(
    (value: string) => {
      if (!roomId || !name) return;
      setVote(value);
      socket.emit("vote", { roomId, vote: value });

      if (isRevealed) {
        const updatedParticipants = participants.map((p) =>
          p.id === socket.id ? { ...p, vote: value } : p
        );
        setParticipants(updatedParticipants);
      }
    },
    [roomId, name, isRevealed, participants]
  );

  const handleReveal = useCallback(() => {
    if (!roomId) return;
    // If user entered a custom round label, use it, else undefined
    socket.emit("reveal", { roomId, roundId: customRoundId.trim() || undefined });
    setCustomRoundId("");
  }, [roomId, customRoundId]);

  const handleReset = useCallback(() => {
    if (!roomId) return;
    setVote(null);
    setWinningValue(null);
    setParticipants((prevParticipants) =>
      prevParticipants.map((participant) => ({ ...participant, vote: null }))
    );
    socket.emit("reset", roomId);
  }, [roomId]);

  const toggleQRCode = useCallback(() => {
    setShowQRCode((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!roomId || !name) {
      navigate("/");
      return;
    }

    const handleUserJoined = (state: {
      users: Participant[];
      revealed: boolean;
    }) => {
      console.log("User joined, state:", state);
      setParticipants(state.users);
      setIsRevealed(state.revealed);
    };

    const handleUserVoted = (state: {
      users: Participant[];
      revealed: boolean;
    }) => {
      console.log("User voted, state:", state);
      setParticipants(state.users);
      setIsRevealed(state.revealed);
    };

    const handleVotesRevealed = (state: {
      users: Participant[];
      revealed: boolean;
    }) => {
      console.log("Votes revealed, state:", state);
      setParticipants(state.users);
      setIsRevealed(true);
    };

    const handleVotesReset = () => {
      console.log("Votes reset");
      setIsRevealed(false);
      setVote(null);
      setWinningValue(null);
    };

    const handleRoomNotFound = () => {
      console.log("Room not found");
      setTimeout(() => navigate("/"), 2000);
    };

    const sessionId = localStorage.getItem("sessionId");
    socket.emit("joinRoom", { roomId, name, sessionId });

    socket.on("userJoined", handleUserJoined);
    socket.on("userVoted", handleUserVoted);
    socket.on("votesRevealed", handleVotesRevealed);
    socket.on("votesReset", handleVotesReset);
    socket.on("roomNotFound", handleRoomNotFound);
    socket.emit("getRoomState", roomId);
    socket.on(
      "roomState",
      (state: { users: Participant[]; revealed: boolean }) => {
        console.log("Received initial room state:", state);
        setParticipants(state.users);
        setIsRevealed(state.revealed);
      }
    );

    return () => {
      socket.off("userJoined", handleUserJoined);
      socket.off("userVoted", handleUserVoted);
      socket.off("votesRevealed", handleVotesRevealed);
      socket.off("votesReset", handleVotesReset);
      socket.off("roomNotFound", handleRoomNotFound);
      socket.off("roomState");
    };
  }, [roomId, name, navigate]);

  useEffect(() => {
    if (isRevealed && participants.length > 0) {
      const votes = participants
        .map((p) => p.vote)
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

      const averageCount =
        countValues.reduce((sum, count) => sum + count, 0) / countValues.length;

      const differences = uniqueVoteValues.map((value) => ({
        value,
        count: counts[value],
        diff: Math.abs(counts[value] - averageCount),
      }));

      const minDifference = Math.min(...differences.map((d) => d.diff));

      let closestValues = differences.filter((d) => d.diff === minDifference);

      if (closestValues.length > 1) {
        const maxCount = Math.max(...closestValues.map((v) => v.count));
        closestValues = closestValues.filter((v) => v.count === maxCount);

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

  useEffect(() => {
    const handleVotesReset = (state: { users: Participant[] }) => {
      console.log("Votes reset");
      setParticipants(state.users);
      setIsRevealed(false);
      setVote(null);
      setWinningValue(null);
    };

    socket.on("votesReset", handleVotesReset);

    return () => {
      socket.off("votesReset", handleVotesReset);
    };
  }, []);

  useEffect(() => {
    const handleUserJoined = (state: { users: Participant[]; revealed: boolean }) => {
      console.log("User joined, state:", state);
      setParticipants(state.users);
      setIsRevealed(state.revealed);
    };

    const handleVotesReset = (state: { users: Participant[] }) => {
      console.log("Votes reset");
      setParticipants(state.users);
      setIsRevealed(false);
      setVote(null);
      setWinningValue(null);
    };

    socket.on("userJoined", handleUserJoined);
    socket.on("votesReset", handleVotesReset);

    return () => {
      socket.off("userJoined", handleUserJoined);
      socket.off("votesReset", handleVotesReset);
    };
  }, []);

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
          <Stack direction="row" spacing={1}>
            <IconButton onClick={toggleQRCode} title="Show/Hide QR Code">
              <QrCodeIcon />
            </IconButton>
            <IconButton
              onClick={() => copyToClipboard(roomUrl)}
              title="Copy Room Link"
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
        {showQRCode && (
          <Box sx={{ mt: 2, textAlign: "center" }}>
            <QRCodeSVG value={roomUrl} size={128} />
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Scan to join or share link: {roomUrl}
            </Typography>
          </Box>
        )}
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
                          fontWeight: participant.id === socket.id ? 700 : 400,
                          color:
                            participant.id === socket.id
                              ? "primary.dark"
                              : "text.secondary",
                        }}
                      >
                        {participant.name}{" "}
                        {participant.id === socket.id && "(You)"}
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
                          minWidth: "40px",
                          fontWeight: 600,
                          transition: "all 0.3s ease",
                          ...(isRevealed && {
                            bgcolor:
                              participant.vote === winningValue
                                ? "success.light"
                                : "primary.light",
                            color:
                              participant.vote === winningValue
                                ? "success.contrastText"
                                : "primary.contrastText",
                          }),
                          ...(!isRevealed &&
                            participant.vote && {
                              bgcolor: "secondary.light",
                              color: "secondary.contrastText",
                            }),
                          ...(!participant.vote && {
                            borderColor: "grey.400",
                            color: "grey.600",
                          }),
                        }}
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
              bgcolor: "background.paper",
              backdropFilter: "blur(10px)",
              borderRadius: 2,
              // boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
              // border: "1px solid",
              borderColor: "divider",
              boxSizing: "border-box",
            }}
          >
            {["1", "2", "3", "5", "8", "13", "21", "?", "☕"].map((value) => (
              <motion.div
                key={value}
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
                    height: "60px",
                    fontSize: "1rem",
                    fontWeight: 600,
                    boxShadow: vote === value ? "0 4px 12px rgba(0,0,0,0.2)" : "none",
                    backgroundColor: vote === value ? "#5bc254" : undefined,
                    borderColor: vote === value ? "#5bc254" : undefined,
                    color: vote === value ? "#fff" : undefined,
                    '&:hover': {
                      backgroundColor: vote === value ? "#4ea746" : undefined,
                      color: vote === value ? "#fff" : undefined,
                    },
                  }}
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
                  backgroundColor: "rgba(91, 194, 84, 0.12)",
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
      <WinningVoteHistory />
      <Footer />
    </Box>
  );
};

export default Room;

const copyToClipboard = (text: string) => {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      console.log("Room link copied to clipboard");
    })
    .catch((err) => {
      console.error("Failed to copy text: ", err);
    });
};
