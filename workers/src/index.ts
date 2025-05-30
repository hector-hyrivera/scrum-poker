import { RoomObject } from './room-object';
import { Env } from './types';

/**
 * Main Cloudflare Worker that handles routing and room management.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Add CORS headers to all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    try {
      // Route: Create a new room
      if (url.pathname === '/api/rooms' && request.method === 'POST') {
        return await handleCreateRoom(request, env, corsHeaders);
      }

      // Route: Join a room or get room state
      if (url.pathname.startsWith('/api/rooms/')) {
        const roomId = url.pathname.split('/')[3];
        if (!roomId) {
          return new Response('Room ID required', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        // Get Durable Object for this room
        const roomObjectId = env.ROOM_OBJECT.idFromName(roomId);
        const roomObject = env.ROOM_OBJECT.get(roomObjectId);

        // Forward request to the Durable Object
        const roomUrl = new URL(request.url);
        roomUrl.pathname = `/room/${roomId}`;
        
        const roomRequest = new Request(roomUrl.toString(), {
          method: request.method,
          headers: request.headers,
          body: request.body,
        });

        const response = await roomObject.fetch(roomRequest);
        
        // Add CORS headers to the response
        const newResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            'Content-Type': response.headers.get('Content-Type') || 'application/json',
            ...corsHeaders,
          },
        });

        return newResponse;
      }

      // Route: Handle WebSocket connections
      if (url.pathname.startsWith('/ws/')) {
        const roomId = url.pathname.split('/')[2];
        if (!roomId) {
          return new Response('Room ID required', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        // Get Durable Object for this room
        const roomObjectId = env.ROOM_OBJECT.idFromName(roomId);
        const roomObject = env.ROOM_OBJECT.get(roomObjectId);

        // Forward WebSocket request to Durable Object
        const roomUrl = new URL(request.url);
        roomUrl.pathname = `/ws/${roomId}`;
        
        const roomRequest = new Request(roomUrl.toString(), {
          method: request.method,
          headers: request.headers,
        });

        return await roomObject.fetch(roomRequest);
      }

      // Route: Room page (forward to Durable Object)
      if (url.pathname.startsWith('/room/')) {
        const roomId = url.pathname.split('/')[2];
        if (!roomId) {
          return new Response('Room ID required', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        const roomObjectId = env.ROOM_OBJECT.idFromName(roomId);
        const roomObject = env.ROOM_OBJECT.get(roomObjectId);

        // Forward request to the Durable Object
        const roomUrl = new URL(request.url);
        roomUrl.pathname = `/room/${roomId}`;
        
        const roomRequest = new Request(roomUrl.toString(), {
          method: request.method,
          headers: request.headers,
        });

        return await roomObject.fetch(roomRequest);
      }

      // Health check endpoint
      if (url.pathname === '/health') {
        return new Response('OK', { headers: corsHeaders });
      }

      // Serve static files from the dist folder
      return await env.ASSETS.fetch(request);

    } catch (error) {
      console.error('Worker error:', error);
      
      // If static file serving fails, try to serve index.html for SPA routing
      try {
        const indexRequest = new Request(new URL('/', request.url).toString(), {
          method: 'GET',
        });
        return await env.ASSETS.fetch(indexRequest);
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        return new Response('Internal Server Error', { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }
  },
};

/**
 * Handles room creation requests.
 */
async function handleCreateRoom(
  request: Request, 
  env: Env, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const { name, sessionId } = await request.json() as { name: string; sessionId: string };
    
    if (!name || !sessionId) {
      return new Response('Name and sessionId are required', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Generate a human-readable room ID
    const roomId = generateRoomId();

    // Get Durable Object for this room
    const roomObjectId = env.ROOM_OBJECT.idFromName(roomId);
    const roomObject = env.ROOM_OBJECT.get(roomObjectId);

    // Create the room
    const roomUrl = new URL(`https://example.com/room/${roomId}?action=createRoom`);
    const roomRequest = new Request(roomUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sessionId }),
    });

    const response = await roomObject.fetch(roomRequest);
    const result = await response.json() as { roomId: string; sessionId: string };

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('Error creating room:', error);
    return new Response('Failed to create room', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

/**
 * Generates a human-readable room ID (e.g., blue-apple-42).
 */
function generateRoomId(): string {
  const adjectives = ['blue', 'green', 'red', 'quick', 'brave', 'calm', 'lucky', 'bright', 'kind', 'bold'];
  const nouns = ['apple', 'tiger', 'river', 'cloud', 'mountain', 'forest', 'ocean', 'star', 'wolf', 'falcon'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(10 + Math.random() * 90); // 2-digit number
  return `${adj}-${noun}-${number}`;
}

// Export the Durable Object class
export { RoomObject }; 