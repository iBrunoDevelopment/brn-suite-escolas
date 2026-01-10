# 💻 EXEMPLOS DE CÓDIGO - MELHORIAS SUGERIDAS

Este documento contém exemplos práticos de implementação para as melhorias recomendadas no sistema BRN Suite Escolas.

---

## 🔐 1. POLÍTICAS RLS GRANULARES

### Arquivo: `supabase_policies_granular.sql`

```sql
-- ============================================
-- POLÍTICAS RLS GRANULARES - BRN SUITE ESCOLAS
-- ============================================

-- Remover políticas antigas (muito permissivas)
DROP POLICY IF EXISTS "Allow all to authenticated" ON schools;
DROP POLICY IF EXISTS "Allow all to authenticated" ON users;
DROP POLICY IF EXISTS "Allow all to authenticated" ON financial_entries;

-- ============================================
-- SCHOOLS - Políticas por Role
-- ============================================

-- Administradores e Operadores veem todas as escolas
CREATE POLICY "Admin and Operators see all schools" ON schools
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Administrador', 'Operador')
  )
);

-- Diretores veem apenas sua escola
CREATE POLICY "Directors see own school" ON schools
FOR SELECT USING (
  id = (
    SELECT school_id FROM users 
    WHERE id = auth.uid() AND role = 'Diretor'
  )
);

-- Técnicos GEE veem escolas atribuídas
CREATE POLICY "Technicians see assigned schools" ON schools
FOR SELECT USING (
  id = ANY(
    (SELECT assigned_schools FROM users WHERE id = auth.uid())::uuid[]
  )
);

-- Apenas Administradores podem inserir/atualizar/deletar escolas
CREATE POLICY "Only admins can modify schools" ON schools
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'Administrador'
  )
);

-- ============================================
-- FINANCIAL_ENTRIES - Políticas por Role
-- ============================================

-- Administradores e Operadores veem todos os lançamentos
CREATE POLICY "Admin and Operators see all entries" ON financial_entries
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Administrador', 'Operador')
  )
);

-- Diretores veem lançamentos de sua escola
CREATE POLICY "Directors see own school entries" ON financial_entries
FOR SELECT USING (
  school_id = (
    SELECT school_id FROM users 
    WHERE id = auth.uid() AND role = 'Diretor'
  )
);

-- Técnicos veem lançamentos das escolas atribuídas
CREATE POLICY "Technicians see assigned schools entries" ON financial_entries
FOR SELECT USING (
  school_id = ANY(
    (SELECT assigned_schools FROM users WHERE id = auth.uid())::uuid[]
  )
);

-- Administradores e Operadores podem criar/editar todos os lançamentos
CREATE POLICY "Admin and Operators can modify all entries" ON financial_entries
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Administrador', 'Operador')
  )
);

CREATE POLICY "Admin and Operators can update all entries" ON financial_entries
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Administrador', 'Operador')
  )
);

-- Diretores podem criar/editar lançamentos de sua escola
CREATE POLICY "Directors can modify own school entries" ON financial_entries
FOR INSERT WITH CHECK (
  school_id = (
    SELECT school_id FROM users 
    WHERE id = auth.uid() AND role = 'Diretor'
  )
);

CREATE POLICY "Directors can update own school entries" ON financial_entries
FOR UPDATE USING (
  school_id = (
    SELECT school_id FROM users 
    WHERE id = auth.uid() AND role = 'Diretor'
  )
);

-- Apenas Administradores podem deletar lançamentos
CREATE POLICY "Only admins can delete entries" ON financial_entries
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'Administrador'
  )
);

-- ============================================
-- SUPPLIERS - Políticas
-- ============================================

-- Todos podem ver fornecedores
CREATE POLICY "All authenticated can see suppliers" ON suppliers
FOR SELECT USING (auth.role() = 'authenticated');

-- Apenas Admin e Operadores podem modificar
CREATE POLICY "Only admin and operators can modify suppliers" ON suppliers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Administrador', 'Operador')
  )
);

-- ============================================
-- PROGRAMS e RUBRICS - Políticas
-- ============================================

-- Todos podem ver programas e rubricas
CREATE POLICY "All authenticated can see programs" ON programs
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All authenticated can see rubrics" ON rubrics
FOR SELECT USING (auth.role() = 'authenticated');

-- Apenas Administradores podem modificar
CREATE POLICY "Only admins can modify programs" ON programs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'Administrador'
  )
);

CREATE POLICY "Only admins can modify rubrics" ON rubrics
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'Administrador'
  )
);
```

