import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';
import { socket } from '../socket';

const WinningVoteHistory: React.FC = () => {
  const [history, setHistory] = useState<{ participants: number; winningCard: string }[]>([]);

  useEffect(() => {
    const handleUpdateWinningVoteHistory = (updatedHistory: { participants: number; winningCard: string }[]) => {
      setHistory(updatedHistory);
    };

    const handleResetVotes = () => {
      setHistory([]);
    };

    socket.on('updateWinningVoteHistory', handleUpdateWinningVoteHistory);
    socket.on('votesReset', handleResetVotes);

    return () => {
      socket.off('updateWinningVoteHistory', handleUpdateWinningVoteHistory);
      socket.off('votesReset', handleResetVotes);
    };
  }, []);

  return (
    <TableContainer component={Paper} sx={{ width: '100%', maxWidth: '1400px', margin: '16px auto', p: 3, bgcolor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', borderRadius: 2, boxSizing: 'border-box' }}>
      <Typography variant="h5" gutterBottom color="text.primary" sx={{ mb: 3, fontWeight: 600, fontSize: '1.25rem' }}>
        Last vote result
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Winning Card</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {history.map((entry, index) => (
            <TableRow key={index}>
              <TableCell>{entry.winningCard}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default WinningVoteHistory;