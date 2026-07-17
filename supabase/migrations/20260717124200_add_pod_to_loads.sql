-- Migration: add_pod_to_loads
-- Version: 20260717124200
-- Description: Adds a pod_url column to loads table to allow proof of delivery document tracking.

ALTER TABLE public.loads ADD COLUMN pod_url text;
COMMENT ON COLUMN public.loads.pod_url IS 'URL or document path of the Proof of Delivery (POD) uploaded by the carrier.';
