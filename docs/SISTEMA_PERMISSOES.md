# 🎯 SISTEMA DE PERMISSÕES E AUTO-REGISTRO

## ✅ O que foi implementado

### 1. **Role "Cliente" (Padrão)**
- ✅ Nova role adicionada ao sistema
- ✅ Usuários se auto-registram como "Cliente"
- ✅ Acesso apenas para visualização
- ✅ Vinculado a uma escola específica

### 2. **Auto-Registro com Seleção de Escola**
- ✅ Formulário de registro atualizado
- ✅ Seleção obrigatória de escola
- ✅ Informativo sobre permissões limitadas
- ✅ Validação de conta inativa no login

### 3. **Sistema de Permissões Granulares**
- ✅ Tabela `role_permissions` criada
- ✅ Permissões por recurso (entries, schools, reports, settings, users)
- ✅ 4 níveis de permissão: view, create, edit, delete
- ✅ Hook customizado `usePermissions`

---

## 📊 MATRIZ DE PERMISSÕES

| Role | Lançamentos | Escolas | Prestação | Configurações | Usuários |
|------|-------------|---------|-----------|---------------|----------|
| **Cliente** | 👁️ Visualizar | 👁️ Visualizar | 👁️ Visualizar | ❌ Sem acesso | ❌ Sem acesso |
| **Diretor** | ✅ Total | ✏️ Editar própria | ✅ Total | ✅ Total | ❌ Sem acesso |
| **Técnico GEE** | ✏️ Editar | 👁️ Visualizar | ✏️ Validar | 👁️ Visualizar | ❌ Sem acesso |
| **Operador** | ✅ Total | ✅ Total | ✅ Total | ✅ Total | ❌ Sem acesso |
| **Admin** | ✅ Total | ✅ Total | ✅ Total | ✅ Total | ✅ Total |

**Legenda:**
- ✅ Total = view, create, edit, delete
- ✏️ Editar = view, edit
- 👁️ Visualizar = view apenas
- ❌ Sem acesso

---

## 🚀 INSTRUÇÕES DE IMPLEMENTAÇÃO

### 1️⃣ Executar Scripts SQL no Supabase

**IMPORTANTE:** Execute os scripts na ordem correta!

#### Script 1: Atualizar Schema (se ainda não executou)
```sql
-- Arquivo: db_users_update.sql
-- Adiciona campos gee e active
```

#### Script 2: Adicionar Role Cliente e Permissões
```sql
-- Arquivo: db_permissions.sql
-- Adiciona role Cliente e tabela de permissões
```

**Como executar:**
1. Abra o Supabase Dashboard
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Cole o conteúdo de `db_permissions.sql`
5. Clique em **Run**

---

### 2️⃣ Reiniciar o Servidor

O servidor já está rodando, mas recarregue a página no navegador.

---

## 🎨 FLUXO DE AUTO-REGISTRO

### Passo a Passo do Usuário

1. **Acessar a Página de Login**
   ```
   http://localhost:5173
   ```

2. **Clicar em "Não tem conta? Cadastre-se"**

3. **Preencher o Formulário**
   - Nome Completo
   - Escola (dropdown)
   - Email
   - Senha (mínimo 6 caracteres)

4. **Ver Informativo**
   ```
   ℹ️ Informações sobre o cadastro:
   • Você será cadastrado como Cliente (apenas visualização)
   • Um administrador pode alterar suas permissões posteriormente
   • Selecione a escola à qual você pertence
   ```

5. **Criar Conta**
   - Usuário é criado com role "Cliente"
   - Status: Ativo
   - Acesso: Apenas visualização da escola selecionada

6. **Fazer Login**
   - Usar email e senha cadastrados
   - Acesso limitado conforme permissões

---

## 👨‍💼 FLUXO DO ADMINISTRADOR

### Gerenciar Permissões de Usuários

1. **Acessar Página de Usuários**
   ```
   Menu → Usuários (apenas para admins)
   ```

2. **Localizar o Usuário**
   - Usar busca por nome ou email
   - Filtrar por role "Cliente"

3. **Editar Usuário**
   - Clicar no ícone de editar (lápis)
   - Alterar a **Função** para:
     - **Diretor** → Gestão completa da escola
     - **Técnico GEE** → Validação de escolas da GEE
     - **Operador** → Gestão de todas as escolas
     - **Administrador** → Acesso total

4. **Salvar Alterações**
   - Usuário recebe novas permissões imediatamente
   - No próximo login, terá acesso conforme nova role

---

