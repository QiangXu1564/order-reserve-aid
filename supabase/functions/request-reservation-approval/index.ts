import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerName, customerPhone, date, time, numberOfPeople, conversationId } = await req.json();

    console.log('Creating approval request:', { customerName, customerPhone, date, time, numberOfPeople });

    if (!customerName || !customerPhone || !date || !time || !numberOfPeople) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          approvalId: null 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create approval request
    const { data, error } = await supabase
      .from('reservation_approvals')
      .insert({
        customer_name: customerName,
        customer_phone: customerPhone,
        reservation_date: date,
        reservation_time: time,
        number_of_people: numberOfPeople,
        conversation_id: conversationId,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create approval request',
          approvalId: null 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Approval request created:', data.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        approvalId: data.id,
        message: 'Approval request created. Please wait for staff confirmation.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        approvalId: null 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
