# Plataforma de E-commerce White Label

Sistema de e-commerce com checkout via WhatsApp, painel administrativo e notificações push. Desenvolvido para ser adaptado a qualquer tipo de loja — supermercado, açaíteria, pet shop, farmácia, etc.

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19 + TypeScript + Tailwind CSS 4 |
| Estado | Zustand |
| Backend | Vercel Serverless Functions |
| Banco de dados | Firebase Firestore |
| Auth | Firebase Authentication |
| PWA | Vite PWA Plugin |

## Como rodar localmente

```bash
# 1. Instale as dependências
npm install

# 2. Configure as variáveis de ambiente
cp .env.example .env.local
# Preencha .env.local com suas credenciais Firebase

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

O Vite sobe em `http://localhost:3000` com proxy automático para `/api`.

## Deploy

O deploy é feito na Vercel conectada ao repositório GitHub. Configure as variáveis de ambiente no painel da Vercel antes de fazer o deploy.

Consulte o `.env.example` para ver todas as variáveis necessárias.

## Segurança

- Pedidos são criados exclusivamente via `/api/checkout` (Firebase Admin SDK)
- Preços e fretes são validados no servidor — não podem ser manipulados pelo cliente
- Regras do Firestore bloqueiam escrita direta na coleção `pedidos`
