import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log('Received reservation:', body);

    const { customer_name, customer_phone, number_of_people, reservation_time } = body;

    // Input validation and sanitization
    if (!customer_name || !customer_phone || !number_of_people || !reservation_time) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: customer_name, customer_phone, number_of_people, reservation_time' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate data types and lengths
    if (typeof customer_name !== 'string' || customer_name.trim().length === 0 || customer_name.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Invalid customer_name: must be a non-empty string with max 200 characters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (typeof customer_phone !== 'string' || customer_phone.trim().length === 0 || customer_phone.length > 50) {
      return new Response(
        JSON.stringify({ error: 'Invalid customer_phone: must be a non-empty string with max 50 characters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (typeof number_of_people !== 'number' || number_of_people < 1 || number_of_people > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid number_of_people: must be a number between 1 and 100' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate reservation_time is a valid ISO 8601 date
    const reservationDate = new Date(reservation_time);
    if (isNaN(reservationDate.getTime())) {
      return new Response(
        JSON.stringify({ error: 'Invalid reservation_time: must be a valid ISO 8601 date' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedName = customer_name.trim().substring(0, 200);
    const sanitizedPhone = customer_phone.trim().substring(0, 50);

    const { data, error } = await supabase
      .from('reservations')
      .insert({
        customer_name: sanitizedName,
        customer_phone: sanitizedPhone,
        number_of_people,
        reservation_time: reservationDate.toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting reservation:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Reservation created successfully:', data);

    return new Response(
      JSON.stringify({ success: true, reservation: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
