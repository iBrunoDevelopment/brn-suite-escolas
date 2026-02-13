-- Migration to add Supplier Contracts management
-- and link financial entries and accountability processes to specific contracts.

CREATE TABLE IF NOT EXISTS public.supplier_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    rubric_id UUID REFERENCES public.rubrics(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN ('INTERNET', 'GÁS', 'OUTROS')) DEFAULT 'OUTROS',
    description TEXT NOT NULL,
    monthly_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Ativo', 'Encerrado', 'Suspenso')) DEFAULT 'Ativo',
    contract_number TEXT,
    signing_date DATE,
    terms_json JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add contract_id to financial_entries
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_entries' AND column_name = 'contract_id') THEN
        ALTER TABLE public.financial_entries ADD COLUMN contract_id UUID REFERENCES public.supplier_contracts(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add contract_id to accountability_processes
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accountability_processes' AND column_name = 'contract_id') THEN
        ALTER TABLE public.accountability_processes ADD COLUMN contract_id UUID REFERENCES public.supplier_contracts(id) ON DELETE SET NULL;
    END IF;
END $$;

-- RLS for supplier_contracts
ALTER TABLE public.supplier_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contracts for their schools" ON public.supplier_contracts
    FOR SELECT USING (
        school_id IN (SELECT school_id FROM public.school_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'gestor_supremo'))
    );

CREATE POLICY "Admins can manage contracts" ON public.supplier_contracts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'gestor_supremo'))
    );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_supplier_contracts_school ON public.supplier_contracts(school_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_contract ON public.financial_entries(contract_id);
