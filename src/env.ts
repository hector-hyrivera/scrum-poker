export const getSocketUrl = (): string => {
  // Use import.meta.env in browser, process.env in Node (tests)
  let url: string | undefined;
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    url = import.meta.env.VITE_SOCKET_URL;
    if (!url && typeof window !== 'undefined' && window.location) {
      url = window.location.origin;
    }
  } else if (typeof process !== 'undefined' && process.env) {
    url = process.env.VITE_SOCKET_URL;
    if (!url && typeof window !== 'undefined' && window.location) {
      url = window.location.origin;
    }
  }
  return url || 'http://localhost:3001';
};
