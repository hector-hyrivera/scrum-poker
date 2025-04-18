import { useEffect, useRef } from 'react';
import { socket } from '../socket';

interface UseSocketEventOptions {
  /**
   * If true, the handler will be registered only once (using socket.once).
   * Otherwise, socket.on will be used (default).
   */
  once?: boolean;
}

/**
 * React hook to subscribe to a socket event and automatically clean up on unmount.
 * @param event - The socket event name
 * @param handler - The event handler function
 * @param options - Optional settings (e.g., once)
 */
export function useSocketEvent<T>(
  event: string,
  handler: (data: T) => void,
  options?: UseSocketEventOptions
) {
  const handlerRef = useRef(handler);

  // Always keep the latest handler
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    function eventListener(data: T) {
      handlerRef.current(data);
    }
    if (options?.once) {
      socket.once(event, eventListener);
    } else {
      socket.on(event, eventListener);
    }
    return () => {
      socket.off(event, eventListener);
    };
  }, [event, options?.once]);
}
