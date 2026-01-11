# 📋 INSTRUÇÕES PARA IMPLEMENTAR GERENCIAMENTO DE USUÁRIOS

## 🎯 O que foi implementado

Foi criado um sistema completo de gerenciamento de usuários com as seguintes funcionalidades:

✅ **CRUD Completo de Usuários**
- Criar novos usuários
- Editar usuários existentes
- Excluir usuários
- Ativar/Desativar usuários

✅ **Controle de Acesso**
- Apenas administradores podem acessar a página de usuários
- Menu "Usuários" aparece apenas para admins

✅ **Vinculação de GEE**
- Campo GEE adicionado às escolas
- Técnicos GEE são vinculados a uma GEE específica
- Técnicos GEE só podem acessar escolas da sua GEE

✅ **Gerenciamento de Status**
- Usuários podem ser ativados ou desativados
- Usuários inativos não podem acessar o sistema

---

## 🚀 PASSO A PASSO PARA ATIVAR

### 1️⃣ Executar Script SQL no Supabase (OBRIGATÓRIO)

**Tempo:** 2 minutos

1. Abra o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Copie e cole o conteúdo do arquivo `db_users_update.sql`
5. Clique em **Run** (ou pressione Ctrl+Enter)

**Conteúdo do script:**
```sql
-- Atualização do schema para gerenciamento de usuários e GEE

-- 1. Adicionar campo GEE na tabela schools
ALTER TABLE schools ADD COLUMN IF NOT EXISTS gee TEXT;

-- 2. Adicionar campo active (status) na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- 3. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_schools_gee ON schools(gee);

-- 4. Comentários para documentação
COMMENT ON COLUMN schools.gee IS 'Gerência Executiva de Educação à qual a escola pertence';
COMMENT ON COLUMN users.active IS 'Status do usuário - true para ativo, false para desativado';

-- 5. Atualizar usuários existentes para ativo (se houver)
UPDATE users SET active = true WHERE active IS NULL;
```

✅ **Validação:** Você deve ver a mensagem "Success. No rows returned"

---

### 2️⃣ Reiniciar o Servidor de Desenvolvimento

**Tempo:** 30 segundos

No terminal onde está rodando `npm run dev`:

1. Pressione **Ctrl+C** para parar
2. Execute novamente: `npm run dev`

---

### 3️⃣ Acessar a Página de Usuários

**Tempo:** 1 minuto

1. Faça login como **Administrador**
2. No menu lateral, clique em **Usuários** (ícone de grupo)
3. Você verá a página de gerenciamento de usuários

---

## 📚 COMO USAR

### Criar Novo Usuário

1. Clique em **"Novo Usuário"**
2. Preencha os dados:
   - **Nome Completo** (obrigatório)
   - **Email** (obrigatório)
   - **Função** (obrigatório)
   - **Escola** (apenas para Diretores)
   - **GEE** (apenas para Técnicos GEE)
   - **Escolas Atribuídas** (apenas para Técnicos GEE)
   - **Status** (ativo/inativo)
3. Clique em **"Criar Usuário"**

### Editar Usuário

1. Na lista de usuários, clique no ícone de **editar** (lápis)
2. Modifique os dados desejados
3. Clique em **"Salvar Alterações"**

**Nota:** O email não pode ser alterado após a criação

### Ativar/Desativar Usuário

1. Na coluna **Status**, clique no badge (Ativo/Inativo)
2. Confirme a ação
3. O status será alterado imediatamente

### Excluir Usuário

1. Na lista de usuários, clique no ícone de **excluir** (lixeira)
2. Confirme a exclusão
3. **ATENÇÃO:** Esta ação não pode ser desfeita!

---

## 🏫 CONFIGURAR GEE NAS ESCOLAS

Para que os Técnicos GEE possam ser vinculados às escolas:

1. Vá em **Escolas**
2. Edite uma escola
3. Preencha o campo **"GEE (Gerência Executiva de Educação)"**
   - Exemplo: `GEE METROPOLITANA SUL`
   - Exemplo: `GEE SERTÃO CENTRAL`
4. Salve a escola

**Importante:** Use o mesmo nome de GEE para todas as escolas que pertencem à mesma gerência.

---

## 👥 TIPOS DE USUÁRIO

### 🟣 Administrador
- Acesso total ao sistema
- Pode gerenciar usuários
- Pode acessar todas as escolas
- Não precisa de vinculação

### 🔵 Operador
- Pode gerenciar lançamentos de todas as escolas
- Não pode gerenciar usuários
- Não precisa de vinculação