## 🔐 SISTEMA DE PERMISSÕES

### Hook usePermissions

```typescript
import { usePermissions } from '../hooks/usePermissions';

// Em qualquer componente
const permission = usePermissions(user, 'entries');

// Verificar permissões
if (permission.canCreate) {
  // Mostrar botão "Novo Lançamento"
}

if (permission.canEdit) {
  // Mostrar botão "Editar"
}

if (permission.canDelete) {
  // Mostrar botão "Excluir"
}
```

### Hook useSchoolAccess

```typescript
import { useSchoolAccess } from '../hooks/usePermissions';

// Verificar se usuário tem acesso a uma escola específica
const hasAccess = useSchoolAccess(user, schoolId);

if (!hasAccess) {
  return <div>Acesso negado</div>;
}
```

### Hook useAccessibleSchools

```typescript
import { useAccessibleSchools } from '../hooks/usePermissions';

// Obter apenas escolas acessíveis pelo usuário
const accessibleSchools = useAccessibleSchools(user, allSchools);

// Usar em dropdowns, filtros, etc
```

---

## 📝 EXEMPLOS DE USO

### Exemplo 1: Botão Condicional

```typescript
import { usePermissions } from '../hooks/usePermissions';

function FinancialEntries({ user }) {
  const permission = usePermissions(user, 'entries');

  return (
    <div>
      {/* Sempre mostrar lista */}
      <EntriesList />

      {/* Mostrar botão apenas se pode criar */}
      {permission.canCreate && (
        <button onClick={handleCreate}>
          Novo Lançamento
        </button>
      )}
    </div>
  );
}
```

### Exemplo 2: Filtrar Escolas

```typescript
import { useAccessibleSchools } from '../hooks/usePermissions';

function SchoolSelector({ user, allSchools }) {
  const accessibleSchools = useAccessibleSchools(user, allSchools);

  return (
    <select>
      {accessibleSchools.map(school => (
        <option key={school.id} value={school.id}>
          {school.name}
        </option>
      ))}
    </select>
  );
}
```

### Exemplo 3: Verificar Acesso

```typescript
import { useSchoolAccess } from '../hooks/usePermissions';

function EntryDetails({ user, entry }) {
  const hasAccess = useSchoolAccess(user, entry.school_id);

  if (!hasAccess) {
    return <div>Você não tem acesso a esta escola</div>;
  }

  return <div>{/* Detalhes do lançamento */}</div>;
}
```

---

## 🎯 NÍVEIS DE ACESSO DETALHADOS

### 🔵 Cliente (Padrão)
**Acesso:** Apenas visualização da própria escola

**Pode:**
- ✅ Ver lançamentos financeiros
- ✅ Ver dados da escola
- ✅ Ver relatórios de prestação de contas
- ✅ Visualizar dashboard

**Não pode:**
- ❌ Criar lançamentos
- ❌ Editar dados
- ❌ Excluir registros
- ❌ Acessar configurações
- ❌ Gerenciar usuários

---

### 🟢 Diretor
**Acesso:** Gestão completa da própria escola

**Pode:**
- ✅ Tudo que o Cliente pode
- ✅ Criar lançamentos financeiros
- ✅ Editar lançamentos
- ✅ Excluir lançamentos
- ✅ Criar prestação de contas
- ✅ Editar dados da escola
- ✅ Gerenciar configurações (programas, rubricas, fornecedores)

**Não pode:**
- ❌ Acessar outras escolas
- ❌ Gerenciar usuários

---

### 🟠 Técnico GEE
**Acesso:** Validação de escolas da GEE

**Pode:**
- ✅ Ver lançamentos das escolas da GEE
- ✅ Editar lançamentos (validação)
- ✅ Ver prestação de contas
- ✅ Editar prestação de contas (validação)
- ✅ Ver configurações

**Não pode:**
- ❌ Criar lançamentos
- ❌ Excluir lançamentos
- ❌ Acessar escolas fora da GEE
- ❌ Gerenciar usuários

---

### 🔵 Operador
**Acesso:** Gestão de todas as escolas

**Pode:**
- ✅ Tudo que o Diretor pode
- ✅ Acessar todas as escolas
- ✅ Criar/editar/excluir em qualquer escola
- ✅ Gerenciar todas as configurações

**Não pode:**
- ❌ Gerenciar usuários

---

### 🟣 Administrador
**Acesso:** Total

**Pode:**
- ✅ Tudo que o Operador pode
- ✅ Gerenciar usuários
- ✅ Alterar permissões
- ✅ Ativar/desativar usuários
- ✅ Acesso a todas as funcionalidades

