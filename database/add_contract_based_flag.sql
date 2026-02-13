-- Add is_contract_based column to accountability_processes
-- This allows skipping 3 quotes requirement for monthly recurring services with contracts

ALTER TABLE public.accountability_processes 
ADD COLUMN IF NOT EXISTS is_contract_based BOOLEAN DEFAULT FALSE;

-- Update RLS if needed (usually columns are handled by existing policies if they use select *)
COMMENT ON COLUMN public.accountability_processes.is_contract_based IS 'Indicates if the process is based on an existing contract, skipping the 3-quotes requirement.';