---

## 📊 2. ÍNDICES DE PERFORMANCE

### Arquivo: `db_indexes.sql`

```sql
-- ============================================
-- ÍNDICES PARA OTIMIZAÇÃO DE PERFORMANCE
-- ============================================

-- Financial Entries - Queries mais comuns
CREATE INDEX IF NOT EXISTS idx_financial_entries_school_date 
ON financial_entries(school_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_financial_entries_program 
ON financial_entries(program_id);

CREATE INDEX IF NOT EXISTS idx_financial_entries_rubric 
ON financial_entries(rubric_id);

CREATE INDEX IF NOT EXISTS idx_financial_entries_status 
ON financial_entries(status);

CREATE INDEX IF NOT EXISTS idx_financial_entries_type 
ON financial_entries(type);

CREATE INDEX IF NOT EXISTS idx_financial_entries_batch 
ON financial_entries(batch_id) WHERE batch_id IS NOT NULL;

-- Rubrics - Filtro por programa
CREATE INDEX IF NOT EXISTS idx_rubrics_program 
ON rubrics(program_id);

CREATE INDEX IF NOT EXISTS idx_rubrics_school 
ON rubrics(school_id) WHERE school_id IS NOT NULL;

-- Users - Busca por email
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_school 
ON users(school_id) WHERE school_id IS NOT NULL;

-- Accountability - Queries de prestação de contas
CREATE INDEX IF NOT EXISTS idx_accountability_processes_entry 
ON accountability_processes(financial_entry_id);

CREATE INDEX IF NOT EXISTS idx_accountability_processes_school 
ON accountability_processes(school_id);

CREATE INDEX IF NOT EXISTS idx_accountability_items_process 
ON accountability_items(process_id);

CREATE INDEX IF NOT EXISTS idx_accountability_quotes_process 
ON accountability_quotes(process_id);

CREATE INDEX IF NOT EXISTS idx_accountability_quote_items_quote 
ON accountability_quote_items(quote_id);

-- Audit Logs - Busca por entry
CREATE INDEX IF NOT EXISTS idx_audit_logs_entry 
ON audit_logs(entry_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp 
ON audit_logs(timestamp DESC);

-- Alerts - Busca recente
CREATE INDEX IF NOT EXISTS idx_alerts_created 
ON alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_school 
ON alerts(school_id) WHERE school_id IS NOT NULL;

-- Índices compostos para queries complexas
CREATE INDEX IF NOT EXISTS idx_financial_entries_school_program_date 
ON financial_entries(school_id, program_id, date DESC);

-- Índice para busca full-text (se necessário)
-- CREATE INDEX IF NOT EXISTS idx_financial_entries_description_fts 
-- ON financial_entries USING gin(to_tsvector('portuguese', description));
```

---

## ✅ 3. VALIDAÇÕES NO BANCO

### Arquivo: `db_constraints.sql`

