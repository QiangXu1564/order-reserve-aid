import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reservationId, action, content } = await req.json();

    const LEAPING_API_URL = Deno.env.get('LEAPING_API_URL');
    const AGENT_SNAPSHOT_ID = Deno.env.get('AGENT_SNAPSHOT_ID');
    const BEARER_TOKEN = Deno.env.get('BEARER_TOKEN');

    if (!LEAPING_API_URL || !AGENT_SNAPSHOT_ID || !BEARER_TOKEN) {
      console.error('Missing Leaping AI configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const endUserId = `reservation_${reservationId}`;
    const url = `${LEAPING_API_URL}/${AGENT_SNAPSHOT_ID}?end_user_id=${endUserId}`;

    if (action === 'connect') {
      // For SSE connection, stream the response
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${BEARER_TOKEN}`,
          Accept: "text/event-stream",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Connection error: ${response.status}`);
      }

      // Stream the response back to the client
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else if (action === 'send') {
      // For sending messages
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${BEARER_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "user_message",
          content,
        }),
      });

      if (!response.ok) {
        throw new Error("Error sending message");
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

  } catch (error) {
    console.error("Leaping AI proxy error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
