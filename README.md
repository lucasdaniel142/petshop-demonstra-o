# Plataforma de Delivery e E-commerce

Este é o repositório oficial da plataforma de delivery e e-commerce da empresa. O sistema é uma Single Page Application (SPA) de alta performance, projetada para escalar e fornecer uma experiência mobile-first (PWA) aos clientes, com painel administrativo integrado e segurança de dados nativa.

## 🚀 Stack Tecnológica

| Camada | Tecnologia | Descrição |
|--------|------------|-----------|
| **Frontend** | React 19 + TypeScript | Interface de usuário componentizada |
| **Estilização** | Tailwind CSS 4 | Design System e responsividade |
| **Estado Global**| Zustand | Gerenciamento de carrinho e fluxo de usuário |
| **Backend API** | Vercel Serverless (Node.js) | Rotas seguras para pagamentos e notificações |
| **Banco de Dados**| Firebase Firestore | NoSQL Real-time para pedidos e produtos |
| **Autenticação** | Firebase Auth | Gerenciamento de acessos do painel administrativo |
| **Pagamentos** | Mercado Pago Checkout Bricks | SDKs oficiais (Client/Server) para Pix, Cartão e Wallet |
| **Imagens** | ImgBB API | Hospedagem gratuita de assets de produtos |
| **Segurança** | Criptografia AES-256 | Adequação LGPD com proteção de dados PII |
| **Engajamento** | Firebase Cloud Messaging | Disparo de Notificações Push nativas |

## ✨ Funcionalidades e Compliance

- **Adequação LGPD:** Política de Privacidade dinâmica, consentimento explícito no checkout e criptografia AES-256 de dados sensíveis.
- **Segurança Reforçada:** Verificação obrigatória de assinatura de Webhooks e validação de valor mínimo de pedido no servidor.
- **Resiliência:** Sistema de Fallback para WhatsApp caso o pagamento online falhe ou seja rejeitado.
- **Pronto para Produção:** Inclui `CHECKLIST_POS_DEPLOY.md` para validação e `GUIA_DE_EMERGENCIA.md` para continuidade de negócio.

## ⚙️ Como Rodar o Projeto Localmente

Requisitos: Node.js (v18+) e NPM/Yarn.

```bash
# 1. Instale as dependências do projeto
npm install

# 2. Configure as variáveis de ambiente
# Solicite o arquivo .env.local aos administradores da infraestrutura
# ou crie um arquivo com base no .env.example

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

O projeto estará disponível em **http://localhost:3000**.

## 🛡️ Arquitetura e Segurança

Para garantir a privacidade dos clientes e a segurança das transações, este projeto utiliza **Application-Level Encryption**.
Os dados sensíveis dos clientes (Nome, Endereço, CPF, Email e CEP) são criptografados antes de serem salvos no banco de dados usando o algoritmo AES-256-GCM. 
A chave de criptografia (`APP_ENCRYPTION_KEY`) reside exclusivamente no servidor (Vercel) e não é exposta ao Frontend ou ao Banco de Dados. O painel administrativo faz chamadas à API protegidas por JWT para descriptografar dados sob demanda.

## 📂 Estrutura de Pastas

```
├── public/              → Assets estáticos (logo, favicon, PWA manifest)
├── src/
│   ├── components/      → Componentes UI reutilizáveis
│   ├── contexts/        → Provedores de Contexto (ex: Autenticação)
│   ├── hooks/           → Hooks customizados (carrinho, push notifications)
│   ├── lib/             → Inicialização e instâncias de serviços (Firebase)
│   ├── pages/           → Páginas da aplicação (Home, Admin, Checkout)
│   ├── store/           → Gerenciadores de estado global (Zustand)
│   ├── types/           → Definições de tipagem TypeScript
│   ├── utils/           → Utilitários e formatações
│   ├── App.tsx          → Mapeamento de Rotas
│   └── index.css        → Tema base e utilitários CSS
├── api/                 → Rotas de Backend (Vercel Serverless Functions)
├── scripts/             → Scripts de automação (ex: setup de administradores)
├── firestore.rules      → Regras de segurança (Schema Validation) do banco de dados
└── vercel.json          → Configuração de roteamento de produção
```

## 📜 Scripts NPM Disponíveis

- `npm run dev`: Inicia o servidor local.
- `npm run build`: Compila a aplicação para produção.
- `npm run preview`: Testa o build de produção localmente.
- `npm run lint`: Realiza a checagem estática de tipos.

