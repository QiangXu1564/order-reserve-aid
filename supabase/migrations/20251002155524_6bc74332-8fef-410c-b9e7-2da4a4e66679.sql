-- Create table for pending reservation approvals
CREATE TABLE public.reservation_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  reservation_date date NOT NULL,
  reservation_time time NOT NULL,
  number_of_people integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  worker_notes text,
  conversation_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.reservation_approvals ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all approvals
CREATE POLICY "Authenticated users can view reservation approvals"
  ON public.reservation_approvals
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update approvals
CREATE POLICY "Authenticated users can update reservation approvals"
  ON public.reservation_approvals
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Anyone can insert approvals (for the bot to create requests)
CREATE POLICY "Anyone can insert reservation approvals"
  ON public.reservation_approvals
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_reservation_approvals_updated_at
  BEFORE UPDATE ON public.reservation_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for instant notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservation_approvals;