```sql
-- ============================================
-- CONSTRAINTS PARA VALIDAÇÃO DE DADOS
-- ============================================

-- Financial Entries
ALTER TABLE financial_entries 
ADD CONSTRAINT check_positive_value 
CHECK (value > 0);

ALTER TABLE financial_entries 
ADD CONSTRAINT check_valid_date 
CHECK (date <= CURRENT_DATE);

ALTER TABLE financial_entries 
ADD CONSTRAINT check_invoice_date_before_payment 
CHECK (invoice_date IS NULL OR payment_date IS NULL OR invoice_date <= payment_date);

-- Accountability Items
ALTER TABLE accountability_items 
ADD CONSTRAINT check_positive_quantity 
CHECK (quantity > 0);

ALTER TABLE accountability_items 
ADD CONSTRAINT check_positive_price 
CHECK (winner_unit_price >= 0);

-- Accountability Quote Items
ALTER TABLE accountability_quote_items 
ADD CONSTRAINT check_quote_positive_quantity 
CHECK (quantity > 0);

ALTER TABLE accountability_quote_items 
ADD CONSTRAINT check_quote_positive_price 
CHECK (unit_price >= 0);

-- Schools
ALTER TABLE schools 
ADD CONSTRAINT check_valid_cnpj 
CHECK (cnpj IS NULL OR length(regexp_replace(cnpj, '[^0-9]', '', 'g')) = 14);

ALTER TABLE schools 
ADD CONSTRAINT check_valid_uf 
CHECK (uf IS NULL OR length(uf) = 2);

-- Suppliers
ALTER TABLE suppliers 
ADD CONSTRAINT check_supplier_valid_cnpj 
CHECK (cnpj IS NULL OR length(regexp_replace(cnpj, '[^0-9]', '', 'g')) = 14);

-- Users
ALTER TABLE users 
ADD CONSTRAINT check_valid_email 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
```

---

## 🎣 4. HOOKS CUSTOMIZADOS

### Arquivo: `hooks/useSchools.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { School } from '../types';

interface UseSchoolsReturn {
  schools: School[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createSchool: (school: Partial<School>) => Promise<School | null>;
  updateSchool: (id: string, updates: Partial<School>) => Promise<boolean>;
  deleteSchool: (id: string) => Promise<boolean>;
}

export const useSchools = (): UseSchoolsReturn => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchools = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('schools')
        .select('*')
        .order('name');

      if (fetchError) throw fetchError;

      setSchools(data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar escolas');
      console.error('Error fetching schools:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createSchool = async (school: Partial<School>): Promise<School | null> => {
    try {
      const { data, error: createError } = await supabase
        .from('schools')
        .insert(school)
        .select()
        .single();

      if (createError) throw createError;

      await fetchSchools(); // Refetch para atualizar lista
      return data;
    } catch (err: any) {
      setError(err.message || 'Erro ao criar escola');
      console.error('Error creating school:', err);
      return null;
    }
  };

  const updateSchool = async (id: string, updates: Partial<School>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('schools')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchSchools(); // Refetch para atualizar lista
      return true;
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar escola');
      console.error('Error updating school:', err);
      return false;
    }
  };

  const deleteSchool = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('schools')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchSchools(); // Refetch para atualizar lista
      return true;
    } catch (err: any) {
      setError(err.message || 'Erro ao deletar escola');
      console.error('Error deleting school:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  return {
    schools,
    loading,
    error,
    refetch: fetchSchools,
    createSchool,
    updateSchool,
    deleteSchool,
  };
};
```

### Arquivo: `hooks/useFinancialEntries.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { FinancialEntry, User } from '../types';

interface UseFinancialEntriesOptions {
  user: User;
  schoolId?: string;
  programId?: string;
  startDate?: string;
  endDate?: string;
}

interface UseFinancialEntriesReturn {
  entries: FinancialEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createEntry: (entry: Partial<FinancialEntry>) => Promise<FinancialEntry | null>;
  updateEntry: (id: string, updates: Partial<FinancialEntry>) => Promise<boolean>;
  deleteEntry: (id: string) => Promise<boolean>;
}

