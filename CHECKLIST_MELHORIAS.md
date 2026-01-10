# ✅ CHECKLIST DE MELHORIAS - BRN SUITE ESCOLAS

## 🔴 PRIORIDADE CRÍTICA (Fazer Imediatamente)

### Segurança

- [ ] **Implementar Políticas RLS Granulares**
  - [ ] Política para Diretores (acesso apenas à própria escola)
  - [ ] Política para Técnicos GEE (acesso às escolas atribuídas)
  - [ ] Política para Operadores (acesso a todas as escolas)
  - [ ] Política para Administradores (acesso total)
  - [ ] Aplicar em todas as 15 tabelas
  - **Arquivo:** `supabase_policies.sql`
  - **Tempo estimado:** 4 horas

- [ ] **Validações no Banco de Dados**
  - [ ] CHECK constraint para valores positivos em `financial_entries.value`
  - [ ] CHECK constraint para datas válidas
  - [ ] UNIQUE constraints onde necessário
  - [ ] NOT NULL em campos obrigatórios
  - **Arquivo:** `db_schema.sql`
  - **Tempo estimado:** 2 horas

### Performance

- [ ] **Criar Índices Estratégicos**
  - [ ] `idx_financial_entries_school_date` em `financial_entries(school_id, date DESC)`
  - [ ] `idx_financial_entries_program` em `financial_entries(program_id)`
  - [ ] `idx_rubrics_program` em `rubrics(program_id)`
  - [ ] `idx_accountability_process` em `accountability_processes(financial_entry_id)`
  - [ ] `idx_users_email` em `users(email)` (se não existir)
  - **Arquivo:** Novo arquivo `db_indexes.sql`
  - **Tempo estimado:** 1 hora

---

## 🟠 PRIORIDADE ALTA (Fazer em 1-2 Semanas)

### Qualidade de Código

- [ ] **Refatorar Reports.tsx**
  - [ ] Separar em componentes menores
  - [ ] Criar `components/accountability/ProcessForm.tsx`
  - [ ] Criar `components/accountability/ItemsList.tsx`
  - [ ] Criar `components/accountability/QuoteSelector.tsx`
  - [ ] Criar `components/accountability/DocumentGenerator.tsx`
  - **Tempo estimado:** 8 horas

- [ ] **Refatorar FinancialEntries.tsx**
  - [ ] Separar em componentes menores
  - [ ] Criar `components/financial/EntryForm.tsx`
  - [ ] Criar `components/financial/EntriesList.tsx`
  - [ ] Criar `components/financial/AttachmentsManager.tsx`
  - [ ] Criar `components/financial/SplitManager.tsx`
  - **Tempo estimado:** 8 horas

- [ ] **Refatorar Settings.tsx**
  - [ ] Separar cada aba em componente próprio
  - [ ] Criar `components/settings/ProgramsTab.tsx`
  - [ ] Criar `components/settings/SuppliersTab.tsx`
  - [ ] Criar `components/settings/BankAccountsTab.tsx`
  - [ ] Criar `components/settings/PaymentMethodsTab.tsx`
  - **Tempo estimado:** 6 horas

### Hooks Customizados

- [ ] **Criar Hooks de Dados**
  - [ ] `hooks/useSchools.ts` - Gerenciamento de escolas
  - [ ] `hooks/usePrograms.ts` - Gerenciamento de programas
  - [ ] `hooks/useRubrics.ts` - Gerenciamento de rubricas
  - [ ] `hooks/useSuppliers.ts` - Gerenciamento de fornecedores
  - [ ] `hooks/useFinancialEntries.ts` - Gerenciamento de lançamentos
  - [ ] `hooks/useAccountability.ts` - Gerenciamento de prestação de contas
  - **Tempo estimado:** 10 horas

### Tratamento de Erros

- [ ] **Sistema Centralizado de Erros**
  - [ ] Criar `lib/errorHandler.ts`
  - [ ] Implementar função `handleError()`
  - [ ] Criar mapeamento de erros para mensagens amigáveis
  - [ ] Substituir `console.error` por `handleError` em todo o código
  - [ ] Adicionar toast/snackbar para feedback visual
  - **Tempo estimado:** 4 horas

---

## 🟡 PRIORIDADE MÉDIA (Fazer em 1 Mês)

### Testes

- [ ] **Configurar Ambiente de Testes**
  - [ ] Instalar Jest e React Testing Library
  - [ ] Configurar `jest.config.js`
  - [ ] Criar `setupTests.ts`
  - [ ] Configurar mocks do Supabase
  - **Tempo estimado:** 2 horas

- [ ] **Testes Unitários - Componentes**
  - [ ] Testar `Sidebar.tsx`
  - [ ] Testar `Topbar.tsx`
  - [ ] Testar componentes de formulário
  - [ ] Testar utilitários (`printUtils.ts`, etc)
  - **Tempo estimado:** 12 horas

- [ ] **Testes de Integração**
  - [ ] Fluxo de login/registro
  - [ ] Criação de lançamento financeiro
  - [ ] Processo de prestação de contas
  - [ ] Geração de documentos
  - **Tempo estimado:** 16 horas

### Documentação

- [ ] **JSDoc em Funções Complexas**
  - [ ] Documentar `lib/documentTemplates.ts`
  - [ ] Documentar `lib/printUtils.ts`
  - [ ] Documentar funções de processamento em `Reports.tsx`
  - [ ] Documentar funções de cálculo em `Dashboard.tsx`
  - **Tempo estimado:** 4 horas

