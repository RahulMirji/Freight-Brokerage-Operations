-- Migration: loads_delete_broker_policy
-- Version: 20260717121800
-- Description: Allow brokers to delete loads from the loads table.

CREATE POLICY "loads_delete_broker"
  ON public.loads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'broker'
    )
  );
