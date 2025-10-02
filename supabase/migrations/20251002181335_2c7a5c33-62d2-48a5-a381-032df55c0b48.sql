-- Fix RLS policies for orders and reservation_approvals tables
-- Remove any public INSERT policies and restrict to service role only

-- Drop existing permissive INSERT policy on reservation_approvals
DROP POLICY IF EXISTS "Anyone can insert reservation approvals" ON public.reservation_approvals;

-- Create new policy that only allows service role to insert
CREATE POLICY "Service role can insert reservation approvals"
ON public.reservation_approvals
FOR INSERT
TO service_role
WITH CHECK (true);

-- Ensure orders table has no public INSERT policy (only service role via edge functions)
-- The table already has no INSERT policy for public, which is correct

-- Add comment for documentation
COMMENT ON TABLE public.orders IS 'Orders can only be inserted via edge functions using service role';
COMMENT ON TABLE public.reservation_approvals IS 'Reservation approvals can only be inserted via edge functions using service role';