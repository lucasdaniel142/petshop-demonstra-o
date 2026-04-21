# Supermercado Sagrada Família

Aplicação React com vitrine, carrinho de compras e painel administrativo para gestão de preços e equipe.

## Funcionalidades

- Vitrine pública com catálogo de produtos e carrinho de pedidos.
- Painel administrativo protegido por Firebase Authentication.
- Gestão de preços por loja e atualização de oferta/estoque no Firestore.
- Cadastro e remoção de acessos administrativos.
- Script de importação de produtos via Firestore em `scripts/importarProdutos.js`.

## Executar localmente

**Pré-requisitos:** Node.js

1. Instale as dependências:
   `npm install`
2. Crie um arquivo de ambiente com base em `.env.example`.
3. Configure as variáveis Firebase no arquivo `.env`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_APP_ID`
4. Inicie o app:
   `npm run dev`

## Painel administrativo

- Página de login: `/login`
- Painel protegido: `/admin`
- Página de equipe: `/admin/equipe`

## Importar produtos

- Execute `npm run import-products` para importar produtos ao Firestore.
- Coloque o arquivo `serviceAccountKey.json` na raiz do projeto.
- Mantenha `serviceAccountKey.json` fora do controle de versão (já adicionado em `.gitignore`).

## Observações

- O app usa Firebase Firestore e Auth no frontend.
- Dependências não utilizadas de exemplo foram removidas do `package.json`.
- A vitrine pública lê a coleção `produtos` do Firestore e mostra apenas itens não esgotados para a loja selecionada.

## Regras de Segurança do Firestore

O arquivo `firestore.rules` garante que:

- Qualquer visitante pode ler `produtos`.
- Apenas administradores validados na coleção `admins` podem escrever em `produtos` e `admins`.

## Deploy em Produção

### Vercel

1. Crie uma conta em https://vercel.com e conecte o repositório ao projeto.
2. Defina o comando de build como `npm run build` e a pasta de saída como `dist`.
3. Adicione as variáveis de ambiente do Firebase:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_APP_ID`
4. Faça deploy e valide a URL gerada.

### Firebase Hosting

1. Instale as ferramentas Firebase: `npm install -g firebase-tools`
2. Faça login: `firebase login`
3. Inicialize o projeto: `firebase init hosting`
   - Escolha o projeto Firebase existente.
   - Use `dist` como diretório público.
   - Aceite single-page app para tratamento de roteamento.
4. Build do frontend: `npm run build`
5. Implemente: `firebase deploy --only hosting`
6. Para regras do Firestore, use: `firebase deploy --only firestore:rules,hosting`
