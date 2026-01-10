# Guia de Deploy - BRN Suite Escolas

Este projeto é uma aplicação React construída com Vite. Abaixo estão os passos para colocar o sistema no ar.

## 1. Preparação (Build)

O comando de build gera a pasta `dist/` com os arquivos otimizados para produção.

```bash
npm run build
```

## 2. Configuração de Ambiente

Para que o sistema funcione em produção, você precisará configurar as variáveis de ambiente no serviço de hospedagem escolhido.

As variáveis necessárias são (mesmas do seu `.env.local`):
- `VITE_SUPABASE_URL`: Sua URL do Supabase
- `VITE_SUPABASE_ANON_KEY`: Sua chave pública (anon) do Supabase

## 3. Deploy com Vercel (Escolhido)

A melhor maneira de fazer deploy no Vercel é conectar seu repositório Git (GitHub, GitLab ou Bitbucket).

### Passo a Passo:

1. **Suba seu código para um repositório Git** (se ainda não fez):
   - Crie um repositório no GitHub/GitLab.
   - Execute no terminal:
     ```bash
     git add .
     git commit -m "Preparando para deploy"
     git remote add origin <SUA_URL_DO_GIT>
     git push -u origin main
     ```

2. **Conecte ao Vercel**:
   - Acesse [vercel.com/new](https://vercel.com/new).
   - Selecione o repositório que você acabou de criar.
   - O Vercel detectará automaticamente que é um projeto **Vite**.

3. **Configuração Fundamental (Variáveis de Ambiente)**:
   - Na tela de configuração de importação do Vercel, procure a seção **Environment Variables**.
   - Adicione as mesmas variáveis que você tem no seu `.env.local`:
     - `VITE_SUPABASE_URL`: (Valor do seu projeto Supabase)
     - `VITE_SUPABASE_ANON_KEY`: (Valor da sua chave pública)

4. **Deploy**:
   - Clique em **Deploy**.
   - Aguarde a finalização.

### Configuração de Rotas (SPA)
Já criei um arquivo `vercel.json` na raiz do projeto para garantir que o roteamento funcione corretamente e você não tenha erros 404 ao atualizar a página.

## 4. Verificação Pós-Deploy

1. Acesse a URL gerada pelo provedor.
2. Tente fazer login.
3. Se houver erro de "URL não permitida" no Supabase:
   - Vá no painel do Supabase > Authentication > URL Configuration.
   - Adicione a URL do seu novo site (ex: `https://seu-site.netlify.app`) na lista de **Redirect URLs**.