export const useFinancialEntries = (
  options: UseFinancialEntriesOptions
): UseFinancialEntriesReturn => {
  const { user, schoolId, programId, startDate, endDate } = options;
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('financial_entries')
        .select(`
          *,
          school:schools(name),
          program:programs(name),
          rubric:rubrics(name),
          supplier:suppliers(name),
          bank_account:bank_accounts(name),
          payment_method:payment_methods(name)
        `)
        .order('date', { ascending: false });

      // Aplicar filtros baseados no role
      if (user.role === 'Diretor' && user.schoolId) {
        query = query.eq('school_id', user.schoolId);
      } else if (user.role === 'Técnico GEE' && user.assignedSchools) {
        query = query.in('school_id', user.assignedSchools);
      }

      // Filtros adicionais
      if (schoolId) query = query.eq('school_id', schoolId);
      if (programId) query = query.eq('program_id', programId);
      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transformar dados para formato esperado
      const transformedData = (data || []).map((entry: any) => ({
        ...entry,
        school: entry.school?.name || '',
        program: entry.program?.name || '',
        rubric: entry.rubric?.name || '',
        supplier: entry.supplier?.name || '',
        bank_account: entry.bank_account?.name || '',
        payment_method: entry.payment_method?.name || '',
      }));

      setEntries(transformedData);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar lançamentos');
      console.error('Error fetching entries:', err);
    } finally {
      setLoading(false);
    }
  }, [user, schoolId, programId, startDate, endDate]);

  const createEntry = async (entry: Partial<FinancialEntry>): Promise<FinancialEntry | null> => {
    try {
      const { data, error: createError } = await supabase
        .from('financial_entries')
        .insert(entry)
        .select()
        .single();

      if (createError) throw createError;

      await fetchEntries();
      return data;
    } catch (err: any) {
      setError(err.message || 'Erro ao criar lançamento');
      console.error('Error creating entry:', err);
      return null;
    }
  };

  const updateEntry = async (id: string, updates: Partial<FinancialEntry>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('financial_entries')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchEntries();
      return true;
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar lançamento');
      console.error('Error updating entry:', err);
      return false;
    }
  };

  const deleteEntry = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('financial_entries')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchEntries();
      return true;
    } catch (err: any) {
      setError(err.message || 'Erro ao deletar lançamento');
      console.error('Error deleting entry:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return {
    entries,
    loading,
    error,
    refetch: fetchEntries,
    createEntry,
    updateEntry,
    deleteEntry,
  };
};
```

---

## 🚨 5. SISTEMA DE TRATAMENTO DE ERROS

### Arquivo: `lib/errorHandler.ts`

```typescript
interface ErrorMapping {
  [key: string]: string;
}

const ERROR_MESSAGES: ErrorMapping = {
  // Supabase Auth Errors
  'Invalid login credentials': 'Email ou senha incorretos',
  'Email not confirmed': 'Por favor, confirme seu email antes de fazer login',
  'User already registered': 'Este email já está cadastrado',
  
  // Database Errors
  'duplicate key value': 'Este registro já existe no sistema',
  'foreign key constraint': 'Não é possível excluir este registro pois está sendo usado',
  'check constraint': 'Os dados fornecidos não atendem aos requisitos',
  'not null violation': 'Campos obrigatórios não foram preenchidos',
  
  // Network Errors
  'Failed to fetch': 'Erro de conexão. Verifique sua internet',
  'NetworkError': 'Erro de rede. Tente novamente',
  
  // Permission Errors
  'permission denied': 'Você não tem permissão para esta ação',
  'row-level security': 'Acesso negado a este recurso',
};

export interface AppError {
  message: string;
  originalError: any;
  context: string;
  timestamp: Date;
  userMessage: string;
}

export const handleError = (
  error: any,
  context: string = 'Unknown'
): AppError => {
  const timestamp = new Date();
  const originalMessage = error?.message || error?.toString() || 'Erro desconhecido';
  
  // Encontrar mensagem amigável
  let userMessage = 'Ocorreu um erro inesperado. Tente novamente.';
  
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (originalMessage.toLowerCase().includes(key.toLowerCase())) {
      userMessage = value;
      break;
    }
  }
  
  const appError: AppError = {
    message: originalMessage,
    originalError: error,
    context,
    timestamp,
    userMessage,
  };
  
  // Log para console em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}] Error at ${timestamp.toISOString()}:`, error);
  }
  
  // Aqui você pode integrar com serviço de monitoramento
  // sendToMonitoring(appError);
  
  return appError;
};

