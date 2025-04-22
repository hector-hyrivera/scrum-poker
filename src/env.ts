// Add type for testability
export const getSocketUrl = (): string => {
  const url = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SOCKET_URL;
  if (url) return url;
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return 'http://localhost:3001';
};
