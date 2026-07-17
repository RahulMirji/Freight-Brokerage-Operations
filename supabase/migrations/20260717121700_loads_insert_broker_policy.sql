-- Migration: loads_insert_broker_policy
-- Version: 20260717121700
-- Description: Allow brokers to create loads in the loads table.

CREATE POLICY "loads_insert_broker"
  ON public.loads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'broker'
    )
  );
