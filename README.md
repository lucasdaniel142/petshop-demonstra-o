# Plataforma de Delivery e E-commerce: Sagrada Família V1

Este é o repositório oficial da plataforma de delivery e e-commerce de alto desempenho. O sistema foi refatorado para uma arquitetura **Enterprise-Grade**, focada em segurança máxima contra fraudes e resiliência a falhas de terceiros.

## 🚀 Stack Tecnológica

| Camada | Tecnologia | Descrição |
|--------|------------|-----------|
| **Frontend** | React 19 + TypeScript | Interface ultra-rápida com Hooks de transição |
| **Estilização** | Tailwind CSS 4 | Novo motor de estilização de alta performance |
| **Estado Global**| Zustand | Gerenciamento de estado leve e persistente |
| **Backend API** | Vercel Serverless | "Muralha de Segurança" para Checkout e Notificações |
| **Banco de Dados**| Firebase Firestore | NoSQL Real-time com regras de acesso rígidas |
| **PWA** | Workbox | Experiência nativa offline com Runtime Caching |

## ✨ Funcionalidades "Muralha de Segurança"

- **Validação Server-Side:** Diferente de e-commerces comuns, o preço final e as taxas de entrega são calculados no servidor. Isso impede que o usuário altere valores via DevTools.
- **Rules Invioláveis:** A coleção de pedidos está trancada (`allow create: if false`). Somente a API autenticada via Admin SDK pode registrar novos pedidos.
- **Resiliência Assimétrica:** Se as APIs de geolocalização ou CEP falharem, o sistema entra em modo de fallback automático, cobrando uma taxa base e alertando a operação via WhatsApp.
- **Proteção Replay:** APIs de notificação possuem proteção contra repetição de tokens para evitar spam e abuso de infraestrutura.

## ⚙️ Como Rodar o Projeto Localmente

```bash
# 1. Instale as dependências
npm install

# 2. Configure as variáveis de ambiente
# Use o .env.example como base. Para checkout e push em dev, é necessário FIREBASE_SERVICE_ACCOUNT_KEY.

# 3. Desenvolvimento (recomendado): front-end + APIs /api em paralelo
npm run dev
```

Isso sobe o **Vite** em `http://localhost:3000` e um servidor local (`scripts/dev-api-server.ts`) na porta **8787**, com proxy automático de `/api/checkout` e `/api/notify`. Sem o servidor da API, essas rotas retornam 404.

Para rodar **somente** o Vite (sem APIs serverless locais):

```bash
npm run dev:vite-only
```

## 📂 Estrutura de Pastas (Arquitetura Modular)

```
├── api/                 → Rotas de Backend (A Muralha de Segurança)
│   ├── _utils/          → Helpers de Admin SDK e Criptografia
│   └── checkout.ts      → Validador soberano de pedidos
├── src/
│   ├── app/             → Configuração de rotas e provedores
│   ├── features/        → Módulos de negócio (cart, admin, catalog)
│   ├── shared/          → Componentes, hooks e stores reutilizáveis
│   └── types/           → Definições globais de tipagem
├── scripts/
│   └── dev-api-server.ts → Emula /api/checkout e /api/notify no dev local
├── firestore.rules      → Regras de segurança do Firestore
└── vercel.json          → Configurações de roteamento de produção
```

## 📜 Scripts NPM Disponíveis

- `npm run dev`: Vite (porta 3000) + servidor local das rotas `/api` (porta 8787), via proxy — necessário para checkout e notify em desenvolvimento.
- `npm run dev:vite-only`: Apenas Vite (sem `/api` local).
- `npm run dev:api`: Sobe apenas o servidor Express das APIs (uso avançado).
- `npm run build`: Compila para produção.
- `npm run preview`: Testa o build localmente.

---
**Desenvolvido com foco em Confiabilidade (SRE) e Segurança (DevSecOps).**
