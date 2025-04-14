import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import Home from './components/Home';
import Room from './components/Room';
import './App.css'
import { useState, useEffect } from 'react';
import { CssBaseline, IconButton } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

declare module '@mui/material/styles' {
  interface Palette {
    accent: Palette['primary'];
  }
  interface PaletteOptions {
    accent?: PaletteOptions['primary'];
  }
}

declare module '@mui/material/Chip' {
  interface ChipPropsColorOverrides {
    accent: true;
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    accent: true;
  }
}

function App() {
  const [darkMode, setDarkMode] = useState(false);

  const theme = createTheme({
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
      accent: {
        main: darkMode ? '#ffb74d' : '#49a942',
        light: darkMode ? '#ffe97d' : '#6bc164',
        dark: darkMode ? '#c88719' : '#3a8a34',
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
      h1: {
        fontWeight: 600,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontWeight: 600,
        letterSpacing: '-0.02em',
      },
      h3: {
        fontWeight: 600,
        letterSpacing: '-0.02em',
      },
      h4: {
        fontWeight: 600,
        letterSpacing: '-0.02em',
      },
      h5: {
        fontWeight: 600,
        letterSpacing: '-0.02em',
      },
      h6: {
        fontWeight: 600,
        letterSpacing: '-0.02em',
      },
      subtitle1: {
        fontWeight: 500,
        letterSpacing: '0.01em',
      },
      body1: {
        letterSpacing: '0.01em',
      },
      button: {
        fontWeight: 600,
        letterSpacing: '0.02em',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            margin: 0, // Removes any default margin
            padding: 0, // Removes any default padding
            minHeight: '100vh',
            backgroundColor: '#f9fafb', // Matches Tailwind's background color
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 12,
            padding: '8px 24px',
            fontWeight: 500,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-2px)',
            },
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            },
          },
          outlined: {
            borderWidth: 2,
            '&:hover': {
              borderWidth: 2,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            boxShadow: 'none',
            background: 'transparent',
            border: 'none',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: 'none',
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            transition: 'all 0.2s ease-in-out',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
              backdropFilter: 'blur(8px)',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              transition: 'all 0.2s ease-in-out',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease-in-out',
            fontWeight: 600,
            border: '1px solid rgba(255, 255, 255, 0.3)',
          },
        },
      },
      MuiContainer: {
        styleOverrides: {
          root: {
            maxWidth: 'none !important',
            padding: '0 !important',
          },
        },
      },
    },
  });

  useEffect(() => {
    document.body.style.backgroundColor = theme.palette.background.default;
  }, [darkMode, theme]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end', padding: '4px 8px 0 8px' }}>
        <IconButton
          onClick={() => setDarkMode(!darkMode)}
          color="inherit"
          style={{
            backgroundColor: darkMode ? '#424242' : '#E0E0E0',
            color: darkMode ? '#FFFFFF' : '#000000',
            borderRadius: '50%',
            padding: '4px 4px 0 4px', // Updated padding
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
          }}
        >
          {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </div>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomId" element={<Room />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
