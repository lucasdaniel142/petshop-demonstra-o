# 📋 Code Review — Supermercado Sagrada Família
### Auditoria Enterprise Grade · React + Vite + Tailwind CSS + Firebase

---

## Índice Rápido

| # | Arquivo | Severidade | Tipo |
|---|---------|------------|------|
| 1 | `firestore.rules` | 🔴 CRÍTICO | Segurança |
| 2 | `contexts/AuthContext.tsx` | 🔴 CRÍTICO | Segurança + Bug |
| 3 | `components/admin/ProtectedRoute.tsx` | 🔴 CRÍTICO | Bug (Flash de UI) |
| 4 | `lib/firebase.ts` | 🟠 ALTO | Segurança |
| 5 | `pages/admin/TeamManager.tsx` | 🟠 ALTO | Bug + Crash |
| 6 | `pages/admin/ProductManager.tsx` | 🟠 ALTO | Bug Crítico de Dados |
| 7 | `pages/Home.tsx` | 🟡 MÉDIO | Performance + UX |
| 8 | `pages/admin/PriceManager.tsx` | 🟡 MÉDIO | UX + Erro Silencioso |

---

## PASSO 1 — Auditoria de Segurança e Lógica

---

### 🔴 CRÍTICO #1 — `firestore.rules`: Login do Admin NUNCA funciona

**Por que está errado:**
As regras atuais são:
```
match /produtos/{document=**} { allow read: if true; allow write: if false; }
match /{document=**} { allow read, write: if false; }
```
O `AuthContext` precisa fazer `getDoc(doc(db, 'admins', user.uid))` para verificar a role. Mas a regra atual **bloqueia TODAS as leituras que não sejam em `/produtos`**, incluindo `/admins`. Isso significa que a consulta de verificação de role **sempre falha com `permission-denied`**. O `catch` no `AuthContext` chama `signOut`, então o admin é imediatamente deslogado após tentar entrar.

O login nunca funciona em produção com essas regras. Em desenvolvimento local com o emulador isso pode passar despercebido.

**Arquivo corrigido:** `firestore.rules`

**O que mudou:**
- Adicionada regra para `/admins/{adminId}`: qualquer usuário autenticado pode ler **seu próprio** documento (`request.auth.uid == adminId`).
- Admins autenticados podem escrever em `/produtos` e em `/admins`.
- Criada função helper `isAdmin()` para centralizar a lógica de verificação.

---

### 🔴 CRÍTICO #2 — `AuthContext.tsx`: `signOut` não é chamado em caso de erro

**Por que está errado:**
```tsx
// CÓDIGO ORIGINAL com o bug:
} catch (error) {
  console.error("Erro ao verificar permissões:", error);
  setCurrentUser(null);   // ✅ Estado local limpo
  setIsAdmin(false);      // ✅ Estado local limpo
  // ❌ FALTOU: await signOut(auth) ← usuário ainda está logado no Firebase!
}
```
Se o Firestore estiver offline ou a regra de segurança barrar a leitura de `/admins`, o `catch` é executado. O estado local do React fica `currentUser: null`, mas a sessão do Firebase Auth continua ativa. Ao recarregar a página, `onAuthStateChanged` dispara novamente com o mesmo usuário, causando um loop.

**Arquivo corrigido:** `src/contexts/AuthContext.tsx`

**O que mudou:**
- Bloco `catch` agora chama `await signOut(auth).catch(() => {})`.
- `setLoading(false)` movido para `finally` — garantia que sempre é chamado.

---

### 🔴 CRÍTICO #3 — `ProtectedRoute.tsx`: Flash de conteúdo e redirecionamento prematuro

**Por que está errado:**
```tsx
// CÓDIGO ORIGINAL:
const { currentUser, isAdmin } = useAuth(); // ← não usa `loading`

if (!currentUser || !isAdmin) {
  return <Navigate to="/login" replace />;
}
```
No instante zero da aplicação: `currentUser = null`, `isAdmin = false`, `loading = true`. O `AuthProvider` bloqueia com `{!loading && children}`, mas isso é apenas a **primeira** linha de defesa. Se no futuro o `AuthProvider` for refatorado ou o componente for usado fora do `AuthProvider`, o `ProtectedRoute` redirecionará para `/login` imediatamente, antes de a verificação do Firebase terminar — causando o "piscar na tela".

