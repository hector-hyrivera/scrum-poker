import React, { Suspense, useState, useEffect, useMemo, JSX } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import Home from './components/Home';
const Room = React.lazy(() => import('./components/Room'));
const ConnectionStatus = React.lazy(() => import('./components/ConnectionStatus'));
import './App.css'
import { CssBaseline, Switch, FormControlLabel } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

// Theme toggle button as a separate component
interface ThemeToggleButtonProps {
  darkMode: boolean;
  onToggle: () => void;
}

const ThemeToggleSwitch = ({ darkMode, onToggle }: ThemeToggleButtonProps) => (
  <FormControlLabel
    control={
      <Switch
        checked={darkMode}
        onChange={onToggle}
        color="primary"
        inputProps={{
          'aria-label': darkMode ? 'Switch to light mode' : 'Switch to dark mode',
        }}
      />
    }
    label={darkMode ? <LightModeIcon /> : <DarkModeIcon />}
    labelPlacement="start"
    className="ml-auto"
  />
);

/**
 * Main application component. Sets up MUI theme, dark mode, and routing.
 *
 * @returns Main app JSX element
 */
function App(): JSX.Element {
  // Persist dark mode preference in localStorage
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? saved === 'true' : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  // Memoize theme for performance
  const theme = useMemo(() => createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: darkMode ? '#90caf9' : '#2C3E50',
        light: darkMode ? '#e3f2fd' : '#34495E',
        dark: darkMode ? '#42a5f5' : '#1A252F',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: darkMode ? '#f48fb1' : '#7F8C8D',
        light: darkMode ? '#f8bbd0' : '#95A5A6',
        dark: darkMode ? '#ec407a' : '#5D6D7E',
        contrastText: '#FFFFFF',
      },
      background: {
        default: darkMode ? '#121212' : '#FFFFFF',
        paper: darkMode ? '#1E1E1E' : 'transparent',
      },
      text: {
        primary: darkMode ? '#FFFFFF' : '#2C3E50',
        secondary: darkMode ? '#B0BEC5' : '#7F8C8D',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 600, letterSpacing: '-0.02em' },
      h2: { fontWeight: 600, letterSpacing: '-0.02em' },
      h3: { fontWeight: 600, letterSpacing: '-0.02em' },
      h4: { fontWeight: 600, letterSpacing: '-0.02em' },
      h5: { fontWeight: 600, letterSpacing: '-0.02em' },
      h6: { fontWeight: 600, letterSpacing: '-0.02em' },
      subtitle1: { fontWeight: 500, letterSpacing: '0.01em' },
      body1: { letterSpacing: '0.01em' },
      button: { fontWeight: 600, letterSpacing: '0.02em' },
    },
  }), [darkMode]);

  useEffect(() => {
    document.body.style.backgroundColor = theme.palette.background.default;
  }, [darkMode, theme]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="flex justify-end items-center p-2 relative w-full">
        <div className="absolute right-4 top-4 z-50">
          <ThemeToggleSwitch darkMode={darkMode} onToggle={() => setDarkMode((v) => !v)} />
        </div>
      </div>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomId" element={
            <Suspense fallback={null}>
              <Room />
            </Suspense>
          } />
          {/* 404 fallback route */}
          <Route path="*" element={
            <div className="flex flex-col items-center justify-center h-96">
              <h2 className="text-2xl font-bold mb-4">404 - Page Not Found</h2>
              <p className="text-gray-600">Sorry, the page you are looking for does not exist.</p>
            </div>
          } />
        </Routes>
      </Router>
      <Suspense fallback={null}>
        <ConnectionStatus />
      </Suspense>
    </ThemeProvider>
  );
}

export default App;