- [ ] **README Completo**
  - [ ] Seção de instalação detalhada
  - [ ] Configuração do Supabase passo a passo
  - [ ] Variáveis de ambiente necessárias
  - [ ] Comandos disponíveis
  - [ ] Guia de contribuição
  - [ ] Troubleshooting comum
  - **Tempo estimado:** 3 horas

- [ ] **Documentação de API**
  - [ ] Documentar estrutura do banco
  - [ ] Documentar endpoints do Supabase
  - [ ] Documentar políticas RLS
  - [ ] Criar diagramas ER
  - **Tempo estimado:** 4 horas

### Melhorias de UX

- [ ] **Sistema de Notificações Toast**
  - [ ] Instalar biblioteca (react-hot-toast ou similar)
  - [ ] Criar componente `Toast.tsx`
  - [ ] Substituir `alert()` por toasts
  - [ ] Adicionar feedback visual em todas as ações
  - **Tempo estimado:** 3 horas

- [ ] **Loading States Melhorados**
  - [ ] Criar componente `Skeleton.tsx` reutilizável
  - [ ] Aplicar em todas as listas
  - [ ] Adicionar shimmer effect
  - **Tempo estimado:** 2 horas

- [ ] **Confirmações Modais**
  - [ ] Criar componente `ConfirmDialog.tsx`
  - [ ] Usar em exclusões
  - [ ] Usar em ações irreversíveis
  - **Tempo estimado:** 2 horas

---

## 🟢 PRIORIDADE BAIXA (Fazer em 3+ Meses)

### Funcionalidades Novas

- [ ] **Sistema de Workflow de Aprovação**
  - [ ] Modelar tabelas de aprovação
  - [ ] Criar interface de aprovação
  - [ ] Implementar notificações
  - **Tempo estimado:** 40 horas

- [ ] **Integração Bancária**
  - [ ] Pesquisar APIs disponíveis
  - [ ] Implementar importação OFX
  - [ ] Criar conciliação automática
  - **Tempo estimado:** 60 horas

- [ ] **Orçamento e Planejamento**
  - [ ] Criar tabelas de orçamento
  - [ ] Interface de definição de orçamento
  - [ ] Alertas de estouro
  - [ ] Relatórios de execução orçamentária
  - **Tempo estimado:** 50 horas

- [ ] **Mobile App**
  - [ ] Setup React Native
  - [ ] Implementar autenticação
  - [ ] Telas principais
  - [ ] Sincronização offline
  - **Tempo estimado:** 200 horas

### Otimizações Avançadas

- [ ] **Implementar React Query**
  - [ ] Instalar e configurar
  - [ ] Migrar fetches para React Query
  - [ ] Configurar cache
  - [ ] Implementar invalidação inteligente
  - **Tempo estimado:** 16 horas

- [ ] **Code Splitting**
  - [ ] Lazy loading de páginas
  - [ ] Lazy loading de componentes pesados
  - [ ] Análise de bundle size
  - [ ] Otimização de imports
  - **Tempo estimado:** 6 horas

- [ ] **Virtualização de Listas**
  - [ ] Instalar react-window ou react-virtualized
  - [ ] Aplicar em lista de lançamentos
  - [ ] Aplicar em lista de escolas
  - **Tempo estimado:** 4 horas

---

## 🔧 CORREÇÕES DE BUGS

### Bugs Conhecidos

- [ ] **Unificar Interface Alert**
  - [ ] Remover campo `type` duplicado
  - [ ] Atualizar todos os usos
  - **Arquivo:** `types.ts`
  - **Tempo estimado:** 30 minutos

- [ ] **Melhorar Parser de Excel**
  - [ ] Instalar biblioteca robusta (xlsx)
  - [ ] Adicionar validação de dados
  - [ ] Implementar preview antes de importar
  - **Arquivo:** `Reports.tsx`
  - **Tempo estimado:** 4 horas

- [ ] **Validação de Máscaras**
  - [ ] Adicionar validação além da máscara visual
  - [ ] Usar biblioteca especializada (react-input-mask)
  - [ ] Aplicar em CNPJ, CPF, telefone, CEP
  - **Arquivos:** `Settings.tsx`, `Schools.tsx`
  - **Tempo estimado:** 3 horas

---

## 📊 MÉTRICAS DE PROGRESSO

### Como Usar Este Checklist

1. **Marque os itens concluídos** com `[x]`
2. **Atualize o tempo real gasto** em comentários
3. **Adicione novos itens** conforme necessário
4. **Revise semanalmente** o progresso

### Template de Commit

```
tipo(escopo): descrição curta

- [x] Item do checklist concluído
- Detalhes adicionais se necessário

Refs: #issue-number
Time: Xh
```

**Tipos de commit:**
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `refactor`: Refatoração de código
- `test`: Adição de testes
- `docs`: Documentação
- `perf`: Melhoria de performance
- `style`: Formatação de código
- `chore`: Tarefas de manutenção

---

## 🎯 METAS POR SPRINT

### Sprint 1 (Semana 1-2)
- [ ] Todas as melhorias de PRIORIDADE CRÍTICA
- [ ] 50% das melhorias de PRIORIDADE ALTA (Qualidade de Código)

### Sprint 2 (Semana 3-4)
- [ ] 50% restante de PRIORIDADE ALTA
- [ ] Hooks Customizados
- [ ] Sistema de Erros

### Sprint 3 (Semana 5-8)
- [ ] Configurar Testes
- [ ] Testes Unitários principais
- [ ] Documentação completa

### Sprint 4 (Semana 9-12)
- [ ] Testes de Integração
- [ ] Melhorias de UX
- [ ] Início de funcionalidades novas

---

**Última atualização:** 08/01/2026  
**Progresso geral:** 0/100 itens (0%)