**Arquivo corrigido:** `src/components/admin/ProtectedRoute.tsx`

**O que mudou:**
- `loading` é agora lido do contexto.
- Enquanto `loading = true`, exibe um spinner de "Verificando acesso...".
- Só após `loading = false` toma a decisão de redirecionar ou renderizar.
- **Defense in Depth**: duas camadas independentes de proteção.

---

### 🟠 ALTO #4 — `firebase.ts`: Credenciais logadas no console em produção

**Por que está errado:**
```tsx
// CÓDIGO ORIGINAL:
console.log('Firebase config loaded:', {
  apiKey: firebaseConfig.apiKey,   // ← visível em produção no DevTools
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
});
```
Em produção, qualquer usuário pode abrir o DevTools e ver `apiKey`, `authDomain` e `projectId`. Embora as chaves do Firebase sejam tecnicamente semi-públicas (aparecem no JS bundle), logar ativamente facilita ataques de enumeração e demonstra falta de higiene de segurança.

**Arquivo corrigido:** `src/lib/firebase.ts`

**O que mudou:**
- `console.log` envolto em `if (import.meta.env.DEV)` — só aparece no servidor de dev, nunca em produção.

---

### 🟠 ALTO #5 — `TeamManager.tsx`: Crash ao criar segundo administrador

**Por que está errado:**
```tsx
// CÓDIGO ORIGINAL (e o mesmo bug no AdminAccessManager.tsx):
const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
// ↑ Na segunda chamada: CRASH com "Firebase App named 'SecondaryApp' already exists"
```
O "Secondary App Trick" é correto para evitar deslogar o admin atual, mas a implementação original não verifica se o app secundário já foi inicializado. Na segunda criação de usuário, `initializeApp` lança uma exceção fatal que quebra toda a tela.

**Arquivo corrigido:** `src/pages/admin/TeamManager.tsx`

**O que mudou:**
- Criada função `getSecondaryApp()` que usa `getApps().find(...)` para reutilizar o app existente em vez de criar um novo.
- Adicionada validação de senha forte (min 8 chars, 1 maiúscula, 1 número) com feedback visual inline antes do submit.

---

### 🟠 ALTO #6 — `ProductManager.tsx`: Import path errado + Estrutura de dados quebrada

**Por que está errado — Bug 1 (Build Error):**
```tsx
import { db } from '@/src/lib/firebase'; // ❌ Path errado
// O alias @ aponta para src/, então o path correto é:
import { db } from '@/lib/firebase'; // ou '../../lib/firebase'
```
Isso causa `Module not found` no build de produção. Pode passar despercebido em dev se houver tsconfig com path mapping diferente.

**Por que está errado — Bug 2 (Dados Silenciosamente Incompatíveis):**
```tsx
// ProductManager salva assim (número simples):
precos: { benedito_bentes: 15.90, vergel: 12.00 }

// Mas PriceManager e a vitrine esperam isso (objeto StorePrice):
precos: { benedito_bentes: { valor: 15.90, emOferta: false, esgotado: false } }
```
Produtos criados pelo `ProductManager` aparecem no Firestore mas **nunca** na vitrine pública, porque o filtro `product.precos[selectedStore]?.esgotado` retorna `undefined` (lê um número como objeto), e o produto é filtrado.

**Arquivo corrigido:** `src/pages/admin/ProductManager.tsx`

**O que mudou:**
- Import path corrigido para `../../lib/firebase`.
- Payload de salvamento agora cria objetos `StorePrice` completos.
- `alert()` e `confirm()` substituídos por feedback inline e modal de confirmação customizado.
- Campo `unit` adicionado ao formulário (era ignorado antes).

---

## PASSO 2 — Refatoração e Clean Code

---

### 🟡 MÉDIO #7 — `Home.tsx`: `onSnapshot` na vitrine pública é caro demais

**Por que está errado:**
`onSnapshot` cria um listener WebSocket persistente. Para a vitrine pública (leitura), isso significa:
- 1 leitura por documento × N clientes conectados **a cada vez que um admin edita qualquer coisa**.
- Com 100 produtos e 50 clientes simultâneos, uma edição de preço gera **5.000 leituras** do Firestore.
- O plano Spark gratuito tem limite de 50.000 leituras/dia — esgotável com poucos usuários.