### 🟢 Diretor
- Acessa apenas a escola vinculada
- **Obrigatório:** Vincular a uma escola
- Não pode gerenciar usuários

### 🟠 Técnico GEE
- Acessa apenas escolas da GEE vinculada
- **Obrigatório:** Vincular a uma GEE
- **Opcional:** Selecionar escolas específicas da GEE
- Se nenhuma escola for selecionada, acessa todas da GEE

---

## 🔍 FILTROS E BUSCA

A página de usuários possui filtros para facilitar a localização:

- **Busca por nome ou email**
- **Filtro por função** (Admin, Operador, Diretor, Técnico GEE)
- **Filtro por status** (Ativos, Inativos)

---

## 📊 ESTATÍSTICAS

No topo da página você verá:

- **Total de usuários**
- **Usuários ativos**
- **Usuários inativos**
- **Número de administradores**

---

## ⚠️ VALIDAÇÕES IMPLEMENTADAS

### Email
- Deve ser único no sistema
- Formato válido (xxx@xxx.xxx)
- Não pode ser alterado após criação

### Diretor
- Deve ter uma escola vinculada

### Técnico GEE
- Deve ter uma GEE vinculada
- Só pode selecionar escolas da GEE escolhida

### Usuários Inativos
- Não podem acessar o sistema
- Aparecem com opacidade reduzida na lista

---

## 🎨 INTERFACE

### Cores por Função

- **Administrador:** Roxo
- **Operador:** Azul
- **Diretor:** Verde
- **Técnico GEE:** Laranja

### Status

- **Ativo:** Verde com ícone de check
- **Inativo:** Vermelho com ícone de cancel

---

## 🐛 TROUBLESHOOTING

### Erro ao criar usuário

**Problema:** "Este email já está cadastrado"
**Solução:** Use um email diferente

**Problema:** "Diretores devem ter uma escola vinculada"
**Solução:** Selecione uma escola no dropdown

**Problema:** "Técnicos GEE devem ter uma GEE vinculada"
**Solução:** Selecione uma GEE no dropdown

### Não vejo o menu "Usuários"

**Problema:** Menu não aparece
**Solução:** Certifique-se de estar logado como Administrador

### Não vejo escolas ao selecionar GEE

**Problema:** Lista de escolas vazia
**Solução:** 
1. Vá em Escolas
2. Edite as escolas
3. Preencha o campo GEE
4. Use o mesmo nome de GEE para escolas da mesma gerência

---

## 📝 ARQUIVOS CRIADOS/MODIFICADOS

### Novos Arquivos
- ✅ `pages/Users.tsx` - Página de gerenciamento de usuários
- ✅ `db_users_update.sql` - Script SQL para atualizar banco

### Arquivos Modificados
- ✅ `types.ts` - Adicionados campos `active` e `gee`
- ✅ `App.tsx` - Adicionada rota para Users
- ✅ `components/Sidebar.tsx` - Adicionado menu Usuários (apenas admin)
- ✅ `pages/Schools.tsx` - Adicionado campo GEE no formulário

---

## 🎯 PRÓXIMOS PASSOS SUGERIDOS

Após implementar o gerenciamento de usuários, você pode:

1. **Testar o fluxo completo:**
   - Criar um usuário de cada tipo
   - Testar permissões
   - Validar vinculações

2. **Configurar GEEs:**
   - Definir as GEEs da sua região
   - Vincular escolas às GEEs
   - Criar técnicos GEE

3. **Implementar melhorias de segurança:**
   - Executar `db_indexes.sql` (do EXEMPLOS_CODIGO.md)
   - Executar `supabase_policies_granular.sql` (do EXEMPLOS_CODIGO.md)

---

## ✅ CHECKLIST DE VALIDAÇÃO

Antes de considerar concluído, teste:

- [ ] Criar usuário Administrador
- [ ] Criar usuário Operador
- [ ] Criar usuário Diretor (com escola)
- [ ] Criar usuário Técnico GEE (com GEE e escolas)
- [ ] Editar um usuário
- [ ] Desativar um usuário
- [ ] Reativar um usuário
- [ ] Excluir um usuário
- [ ] Buscar usuário por nome
- [ ] Filtrar por função
- [ ] Filtrar por status
- [ ] Verificar que apenas admin vê o menu
- [ ] Verificar que técnico GEE só vê escolas da sua GEE

---

**Implementado por:** Antigravity AI  
**Data:** 09/01/2026  
**Versão:** 1.0
