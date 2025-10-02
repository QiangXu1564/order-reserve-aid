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

    // Comprehensive input validation
    if (!customerName || !customerPhone || !date || !time || !numberOfPeople) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          approvalId: null 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate customerName
    const trimmedName = String(customerName).trim().substring(0, 200);
    if (trimmedName.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Customer name cannot be empty', approvalId: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate customerPhone
    const trimmedPhone = String(customerPhone).trim().substring(0, 50);
    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    if (!phoneRegex.test(trimmedPhone)) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format', approvalId: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return new Response(
        JSON.stringify({ error: 'Invalid date format. Use YYYY-MM-DD', approvalId: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if date is not in the past
    const reservationDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (reservationDate < today) {
      return new Response(
        JSON.stringify({ error: 'Reservation date cannot be in the past', approvalId: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if date is within 1 year
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    if (reservationDate > oneYearFromNow) {
      return new Response(
        JSON.stringify({ error: 'Reservation date cannot be more than 1 year in the future', approvalId: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate time format (HH:MM:SS)
    const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
    if (!timeRegex.test(time)) {
      return new Response(
        JSON.stringify({ error: 'Invalid time format. Use HH:MM:SS', approvalId: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate numberOfPeople
    const numPeople = parseInt(numberOfPeople, 10);
    if (isNaN(numPeople) || numPeople < 1 || numPeople > 100) {
      return new Response(
        JSON.stringify({ error: 'Number of people must be between 1 and 100', approvalId: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate conversationId if provided
    const sanitizedConversationId = conversationId ? String(conversationId).trim().substring(0, 100) : null;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create approval request with sanitized data
    const { data, error } = await supabase
      .from('reservation_approvals')
      .insert({
        customer_name: trimmedName,
        customer_phone: trimmedPhone,
        reservation_date: date,
        reservation_time: time,
        number_of_people: numPeople,
        conversation_id: sanitizedConversationId,
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