---

## 🔄 FLUXO DE UPGRADE DE PERMISSÕES

```
┌─────────────────────────────────────────────────────────┐
│  FLUXO DE EVOLUÇÃO DE PERMISSÕES                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Usuário se registra                                 │
│     └─→ Role: Cliente (apenas visualização)             │
│                                                         │
│  2. Administrador avalia                                │
│     └─→ Verifica necessidade de acesso                  │
│                                                         │
│  3. Administrador altera role                           │
│     ├─→ Diretor (gestão da escola)                      │
│     ├─→ Técnico GEE (validação)                         │
│     ├─→ Operador (gestão geral)                         │
│     └─→ Admin (acesso total)                            │
│                                                         │
│  4. Usuário recebe novas permissões                     │
│     └─→ Acesso ampliado conforme nova role              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 CHECKLIST DE VALIDAÇÃO

### Testar Auto-Registro

- [ ] Acessar página de login
- [ ] Clicar em "Cadastre-se"
- [ ] Ver informativo sobre permissões
- [ ] Selecionar escola
- [ ] Preencher dados
- [ ] Criar conta
- [ ] Verificar mensagem de sucesso
- [ ] Fazer login
- [ ] Confirmar acesso limitado (apenas visualização)

### Testar Upgrade de Permissões

- [ ] Login como Admin
- [ ] Acessar página de Usuários
- [ ] Localizar usuário Cliente
- [ ] Editar usuário
- [ ] Alterar role para Diretor
- [ ] Salvar
- [ ] Fazer logout
- [ ] Login como o usuário alterado
- [ ] Confirmar novas permissões (pode criar/editar)

### Testar Validação de Conta Inativa

- [ ] Login como Admin
- [ ] Desativar um usuário
- [ ] Fazer logout
- [ ] Tentar login com usuário desativado
- [ ] Verificar mensagem de erro
- [ ] Confirmar que não consegue acessar

---

## 🎨 CORES POR ROLE

- **🟣 Administrador** - Roxo (`bg-purple-100`)
- **🔵 Operador** - Azul (`bg-blue-100`)
- **🟢 Diretor** - Verde (`bg-green-100`)
- **🟠 Técnico GEE** - Laranja (`bg-orange-100`)
- **⚪ Cliente** - Cinza (`bg-gray-100`)

---

## 📁 ARQUIVOS CRIADOS/MODIFICADOS

### Novos Arquivos
- ✅ `db_permissions.sql` - Script SQL para permissões
- ✅ `hooks/usePermissions.ts` - Hook de permissões
- ✅ `SISTEMA_PERMISSOES.md` - Este documento

### Arquivos Modificados
- ✅ `types.ts` - Adicionado UserRole.CLIENTE e interfaces de permissão
- ✅ `pages/Login.tsx` - Auto-registro com seleção de escola
- ✅ `pages/Users.tsx` - Suporte para role Cliente

---

## 🚨 IMPORTANTE

### Ordem de Execução dos Scripts SQL

1. **Primeiro:** `db_users_update.sql` (campos gee e active)
2. **Depois:** `db_permissions.sql` (role Cliente e permissões)

### Validação de Conta Inativa

O sistema agora valida se o usuário está ativo no login. Se a conta estiver desativada:
- ❌ Login é negado
- ❌ Sessão é encerrada
- ℹ️ Mensagem: "Sua conta está desativada. Entre em contato com o administrador."

### Cache de Permissões

O hook `usePermissions` usa cache para evitar múltiplas consultas ao banco. Para limpar o cache:

```typescript
import { clearPermissionsCache } from '../hooks/usePermissions';

// Após alterar role de um usuário
clearPermissionsCache();
```

---

## 🎯 PRÓXIMOS PASSOS

### Implementar Permissões nas Páginas

Agora que o sistema de permissões está pronto, você pode:

1. **Adicionar o hook nas páginas:**
   ```typescript
   const permission = usePermissions(user, 'entries');
   ```

2. **Condicionar botões e ações:**
   ```typescript
   {permission.canCreate && <button>Novo</button>}
   {permission.canEdit && <button>Editar</button>}
   {permission.canDelete && <button>Excluir</button>}
   ```

3. **Filtrar dados por escola:**
   ```typescript
   const accessibleSchools = useAccessibleSchools(user, allSchools);
   ```

---

**Implementado por:** Antigravity AI  
**Data:** 09/01/2026  
**Versão:** 2.0