export const getUserFriendlyMessage = (error: any): string => {
  const appError = handleError(error);
  return appError.userMessage;
};

// Hook para usar em componentes
export const useErrorHandler = () => {
  const [error, setError] = useState<AppError | null>(null);
  
  const handleComponentError = (err: any, context: string) => {
    const appError = handleError(err, context);
    setError(appError);
    return appError.userMessage;
  };
  
  const clearError = () => setError(null);
  
  return { error, handleComponentError, clearError };
};
```

### Uso no componente:

```typescript
import { useErrorHandler } from '../lib/errorHandler';

const MyComponent = () => {
  const { error, handleComponentError, clearError } = useErrorHandler();
  
  const handleSave = async () => {
    try {
      // operação
    } catch (err) {
      const message = handleComponentError(err, 'MyComponent.handleSave');
      alert(message); // ou usar toast
    }
  };
  
  return (
    // JSX
  );
};
```

---

## 🧪 6. TESTES UNITÁRIOS

### Arquivo: `__tests__/hooks/useSchools.test.ts`

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useSchools } from '../../hooks/useSchools';
import { supabase } from '../../lib/supabaseClient';

// Mock do Supabase
jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('useSchools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch schools on mount', async () => {
    const mockSchools = [
      { id: '1', name: 'Escola A' },
      { id: '2', name: 'Escola B' },
    ];

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockSchools,
          error: null,
        }),
      }),
    });

    const { result } = renderHook(() => useSchools());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.schools).toEqual(mockSchools);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch error', async () => {
    const mockError = { message: 'Database error' };

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      }),
    });

    const { result } = renderHook(() => useSchools());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.schools).toEqual([]);
    expect(result.current.error).toBe('Database error');
  });

  it('should create a new school', async () => {
    const newSchool = { name: 'Escola Nova' };
    const createdSchool = { id: '3', ...newSchool };

    (supabase.from as jest.Mock).mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: createdSchool,
            error: null,
          }),
        }),
      }),
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [createdSchool],
          error: null,
        }),
      }),
    });

    const { result } = renderHook(() => useSchools());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const created = await result.current.createSchool(newSchool);

    expect(created).toEqual(createdSchool);
  });
});
```

---

## 🎨 7. COMPONENTE DE TOAST

### Arquivo: `components/Toast.tsx`

```typescript
import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = { id, message, type };
    
    setToasts((prev) => [...prev, newToast]);

    // Auto-remove após 5 segundos
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getToastStyles = (type: ToastType) => {
    const baseStyles = 'px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] animate-in slide-in-from-right';
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-500/90 text-white`;
      case 'error':
        return `${baseStyles} bg-red-500/90 text-white`;
      case 'warning':
        return `${baseStyles} bg-yellow-500/90 text-white`;
      case 'info':
      default:
        return `${baseStyles} bg-blue-500/90 text-white`;
    }
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'info';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} className={getToastStyles(toast.type)}>
            <span className="material-symbols-outlined">{getIcon(toast.type)}</span>
            <span className="flex-1 font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="material-symbols-outlined text-white/80 hover:text-white"
            >
              close
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
```

### Uso:

```typescript
// Em App.tsx
import { ToastProvider } from './components/Toast';

const App = () => {
  return (
    <ToastProvider>
      {/* resto do app */}
    </ToastProvider>
  );
};

// Em qualquer componente
import { useToast } from './components/Toast';

const MyComponent = () => {
  const { showToast } = useToast();
  
  const handleSave = async () => {
    try {
      // operação
      showToast('Salvo com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao salvar', 'error');
    }
  };
};
```

---

**Documento criado em:** 08/01/2026  
**Versão:** 1.0
