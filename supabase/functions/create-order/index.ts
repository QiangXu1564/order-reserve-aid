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

    console.log('Creating order:', { customerName, customerPhone, products });

    if (!customerName || !customerPhone || !products || !Array.isArray(products) || products.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields. Need customerName, customerPhone, and products array',
          orderId: null 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create order
    const { data, error } = await supabase
      .from('orders')
      .insert({
        customer_name: customerName,
        customer_phone: customerPhone,
        products: products,
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
