# 🚀 GUIA DE INÍCIO RÁPIDO - BRN SUITE ESCOLAS

## 👋 Bem-vindo!

Este guia vai te ajudar a configurar e executar o sistema BRN Suite Escolas em poucos minutos.

---

## ⚡ Setup Rápido (5 minutos)

### 1️⃣ Pré-requisitos

Certifique-se de ter instalado:

- ✅ **Node.js** 18 ou superior ([Download](https://nodejs.org/))
- ✅ **npm** ou **yarn** (vem com Node.js)
- ✅ **Git** ([Download](https://git-scm.com/))
- ✅ Conta no **Supabase** (gratuita) ([Criar conta](https://supabase.com/))

### 2️⃣ Clonar o Repositório

```bash
# Clone o projeto
git clone <url-do-repositorio>

# Entre na pasta
cd brn-suite-escolas
```

### 3️⃣ Instalar Dependências

```bash
npm install
```

**Tempo estimado:** 1-2 minutos

### 4️⃣ Configurar Supabase

#### A. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com/)
2. Clique em "New Project"
3. Preencha:
   - **Name:** BRN Suite Escolas
   - **Database Password:** (escolha uma senha forte)
   - **Region:** South America (São Paulo) - mais próximo
4. Clique em "Create new project"
5. Aguarde ~2 minutos para o projeto ser criado

#### B. Executar Scripts SQL

1. No Supabase, vá em **SQL Editor** (menu lateral)
2. Clique em "New Query"
3. Execute os scripts **NA ORDEM**:

**Script 1: Schema Principal**
```sql
-- Copie e cole todo o conteúdo de db_schema.sql
-- Clique em RUN
```

**Script 2: Schema de Prestação de Contas**
```sql
-- Copie e cole todo o conteúdo de accountability_schema_v2.sql
-- Clique em RUN
```

**Script 3: Índices (OPCIONAL mas recomendado)**
```sql
-- Copie e cole todo o conteúdo de EXEMPLOS_CODIGO.md
-- Seção: db_indexes.sql
-- Clique em RUN
```

**Script 4: Políticas RLS Granulares (IMPORTANTE para segurança)**
```sql
-- Copie e cole todo o conteúdo de EXEMPLOS_CODIGO.md
-- Seção: supabase_policies_granular.sql
-- Clique em RUN
```

#### C. Obter Credenciais

1. No Supabase, vá em **Settings** → **API**
2. Copie:
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon public** key (começa com `eyJ...`)

### 5️⃣ Configurar Variáveis de Ambiente

1. Crie o arquivo `.env.local` na raiz do projeto:

```bash
# Windows
copy .env.example .env.local

# Linux/Mac
cp .env.example .env.local
```

2. Edite `.env.local` e adicione suas credenciais:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 6️⃣ Executar o Sistema

```bash
npm run dev
```

O sistema estará disponível em: **http://localhost:5173**

---

## 🎉 Primeiro Acesso

### Criar Conta de Administrador

1. Acesse http://localhost:5173
2. Clique em "Não tem conta? Cadastre-se"
3. Preencha:
   - **Nome Completo:** Seu nome
   - **E-mail:** seu@email.com
   - **Senha:** (mínimo 6 caracteres)
4. Clique em "Criar Conta"
5. Faça login com as credenciais criadas

### Ajustar Role para Administrador

Por padrão, novos usuários são criados como "Diretor". Para ter acesso total:

1. No Supabase, vá em **Table Editor** → **users**
2. Encontre seu usuário (pelo email)
3. Clique para editar
4. Altere o campo **role** para `Administrador`
5. Salve

### Criar Dados Iniciais

Agora você pode criar:

1. **Escolas** (menu Escolas)
2. **Programas** (menu Configurações → Programas)
3. **Rubricas** (menu Configurações → Rubricas)
4. **Fornecedores** (menu Configurações → Fornecedores)
5. **Lançamentos** (menu Lançamentos)

---

## 📚 Estrutura do Projeto

```
brn-suite-escolas/
│
├── components/          # Componentes reutilizáveis
│   ├── Sidebar.tsx     # Menu lateral
│   └── Topbar.tsx      # Barra superior
│
├── pages/              # Páginas principais
│   ├── Dashboard.tsx   # Visão geral
│   ├── FinancialEntries.tsx  # Lançamentos
│   ├── Reports.tsx     # Prestação de contas
│   ├── Settings.tsx    # Configurações
│   ├── Schools.tsx     # Gestão de escolas
│   └── Login.tsx       # Autenticação
│
├── lib/                # Bibliotecas e utilitários
│   ├── supabaseClient.ts      # Cliente Supabase
│   ├── documentTemplates.ts   # Templates de documentos
│   └── printUtils.ts          # Utilitários de impressão
│
├── types.ts            # Definições TypeScript
├── constants.tsx       # Constantes
├── App.tsx            # Componente raiz
│
├── db_schema.sql      # Schema do banco principal
├── accountability_schema_v2.sql  # Schema de prestação
│
└── .env.local         # Variáveis de ambiente (criar)
```

---

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento (com hot reload)
npm run dev

# Build para produção
npm run build

# Preview da build de produção
npm run preview

# Verificar tipos TypeScript
npx tsc --noEmit

# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
```

---

## 🐛 Problemas Comuns

### ❌ Erro: "Invalid Supabase URL"

**Solução:**
- Verifique se o `.env.local` existe
- Confirme que as variáveis estão corretas
- Reinicie o servidor (`Ctrl+C` e `npm run dev`)

### ❌ Erro: "Permission denied" ao buscar dados

**Solução:**
- Execute os scripts de políticas RLS
- Verifique se seu usuário está autenticado
- Confirme que o role está correto na tabela `users`

### ❌ Erro: "Table does not exist"

**Solução:**
- Execute os scripts SQL na ordem correta
- Verifique no Supabase → Table Editor se as tabelas foram criadas
- Re-execute os scripts se necessário

### ❌ Página em branco / Erro no console

**Solução:**
- Abra o DevTools (F12)
- Veja o erro no console
- Geralmente é problema de variáveis de ambiente

---

## 📖 Próximos Passos

### Para Desenvolvedores

1. ✅ Leia a **ANALISE_COMPLETA_SISTEMA.md** para entender a arquitetura
2. ✅ Veja **ARQUITETURA_VISUAL.md** para diagramas
3. ✅ Consulte **EXEMPLOS_CODIGO.md** para padrões de código
4. ✅ Siga o **CHECKLIST_MELHORIAS.md** para contribuir

### Para Usuários Finais

1. ✅ Explore o **Dashboard** para entender as métricas
2. ✅ Crie alguns **Lançamentos** de teste
3. ✅ Experimente a **Prestação de Contas**
4. ✅ Gere os **Documentos** (Ata, Ordem, Recibo)

---

## 🎓 Tutoriais Rápidos

### Como Criar um Lançamento Financeiro

1. Menu **Lançamentos** → Botão **+ Novo Lançamento**
2. Preencha:
   - **Escola:** Selecione a escola
   - **Data:** Data do lançamento
   - **Tipo:** Entrada ou Saída
   - **Programa:** Ex: PDDE
   - **Rubrica:** Ex: Material de Consumo
   - **Valor:** Ex: 1500,00
   - **Descrição:** Ex: Compra de material escolar
3. (Opcional) Adicione anexos
4. Clique em **Salvar**

### Como Fazer Prestação de Contas

1. Menu **Prestação de Contas** → Botão **+ Nova Prestação**
2. **Selecione o Lançamento** que deseja prestar contas
3. **Adicione os Itens** da compra:
   - Descrição: Ex: Caderno 100 folhas
   - Quantidade: 50
   - Unidade: UN
   - Preço Unitário: 10,00
4. **Selecione Fornecedores Concorrentes** (até 3)
5. **Preencha os Preços** dos concorrentes para cada item
6. Clique em **Salvar Processo**
7. **Gere os Documentos**:
   - Ata de Assembleia
   - Consolidação de Pesquisas
   - Ordem de Compra
   - Recibo

### Como Importar Itens via Excel

1. Na tela de Prestação de Contas, clique em **Baixar Template**
2. Abra o arquivo CSV no Excel
3. Preencha as colunas:
   - **Descrição:** Nome do item
   - **Quantidade:** Número
   - **Unidade:** UN, KG, CX, etc
   - **Preço Vencedor:** Preço do fornecedor vencedor
   - **Preço Concorrente 1:** (opcional)
   - **Preço Concorrente 2:** (opcional)
4. Salve o arquivo
5. Clique em **Importar do Excel** e selecione o arquivo
6. Confira os dados importados

---

## 🔐 Roles e Permissões

### Administrador
- ✅ Acesso total ao sistema
- ✅ Gerencia todas as escolas
- ✅ Cria/edita/exclui qualquer dado
- ✅ Acessa configurações

### Operador
- ✅ Cria/edita lançamentos de todas as escolas
- ✅ Visualiza dashboards completos
- ❌ Não acessa configurações

### Diretor
- ✅ Gerencia apenas sua escola
- ✅ Cria/edita lançamentos da sua escola
- ✅ Faz prestação de contas
- ❌ Não vê outras escolas
- ❌ Não acessa configurações

### Técnico GEE
- ✅ Visualiza escolas atribuídas (somente leitura)
- ✅ Vê dashboards das escolas atribuídas
- ❌ Não cria/edita dados
- ❌ Não acessa configurações

---

## 🆘 Suporte

### Documentação

- **Análise Completa:** `ANALISE_COMPLETA_SISTEMA.md`
- **Arquitetura:** `ARQUITETURA_VISUAL.md`
- **Exemplos de Código:** `EXEMPLOS_CODIGO.md`
- **Checklist de Melhorias:** `CHECKLIST_MELHORIAS.md`
- **Resumo Executivo:** `RESUMO_EXECUTIVO.md`

### Links Úteis

- **Supabase Docs:** https://supabase.com/docs
- **React Docs:** https://react.dev/
- **TypeScript Docs:** https://www.typescriptlang.org/docs/
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Recharts:** https://recharts.org/

### Comunidade

- **Issues:** Reporte bugs e sugira melhorias
- **Discussions:** Tire dúvidas e compartilhe ideias
- **Pull Requests:** Contribua com código

---

## ✅ Checklist de Configuração

Use este checklist para garantir que tudo está funcionando:

- [ ] Node.js instalado (versão 18+)
- [ ] Projeto clonado
- [ ] Dependências instaladas (`npm install`)
- [ ] Projeto Supabase criado
- [ ] Script `db_schema.sql` executado
- [ ] Script `accountability_schema_v2.sql` executado
- [ ] Script `db_indexes.sql` executado (opcional)
- [ ] Script `supabase_policies_granular.sql` executado
- [ ] Arquivo `.env.local` criado
- [ ] Variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` configuradas
- [ ] Servidor rodando (`npm run dev`)
- [ ] Acesso ao sistema (http://localhost:5173)
- [ ] Conta criada e login funcionando
- [ ] Role ajustado para Administrador
- [ ] Primeira escola criada
- [ ] Primeiro programa criado
- [ ] Primeira rubrica criada
- [ ] Primeiro lançamento criado
- [ ] Prestação de contas testada
- [ ] Documentos gerados com sucesso

---

## 🎯 Próxima Etapa

Agora que o sistema está rodando, recomendamos:

1. **Explorar todas as funcionalidades** para entender o fluxo
2. **Ler a documentação técnica** para entender a arquitetura
3. **Revisar o código** dos componentes principais
4. **Implementar melhorias** seguindo o CHECKLIST_MELHORIAS.md

---

**Boa sorte e bom desenvolvimento! 🚀**

---

**Documento criado em:** 08/01/2026  
**Versão:** 1.0  
**Última atualização:** 08/01/2026
