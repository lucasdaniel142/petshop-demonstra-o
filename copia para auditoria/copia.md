# Cópia para auditoria — Sistema E-commerce Sagrada Família V1

Documento de referência para revisão técnica (UX/UI, performance, segurança/LGPD).  
**Última atualização:** reflete as melhorias aplicadas no código após o raio-X do comitê.

---

## 1. Segurança e dados

| Item | Severidade tratada | Implementação |
|------|-------------------|---------------|
| XSS na impressão de pedidos (HTML dinâmico) | Crítica | `escapeHtml()` em `OrderManager.tsx` (cliente, endereço, CEP, nomes de itens e valores no template de impressão). |
| Sanitização nome/endereço (checkout) | Média | `sanitizeCustomerText()` em `src/shared/utils/sanitizeCustomerInput.ts`; uso em `CartDrawer.tsx`. Espelho em `api/checkout.ts` + validação telefone (≥10 dígitos) e CEP (8 dígitos). |
| PII em armazenamento local | — | Carrinho persiste só `items` em `sessionStorage` (`useCartStore.ts`); dados do cliente ficam em estado até o envio. |
| Registro FCM + Firestore rules (`request.auth`) | Média | `ensureAnonymousAuth()` em `firebase.ts`; chamada no início de `requestNotificationToken()` em `notifications.ts`. **`signInAnonymously` deve estar ativo no Firebase Console → Authentication.** |
| Gravação `fcmTokens` | Baixa | `try/catch` no `setDoc` em `CartDrawer.tsx`; nome gravado com `sanitizeCustomerText`. |

---

## 2. Performance

| Item | Implementação |
|------|----------------|
| Re-renders na grade | `ProductCard.tsx`: `React.memo` + selectors Zustand por produto (sem assinar o carrinho inteiro). |
| LCP / imagens | Primeiros 6 cards: `loading="eager"`; primeiro card: `fetchPriority="high"`; `width`/`height`/`decoding` na imagem do produto. |
| CLS | Logo em `Header.tsx` com `width`/`height`. |
| Vitrine × Firestore | `Home.tsx`: paginação `PAGE_SIZE = 24` com `orderBy('nome')`, `limit`, `startAfter`; botão **Carregar mais**; aviso quando filtros zeram o lote mas ainda há páginas. |
| Índice Firestore | Consulta simples em `nome` ASC — índice composto costuma **não** ser necessário; se o console sugerir link, criar conforme indicado. |

---

## 3. UX / PWA / acessibilidade

| Item | Implementação |
|------|----------------|
| Prompt PWA menos invasivo | `InstallPWA.tsx`: contador de visitas (`localStorage`), dispensar persistente, iOS com delay maior; botões com área tocável e `aria-label`. |
| Manifest | `vite.config.ts`: ícones PNG 192/512 (`any` + `maskable`) para melhor compatibilidade de instalação. |
| Carrinho | Controles ± com área ≥ ~44px; botão confirmar com `aria-busy` e texto “Enviando pedido…”. |

---

## 4. Arquivos principais alterados (auditoria → código)

- `src/features/admin/OrderManager.tsx`
- `src/features/catalog/Home.tsx`
- `src/features/catalog/ProductCard.tsx`
- `src/features/cart/CartDrawer.tsx`
- `src/shared/components/InstallPWA.tsx`
- `src/shared/components/Header.tsx`
- `src/shared/lib/firebase.ts`
- `src/shared/lib/notifications.ts`
- `src/shared/utils/sanitizeCustomerInput.ts`
- `api/checkout.ts`
- `vite.config.ts`

---

## 5. Checklist pós-deploy (operacional)

1. Firebase **Authentication** → método **Anonymous** habilitado (push opcional + `fcmTokens`).
2. Variáveis de ambiente (`VITE_*`, service account na API) conferidas no ambiente Vercel.
3. `npm run build` sem erros antes de publicar.
4. Testar fluxo: vitrine → carregar mais → carrinho → checkout → WhatsApp; pedido em **Pedidos** admin e impressão sem HTML injetado em nome/endereço de teste (`<script>` / tags).

---

## 6. Pendências opcionais (não bloqueantes)

- Focus trap no drawer/modal (hook ou lib dedicada).
- Paginação ou infinite scroll com pré-busca quando filtros esvaziam várias páginas seguidas (UX avançada).

---

*Este arquivo serve como cópia única de evidências para auditoria interna ou externa alinhada ao stack atual (React 19, Vite, Tailwind 4, Zustand, Firebase, Vercel).*
