# 🏫 BRN Suite Escolas

<div align="center">

![Version](https://img.shields.io/badge/version-0.0.0-blue.svg)
![React](https://img.shields.io/badge/React-19.2.3-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178c6.svg)
![Supabase](https://img.shields.io/badge/Supabase-2.89.0-3ecf8e.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Sistema completo de gestão financeira para escolas com foco em prestação de contas**

[Documentação](#-documentação) • [Instalação](#-instalação-rápida) • [Features](#-funcionalidades) • [Arquitetura](#-arquitetura)

</div>

---

## 📋 Sobre o Projeto

O **BRN Suite Escolas** é um sistema web moderno desenvolvido para facilitar a gestão financeira de escolas, com ênfase especial no processo de prestação de contas. O sistema oferece controle completo de lançamentos financeiros, geração automática de documentos oficiais e dashboards analíticos.

### 🎯 Principais Objetivos

- ✅ Simplificar o controle financeiro escolar
- ✅ Automatizar a geração de documentos de prestação de contas
- ✅ Garantir transparência e rastreabilidade
- ✅ Facilitar auditorias e fiscalizações
- ✅ Reduzir tempo gasto em tarefas burocráticas

---

## ✨ Funcionalidades

### 💰 Gestão Financeira

- **Lançamentos Completos**: Entradas e saídas com categorização detalhada
- **Rateio de Valores**: Distribuição entre múltiplas rubricas
- **Anexos Categorizados**: Upload de notas fiscais, comprovantes e certidões
- **Conciliação Bancária**: Controle de status de pagamentos
- **Auditoria**: Logs completos de todas as alterações

### 📊 Prestação de Contas

- **Processo Guiado**: Fluxo intuitivo passo a passo
- **Importação Excel**: Template para facilitar entrada de dados
- **Cotação de Preços**: Comparação de até 3 fornecedores
- **Geração de Documentos**:
  - Ata de Assembleia
  - Consolidação de Pesquisas de Preços (A4 paisagem)
  - Ordem de Compra (com código SEEC)
  - Recibo de Pagamento
  - Cotação Individual por Fornecedor

### 📈 Dashboard e Relatórios

- **Métricas em Tempo Real**: Entradas, saídas, saldo e pendências
- **Gráficos Interativos**: Visualização por período, programa e natureza
- **Alertas Inteligentes**: Saldo baixo, programas sem execução, atrasos
- **Exportação**: CSV para análise externa

### 👥 Controle de Acesso (RBAC)

- **Administrador**: Acesso total ao sistema
- **Operador**: Gestão de lançamentos de todas as escolas
- **Diretor**: Gestão apenas da própria escola
- **Técnico GEE**: Visualização das escolas atribuídas

### ⚙️ Configurações

- **Escolas**: Cadastro completo com INEP, SEEC, CNPJ
- **Programas e Rubricas**: Organização hierárquica
- **Fornecedores**: Dados completos e bancários
- **Contas Bancárias**: Vinculação a programas
- **Métodos de Pagamento**: Pix, boleto, transferência, etc

---

## 🚀 Tecnologias

### Frontend

- **[React 19](https://react.dev/)** - Biblioteca UI
- **[TypeScript 5.8](https://www.typescriptlang.org/)** - Tipagem estática
- **[Vite 6.2](https://vitejs.dev/)** - Build tool ultra-rápido
- **[Tailwind CSS](https://tailwindcss.com/)** - Framework CSS
- **[Recharts 3.6](https://recharts.org/)** - Gráficos interativos

### Backend

- **[Supabase](https://supabase.com/)** - Backend as a Service
  - PostgreSQL - Banco de dados
  - Auth - Autenticação
  - Row Level Security - Segurança granular
  - Storage - Armazenamento de arquivos

### Ferramentas

- **Material Symbols** - Ícones do Google
- **Google Fonts** - Manrope e Noto Sans

---

## 📦 Instalação Rápida

### Pré-requisitos

- Node.js 18 ou superior
- Conta no Supabase (gratuita)

### Passo a Passo

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd brn-suite-escolas

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais do Supabase

# 4. Execute o sistema
npm run dev
```

**Acesse:** http://localhost:5173

### Configuração do Banco de Dados

No Supabase SQL Editor, execute na ordem:

1. `db_schema.sql` - Schema principal
2. `accountability_schema_v2.sql` - Schema de prestação de contas
3. `EXEMPLOS_CODIGO.md` → `db_indexes.sql` - Índices (recomendado)
4. `EXEMPLOS_CODIGO.md` → `supabase_policies_granular.sql` - Segurança (importante)

📖 **Guia completo:** [GUIA_INICIO_RAPIDO.md](./GUIA_INICIO_RAPIDO.md)

---

## 🏗️ Arquitetura

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
┌──────▼──────────────────┐
│  React + TypeScript     │
│  • Components           │
│  • Pages                │
│  • Hooks                │
└──────┬──────────────────┘
       │
┌──────▼──────────────────┐
│  Supabase Client        │
│  • Auth                 │
│  • Database (PostgREST) │
│  • Storage              │
└──────┬──────────────────┘
       │
┌──────▼──────────────────┐
│  PostgreSQL + RLS       │
│  • 15 Tabelas           │
│  • Políticas de Acesso  │
│  • Triggers & Functions │
└─────────────────────────┘
```

📐 **Diagramas completos:** [ARQUITETURA_VISUAL.md](./ARQUITETURA_VISUAL.md)

---

## 📚 Documentação

### Para Desenvolvedores

| Documento | Descrição |
|-----------|-----------|
| [ANALISE_COMPLETA_SISTEMA.md](./ANALISE_COMPLETA_SISTEMA.md) | Análise técnica detalhada (12.000+ palavras) |
| [ARQUITETURA_VISUAL.md](./ARQUITETURA_VISUAL.md) | Diagramas e fluxos do sistema |
| [EXEMPLOS_CODIGO.md](./EXEMPLOS_CODIGO.md) | Exemplos práticos de implementação |
| [CHECKLIST_MELHORIAS.md](./CHECKLIST_MELHORIAS.md) | Roadmap de melhorias priorizadas |

### Para Usuários

| Documento | Descrição |
|-----------|-----------|
| [GUIA_INICIO_RAPIDO.md](./GUIA_INICIO_RAPIDO.md) | Setup e primeiros passos |
| [RESUMO_EXECUTIVO.md](./RESUMO_EXECUTIVO.md) | Visão geral e métricas |

---

## 🎯 Roadmap

### ✅ Versão Atual (0.0.0)

- ✅ CRUD completo de lançamentos financeiros
- ✅ Sistema de prestação de contas
- ✅ Geração de documentos oficiais
- ✅ Dashboard com métricas e gráficos
- ✅ Controle de acesso por roles
- ✅ Gestão de escolas e fornecedores

### 🔜 Próximas Versões

#### v0.1.0 - Segurança e Performance
- [ ] Políticas RLS granulares
- [ ] Índices de banco de dados
- [ ] Validações no banco
- [ ] Sistema de tratamento de erros

#### v0.2.0 - Qualidade
- [ ] Testes unitários (60% cobertura)
- [ ] Testes de integração
- [ ] Refatoração de componentes grandes
- [ ] Hooks customizados

#### v1.0.0 - Produção
- [ ] Documentação completa
- [ ] Guia de deploy
- [ ] Backup automático
- [ ] Monitoramento de erros

#### v2.0.0 - Features Avançadas
- [ ] Workflow de aprovação
- [ ] Integração bancária (OFX)
- [ ] Orçamento e planejamento
- [ ] Mobile app (React Native)

---

## 📊 Estatísticas do Projeto

```
Linhas de Código:     ~5.000 LOC
Componentes React:    10 componentes
Páginas:              7 páginas
Tabelas no Banco:     15 tabelas
Funções Utilitárias:  ~10 funções
```

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

📋 Consulte [CHECKLIST_MELHORIAS.md](./CHECKLIST_MELHORIAS.md) para ideias de contribuição.

---

## 📝 Comandos Disponíveis

```bash
# Desenvolvimento (com hot reload)
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview

# Verificar tipos TypeScript
npx tsc --noEmit
```

---

## 🐛 Reportar Bugs

Encontrou um bug? Por favor, abra uma issue com:

- Descrição clara do problema
- Passos para reproduzir
- Comportamento esperado vs atual
- Screenshots (se aplicável)
- Versão do navegador e sistema operacional

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](./LICENSE) para mais detalhes.

---

## 👨‍💻 Autores

- **Equipe BRN** - Desenvolvimento inicial

---

## 🙏 Agradecimentos

- Comunidade React
- Equipe Supabase
- Contribuidores open source
- Escolas que testaram o sistema

---

## 📞 Suporte

- 📧 Email: suporte@brnsuite.com.br
- 💬 Discord: [Link do servidor]
- 📖 Docs: [Link da documentação]
- 🐛 Issues: [GitHub Issues]

---

<div align="center">

**Desenvolvido com ❤️ para facilitar a gestão escolar**

[⬆ Voltar ao topo](#-brn-suite-escolas)

</div>
