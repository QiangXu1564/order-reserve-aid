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
    const { customerName, customerPhone, products } = await req.json();

    // Comprehensive input validation
    if (!customerName || !customerPhone || !products) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          orderId: null 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate customerName
    const trimmedName = String(customerName).trim().substring(0, 200);
    if (trimmedName.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Customer name cannot be empty', orderId: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate customerPhone
    const trimmedPhone = String(customerPhone).trim().substring(0, 50);
    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    if (!phoneRegex.test(trimmedPhone)) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format', orderId: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate products array
    if (!Array.isArray(products)) {
      return new Response(
        JSON.stringify({ error: 'Products must be an array', orderId: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (products.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Products array cannot be empty', orderId: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (products.length > 50) {
      return new Response(
        JSON.stringify({ error: 'Too many products (max 50)', orderId: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate each product
    for (const product of products) {
      if (typeof product !== 'string' || product.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: 'Each product must be a non-empty string', orderId: null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    const sanitizedProducts = products.map((p: string) => String(p).trim().substring(0, 200));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create order with sanitized data
    const { data, error } = await supabase
      .from('orders')
      .insert({
        customer_name: trimmedName,
        customer_phone: trimmedPhone,
        products: sanitizedProducts,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create order',
          orderId: null 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Order created:', data.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        orderId: data.id,
        message: 'Order created successfully. Your order is being prepared.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId: null 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
