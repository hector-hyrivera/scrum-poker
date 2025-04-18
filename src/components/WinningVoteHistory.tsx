import { useState } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Chip, Stack } from '@mui/material';
import { useSocketEvent } from './use-socket-event';

interface VoteHistoryEntry {
  id: string;
  votes: { name: string; vote: string | null; sessionId: string }[];
  participants: number;
  winningCard: string;
  winnerName?: string;
  timestamp: number;
}

export function WinningVoteHistory() {
  const [history, setHistory] = useState<VoteHistoryEntry[]>([]);

  const handleUpdateWinningVoteHistory = (updatedHistory: VoteHistoryEntry[]) => {
    setHistory(updatedHistory);
  };

  const handleResetVotes = () => {
    // Do not clear history on reset
  };

  useSocketEvent('updateWinningVoteHistory', handleUpdateWinningVoteHistory);
  useSocketEvent('votesReset', handleResetVotes);

  if (!history.length) return null;

  return (
    <TableContainer
      component={Paper}
      sx={{ width: '100%', maxWidth: '1400px', margin: '16px auto', p: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid', borderColor: 'divider', overflowX: 'auto', borderTop: 'none' }}
    >
      <Typography variant="h5" gutterBottom color="text.primary" sx={{ mb: 3, fontWeight: 600, fontSize: '1.25rem' }}>
        Vote History
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Round</TableCell>
            <TableCell>Winner</TableCell>
            <TableCell>Winning Card</TableCell>
            <TableCell>Participants</TableCell>
            <TableCell>Votes</TableCell>
            <TableCell>Time</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {history.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{entry.id}</TableCell>
              <TableCell>{entry.winnerName || '-'}</TableCell>
              <TableCell>{entry.winningCard}</TableCell>
              <TableCell>{entry.participants}</TableCell>
              <TableCell>
                <Stack direction="row" spacing={1}>
                  {entry.votes.map((v, idx) => (
                    <Chip key={v.sessionId + idx} label={`${v.name}: ${v.vote ?? '-'}`} size="small" />
                  ))}
                </Stack>
              </TableCell>
              <TableCell>{new Date(entry.timestamp).toLocaleTimeString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default WinningVoteHistory;