// Add type for testability
export type GetSocketUrlOpts = {
  importMetaEnv?: Record<string, string | undefined>;
  processEnv?: Record<string, string | undefined>;
  locationOrigin?: string;
};

export const getSocketUrl = (opts: GetSocketUrlOpts = {}): string => {
  const { importMetaEnv, processEnv, locationOrigin } = opts;

  let url: string | undefined;
  if (importMetaEnv) {
    url = importMetaEnv.VITE_SOCKET_URL;
    if (!url && locationOrigin) {
      url = locationOrigin;
    }
  } else if (processEnv) {
    url = processEnv.VITE_SOCKET_URL;
    if (!url && locationOrigin) {
      url = locationOrigin;
    }
  } else if (typeof import.meta !== 'undefined' && import.meta.env) {
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
