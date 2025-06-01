// Add type for testability
export const getSocketUrl = (): string => {
  // Check for explicit environment variable first
  const envUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SOCKET_URL;
  
  console.log('Environment debug:', {
    VITE_SOCKET_URL: envUrl,
    DEV: typeof import.meta !== 'undefined' ? import.meta.env?.DEV : 'undefined',
    NODE_ENV: typeof import.meta !== 'undefined' ? import.meta.env?.NODE_ENV : 'undefined',
    hostname: typeof window !== 'undefined' ? window.location?.hostname : 'server-side'
  });
  
  if (envUrl) {
    console.log('Using VITE_SOCKET_URL:', envUrl);
    return envUrl;
  }
  
  // Check if we're in development mode
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;
  
  // For local development, use the deployed backend to avoid CORS issues
  if (isDev) {
    console.log('Using deployed backend for local development:', 'https://scrum-poker.hyrivera.com');
    return 'https://scrum-poker.hyrivera.com';
  }
  
  // For production (including Cloudflare Pages), always use the deployed backend
  console.log('Using deployed backend (production):', 'https://scrum-poker.hyrivera.com');
  return 'https://scrum-poker.hyrivera.com';
};
