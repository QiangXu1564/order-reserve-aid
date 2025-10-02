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
    console.log('Received order:', body);

    const { customer_name, customer_phone, products } = body;

    // Input validation and sanitization
    if (!customer_name || !customer_phone || !products) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: customer_name, customer_phone, products' }),
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

    if (!Array.isArray(products) && typeof products !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid products: must be an array or string' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedName = customer_name.trim().substring(0, 200);
    const sanitizedPhone = customer_phone.trim().substring(0, 50);
    const sanitizedProducts = typeof products === 'string' 
      ? products.trim().substring(0, 2000)
      : JSON.stringify(products).substring(0, 2000);

    const { data, error } = await supabase
      .from('orders')
      .insert({
        customer_name: sanitizedName,
        customer_phone: sanitizedPhone,
        products: sanitizedProducts,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting order:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Order created successfully:', data);

    return new Response(
      JSON.stringify({ success: true, order: data }),
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
