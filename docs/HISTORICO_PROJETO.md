# Histórico de Desenvolvimento - Supermercado Sagrada Família

Este documento registra as principais decisões arquiteturais, funcionalidades implementadas e instruções de configuração discutidas durante o desenvolvimento do projeto.

## 1. Arquitetura do Projeto
- **Frontend:** React (Vite), TypeScript, Tailwind CSS.
- **Roteamento:** `react-router-dom` (Vitrine em `/`, Admin em `/admin`, Login em `/login`).
- **Backend/Database:** Firebase (Authentication e Firestore).
- **Ícones:** Lucide React.

## 2. Estrutura de Dados no Firestore (Multiloja)
A coleção `produtos` foi modelada para suportar múltiplas filiais no mesmo documento, facilitando a gestão centralizada:

```json
{
  "nome": "Arroz Tio João 5kg",
  "categoria": "Mercearia",
  "imageUrl": "https://...",
  "precos": {
    "benedito_bentes": { "valor": 25.90, "emOferta": false, "esgotado": false },
    "vergel": { "valor": 24.90, "emOferta": true, "esgotado": false },
    "salvador_lyra": { "valor": 25.90, "emOferta": false, "esgotado": true }
  }
}
```

## 3. Funcionalidades Implementadas

### Módulo Administrativo (`/admin`)
- **Proteção de Rota (`ProtectedRoute.tsx`):** Exige autenticação via Firebase Auth e verifica se o usuário possui um documento na coleção `admins` com `role: "admin"`.
- **Layout Base (`AdminLayout.tsx`):** Sidebar responsiva com navegação entre "Preços e Estoque" e "Equipe".
- **Gestão de Preços (`PriceManager.tsx`):**
  - Seletor global de loja (Benedito Bentes, Vergel, Salvador Lyra, Visão Geral).
  - Tabela de edição rápida com inputs numéricos.
  - Toggles para "Em Oferta" (destaque verde) e "Esgotado" (destaque cinza/desabilitado).
  - Atualização em tempo real usando *dot notation* no Firestore (ex: `precos.vergel.valor`).
- **Gestão de Equipe (`TeamManager.tsx`):**
  - Listagem de administradores autorizados.
  - Cadastro de novos admins utilizando o **Secondary App Trick** (cria uma instância secundária do Firebase para usar `createUserWithEmailAndPassword` sem deslogar o gerente atual).

### Script de Importação em Lote (`scripts/importarProdutos.js`)
- Script Node.js (`firebase-admin`) para ler um JSON local (`produtos_entrada.json`), simular enriquecimento de dados via API Cosmos (usando o EAN) e salvar os produtos estruturados no Firestore.
- **Resolução de Erros:** O erro `NOT_FOUND` foi resolvido garantindo que o `getFirestore()` aponte para o banco de dados correto (geralmente `(default)` ou `default` dependendo de como foi criado no console).

## 4. Instruções para Rodar Localmente (no seu PC)

1. **Instalar Dependências:**
   ```bash
   npm install
   ```

2. **Configurar Variáveis de Ambiente:**
   Crie um arquivo `.env` na raiz do projeto com as chaves públicas do seu Firebase:
   ```env
   VITE_FIREBASE_API_KEY="sua-api-key"
   VITE_FIREBASE_AUTH_DOMAIN="seu-projeto.firebaseapp.com"
   VITE_FIREBASE_PROJECT_ID="seu-projeto-id"
   VITE_FIREBASE_STORAGE_BUCKET="seu-projeto.appspot.com"
   VITE_FIREBASE_MESSAGING_SENDER_ID="seu-sender-id"
   VITE_FIREBASE_APP_ID="seu-app-id"
   ```

3. **Rodar o Servidor de Desenvolvimento:**
   ```bash
   npm run dev
   ```

4. **Rodar o Script de Importação:**
   - Coloque o arquivo `serviceAccountKey.json` (baixado do Firebase Console) na raiz do projeto.
   - Execute:
     ```bash
     npm run import-products
     ```

## 5. Próximos Passos Sugeridos
- Configurar as Regras de Segurança do Firestore para garantir que apenas usuários da coleção `admins` possam escrever na coleção `produtos`.
- Integrar a vitrine pública (StoreFront) para ler os preços dinamicamente com base na loja selecionada pelo cliente.
