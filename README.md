# Meu E-commerce — Template White Label

Template base de e-commerce SPA com checkout via WhatsApp, pronto para ser personalizado para qualquer cliente.

## Tecnologias

| Camada | Tecnologia |
|--------|------------|
| UI | React 19 + TypeScript |
| Estilização | Tailwind CSS 4 |
| Estado Global | Zustand |
| Roteamento | React Router v7 |
| Banco de Dados | Firebase Firestore |
| Autenticação | Firebase Auth |
| Upload de Imagens | ImgBB API |
| Bundler | Vite 6 |
| Deploy | Vercel |

## Como Rodar

```bash
# 1. Instale as dependências
npm install

# 2. Configure as variáveis de ambiente
#    Copie o template e preencha com os dados do seu projeto Firebase
cp .env.example .env.local

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

O projeto estará disponível em **http://localhost:3000**.

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (porta 3000) |
| `npm run build` | Build de produção → pasta `dist/` |
| `npm run preview` | Pré-visualizar o build localmente |
| `npm run lint` | Verificar erros de tipagem TypeScript |

## Personalização para Novo Cliente

1. **Logo** — Substitua `public/logo.png` pela logo do cliente
2. **Cores** — Edite as variáveis CSS em `src/index.css` (bloco `@theme`)
3. **Nome** — Troque "Meu E-commerce" nos arquivos indicados no código
4. **Firebase** — Preencha `.env.local` e `serviceAccountKey.json` com as credenciais do projeto Firebase do cliente
5. **WhatsApp** — Configure os números no `.env.local`
6. **Filiais** — Para ativar múltiplas lojas, descomente as linhas marcadas em `src/utils/constants.ts` e `src/types/index.ts`

## Estrutura de Pastas

```
├── public/              → Assets estáticos (logo, favicon)
├── src/
│   ├── components/      → Componentes reutilizáveis
│   ├── contexts/        → React Contexts (autenticação)
│   ├── hooks/           → Hooks customizados
│   ├── lib/             → Configuração do Firebase
│   ├── pages/           → Páginas (Home, Admin)
│   ├── store/           → Stores Zustand (carrinho)
│   ├── types/           → Tipos TypeScript
│   ├── utils/           → Utilitários (WhatsApp, taxas, etc.)
│   ├── App.tsx          → Rotas da aplicação
│   ├── main.tsx         → Entry point
│   └── index.css        → Tema de cores (Tailwind)
├── .env.example         → Template de variáveis de ambiente
├── firestore.rules      → Regras de segurança do Firestore
├── vercel.json          → Config de deploy (SPA rewrites)
└── serviceAccountKey.json → Template credenciais Firebase Admin
```
