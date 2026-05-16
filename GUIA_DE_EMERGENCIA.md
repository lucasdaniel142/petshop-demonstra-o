# 🚨 Guia de Emergência — Procedimentos de Recuperação

> **Objetivo:** Permitir que qualquer pessoa com acesso resolva problemas básicos.
> Mantenha este documento atualizado e acessível.

---

## 1. Onde Está Cada Coisa

| Recurso | Onde acessar |
|---------|-------------|
| **Código-fonte** | GitHub (repositório privado) |
| **Deploy/Hosting** | [vercel.com/dashboard](https://vercel.com/dashboard) |
| **Banco de dados** | [console.firebase.google.com](https://console.firebase.google.com) → Firestore |
| **Autenticação** | Firebase Console → Authentication |
| **Logs do servidor** | Vercel Dashboard → Functions → Logs |
| **Variáveis de ambiente** | Vercel → Settings → Environment Variables |

---

## 2. O Site Caiu (Erro 500 ou Não Carrega)

### Diagnóstico rápido:
1. Acesse a URL da loja no navegador.
2. Se mostrar erro 500: problema no servidor (Vercel API).
3. Se o Checkout falhar: Verifique os logs da função `/api/checkout`.

### Solução:
1. Acesse o **Vercel Dashboard** → seu projeto.
2. Verifique **Functions → Logs** para ver o erro exato.
3. Se for erro de "FIREBASE_SERVICE_ACCOUNT_KEY": verifique se a chave JSON está correta nas variáveis de ambiente.
4. Se o site não abrir: Verifique o status da Vercel.

---

## 3. Checkout ou Pedidos Falhando
O sistema utiliza uma **Muralha de Segurança** via API. Se o cliente não consegue finalizar o pedido:

### Verificar:
1. **Logs da Vercel (`/api/checkout`):** Procure por erros de "Produto não encontrado" ou "Erro de preço".
2. **Firestore Rules:** Verifique se as regras foram alteradas indevidamente (os pedidos DEVEM ser criados via API).
3. **Variáveis de Ambiente:** Confirme as taxas de entrega (`VITE_DELIVERY_BASE_FEE`, etc).

### Fallback Manual:
Se a API de Geocodificação falhar, o sistema aplicará a **Taxa Base de Entrega**. O atendente verá um alerta no WhatsApp: `[⚠️ API INDISPONÍVEL: Confirmar distância!]`.

---

## 4. Banco de Dados (Firestore)

### Coleções importantes:
| Coleção | Conteúdo |
|---------|----------|
| `produtos` | Catálogo de produtos (nome, categoria, precos por loja) |
| `pedidos` | Histórico de pedidos (Validados via API) |
| `admins` | Usuários com acesso ao painel |
| `fcmTokens` | Tokens para notificações push |

### Segurança de Gravação:
- A coleção `pedidos` está trancada para o público. 
- Somente a API Serverless (Admin SDK) pode gravar novos pedidos. 
- Se você tentar gravar um pedido manualmente pelo console do Firebase e falhar, é devido às `firestore.rules`.

---

## 5. Login Admin Não Funciona

### Verificar:
1. Firebase Console → **Authentication** → verificar se o UID do usuário existe.
2. Firebase Console → **Firestore** → coleção `admins` → o ID do documento DEVE ser o UID do Authentication.
3. O documento precisa ter: `email`, `role: "admin"`.

---

## 6. Variáveis de Ambiente — Muralha de Segurança

| Variável | Descrição |
|----------|-----------|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | JSON da conta de serviço (Essencial para o Checkout) |
| `VITE_DELIVERY_BASE_FEE` | Taxa mínima de entrega (Fallback) |
| `VITE_DELIVERY_MAX_RADIUS_KM` | Distância máxima atendida |
| `VITE_APP_URL` | URL oficial para proteção de CORS |

---

## 7. Contatos de Emergência

| Quem | Contato | Quando usar |
|------|---------|-------------|
| **Suporte Técnico** | [SEU CONTATO] | Erros de código ou API |
| **Vercel Status** | [vercel-status.com](https://www.vercel-status.com/) | Se o servidor cair |
| **Google Cloud Status** | [status.cloud.google.com](https://status.cloud.google.com/) | Se o Firebase falhar |

---

> ⚠️ **IMPORTANTE:** A Muralha de Segurança impede que preços sejam manipulados. Nunca desative as `firestore.rules` que bloqueiam o `create` na coleção `pedidos`.