**Arquivo corrigido:** `src/pages/Home.tsx`

**O que mudou:**
- `onSnapshot` substituído por `getDocs` (leitura única) com `query(orderBy('nome', 'asc'))`.
- Ordenação feita no servidor (Firestore), não no cliente.
- Botão "Tentar Novamente" no estado de erro.
- `useEffect` de limpeza do carrinho corrigido: dependência era `[selectedStore, items.length, clearCart]`, causando re-execuções ao adicionar/remover itens. Agora é `[selectedStore]` (com eslint-disable comentado explicando o motivo).

---

### 🟡 MÉDIO (UX) — `Home.tsx` e `PriceManager.tsx`: Loading states pobres

**Por que está errado:**
Ambos usavam texto simples ("Carregando produtos...") que causa Layout Shift e parece inacabado.

**O que mudou:**
- `Home.tsx`: 8 cards skeleton com `animate-pulse` replicando o layout real dos cards.
- `PriceManager.tsx`: Linhas skeleton na tabela com `animate-pulse`.

---

### 🟡 MÉDIO — `PriceManager.tsx`: Erros de escrita são silenciosos para o usuário

**Por que está errado:**
```tsx
} catch (err) {
  console.error(`Erro ao atualizar ${field}:`, err); // ← só aparece no DevTools
}
```
O admin pode editar um preço, o input mostrar "✓" (pois o feedback estava fora do try/catch no original do AdminDashboard), mas nada ser salvo no Firestore. A alteração se perde silenciosamente.

**Arquivo corrigido:** `src/pages/admin/PriceManager.tsx`

**O que mudou:**
- `SaveStatus` agora tem 4 estados: `idle | saving | success | error`.
- Em caso de erro, o input fica com borda vermelha e ícone "×" vermelho.
- Banner de erro no topo da página com botão de fechar.

---

## PASSO 3 — Análise de Componentes Legados

### ⚠️ `AdminDashboard.tsx` e `AdminAccessManager.tsx` — Componentes Zumbis

**Situação:** Esses dois arquivos existem no projeto mas **não são mais usados pelo roteamento atual**. O `App.tsx` usa `PriceManager`, `TeamManager` e `ProductManager` como sub-rotas de `/admin`. O `AdminDashboard.tsx` e `AdminAccessManager.tsx` são código morto.

**Recomendação:** Deletar ambos. Eles ocupam espaço no bundle (mesmo que tree-shaking ajude), têm os mesmos bugs corrigidos nos arquivos novos, e confundem futuros desenvolvedores sobre qual é a "fonte da verdade".

---

## Resumo das Ações por Arquivo

| Arquivo | Ação |
|---------|------|
| `firestore.rules` | ✅ Substituir completamente |
| `src/lib/firebase.ts` | ✅ Substituir |
| `src/contexts/AuthContext.tsx` | ✅ Substituir |
| `src/components/admin/ProtectedRoute.tsx` | ✅ Substituir |
| `src/pages/Home.tsx` | ✅ Substituir |
| `src/pages/admin/PriceManager.tsx` | ✅ Substituir |
| `src/pages/admin/ProductManager.tsx` | ✅ Substituir |
| `src/pages/admin/TeamManager.tsx` | ✅ Substituir |
| `src/components/AdminDashboard.tsx` | 🗑️ Deletar (componente legado) |
| `src/components/AdminAccessManager.tsx` | 🗑️ Deletar (componente legado) |

---

## Recomendações Adicionais para o Futuro

1. **Cloud Function para criação de admins**: Mover a criação de usuários admin para uma Firebase Cloud Function com Admin SDK. Isso elimina completamente a necessidade do "Secondary App Trick" e remove a escrita em `/admins` pelo cliente.

2. **Tipagem centralizada**: Criar um único `src/types/index.ts` com `StorePrice`, `AdminProduct`, `FirestoreProduct` etc. e importar de lá. Atualmente cada arquivo redefine os mesmos tipos.

3. **Variáveis de ambiente em produção**: Garantir que as variáveis `VITE_FIREBASE_*` nunca sejam commitadas no repositório (o `.gitignore` já existe, verificar se `.env.local` está listado).

4. **Error Boundary**: Adicionar um React Error Boundary no `App.tsx` para capturar erros de renderização inesperados e exibir uma tela amigável em vez de uma tela branca.
