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
    const { date, time, numberOfPeople } = await req.json();

    console.log('Checking availability for:', { date, time, numberOfPeople });

    if (!date || !time || !numberOfPeople) {
      return new Response(
        JSON.stringify({ 
          available: false, 
          reason: 'Missing required fields: date, time, numberOfPeople' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Combine date and time into a timestamp
    const reservationDateTime = new Date(`${date}T${time}`);
    console.log('Reservation datetime:', reservationDateTime);

    // Check if the date is in the past
    if (reservationDateTime < new Date()) {
      return new Response(
        JSON.stringify({ 
          available: false, 
          reason: 'Cannot make reservations in the past' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check restaurant hours (example: 12:00 PM - 11:00 PM)
    const hours = reservationDateTime.getHours();
    if (hours < 12 || hours >= 23) {
      return new Response(
        JSON.stringify({ 
          available: false, 
          reason: 'Restaurant is closed. Hours: 12:00 PM - 11:00 PM' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check maximum capacity per time slot (example: 50 people)
    const MAX_CAPACITY = 50;
    
    // Query existing reservations within 1 hour window
    const startTime = new Date(reservationDateTime.getTime() - 30 * 60000); // 30 min before
    const endTime = new Date(reservationDateTime.getTime() + 30 * 60000); // 30 min after

    const { data: existingReservations, error } = await supabase
      .from('reservations')
      .select('number_of_people')
      .gte('reservation_time', startTime.toISOString())
      .lte('reservation_time', endTime.toISOString())
      .in('status', ['pending', 'confirmed']);

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ 
          available: false, 
          reason: 'Error checking availability' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Calculate total people in that time slot
    const totalPeople = existingReservations?.reduce(
      (sum, res) => sum + res.number_of_people, 
      0
    ) || 0;

    console.log('Total people in slot:', totalPeople, 'Requested:', numberOfPeople);

    if (totalPeople + numberOfPeople > MAX_CAPACITY) {
      return new Response(
        JSON.stringify({ 
          available: false, 
          reason: `Not enough capacity. Maximum ${MAX_CAPACITY} people per time slot. Currently ${totalPeople} people reserved.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // All checks passed
    return new Response(
      JSON.stringify({ 
        available: true, 
        message: 'Reservation slot available' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        available: false, 
        reason: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
