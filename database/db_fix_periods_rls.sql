-- Enable RLS on periods
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view periods
CREATE POLICY "Everyone can view periods" 
ON public.periods FOR SELECT 
USING (true);

-- Allow Admins and Operators to manage periods
CREATE POLICY "Admins and Operators can manage periods" 
ON public.periods FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('Administrador', 'Operador')
  )
);
