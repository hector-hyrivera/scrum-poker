import { type JSX } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Chip, Stack } from '@mui/material';
import { VoteHistoryEntry } from '../socket';

interface WinningVoteHistoryProps {
  voteHistory: VoteHistoryEntry[];
}

/**
 * Displays the history of winning votes for each round.
 * @returns {JSX.Element | null}
 */
export function WinningVoteHistory({ voteHistory }: WinningVoteHistoryProps): JSX.Element | null {
  if (!voteHistory.length) return null;

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
            <TableCell>Participants</TableCell>
            <TableCell>Winning Card</TableCell>
            <TableCell>Winner</TableCell>
            <TableCell>Votes</TableCell>
            <TableCell>Time</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {voteHistory.map((entry: VoteHistoryEntry) => (
            <TableRow key={entry.id}>
              <TableCell>{entry.id}</TableCell>
              <TableCell>{entry.participants}</TableCell>
              <TableCell>{entry.winningCard}</TableCell>
              <TableCell>{entry.winnerName || '-'}</TableCell>
              <TableCell>
                <Stack direction="row" spacing={1}>
                  {entry.votes.map((v: any, idx: number) => (
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