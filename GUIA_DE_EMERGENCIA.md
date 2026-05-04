# 🚨 Guia de Emergência — Procedimentos de Recuperação

> **Objetivo:** Permitir que qualquer pessoa com acesso resolva problemas básicos.
> Mantenha este documento atualizado e acessível.

---

## 1. Onde Está Cada Coisa

| Recurso | Onde acessar |
|---------|-------------|
| **Código-fonte** | GitHub (repositório privado do cliente) |
| **Deploy/Hosting** | [vercel.com/dashboard](https://vercel.com/dashboard) |
| **Banco de dados** | [console.firebase.google.com](https://console.firebase.google.com) → Firestore |
| **Autenticação** | Firebase Console → Authentication |
| **Pagamentos** | [mercadopago.com.br/developers/panel](https://www.mercadopago.com.br/developers/panel) |
| **Logs do servidor** | Vercel Dashboard → Functions → Logs |
| **Variáveis de ambiente** | Vercel → Settings → Environment Variables |
| **Monitoramento** | [uptimerobot.com](https://uptimerobot.com) (se configurado) |

---

## 2. O Site Caiu (Erro 500 ou Não Carrega)

### Diagnóstico rápido:
1. Acesse a URL da loja no navegador
2. Se mostrar erro 500: problema no servidor (Vercel)
3. Se não carregar: problema de DNS ou Vercel fora do ar

### Solução:
1. Acesse o **Vercel Dashboard** → seu projeto
2. Verifique **Deployments** — o último deploy está verde?
3. Se estiver vermelho: clique no deploy anterior (verde) e faça **Promote to Production**
4. Se todos estiverem verdes: verifique **Functions → Logs** para ver o erro
5. Se for erro de variável de ambiente: vá em **Settings → Environment Variables** e verifique se todas estão preenchidas

---

## 3. Pagamentos Não Estão Funcionando

### Sintomas:
- Pix não gera QR Code
- Cartão dá erro ao processar
- Pedidos não mudam de status

### Verificar:
1. **Vercel → Functions → Logs** — procure por erros em `/api/payment` e `/api/webhook`
2. **Variáveis de ambiente** — confirme que estão preenchidas:
   - `MP_ACCESS_TOKEN` (chave privada do MP)
   - `VITE_MP_PUBLIC_KEY` (chave pública do MP)
   - `MP_WEBHOOK_SECRET` (chave do webhook)
3. **Mercado Pago** → Painel → verifique se a aplicação está ativa
4. Se estiver em produção: as chaves devem ser de **PRODUÇÃO**, não TEST

### Se o webhook parou:
1. No Mercado Pago, vá em **Webhooks**
2. Verifique se a URL está correta: `https://SEU-DOMINIO/api/webhook`
3. Teste com o botão "Enviar notificação de teste"
4. Verifique nos logs da Vercel se chegou

---

## 4. Banco de Dados (Firestore)

### Acessar dados:
1. [console.firebase.google.com](https://console.firebase.google.com)
2. Selecione o projeto → **Firestore Database**

### Coleções importantes:
| Coleção | Conteúdo |
|---------|----------|
| `produtos` | Catálogo de produtos (nome, preço, imagem) |
| `pedidos` | Pedidos realizados (dados criptografados) |
| `admins` | Usuários admin do painel |

### Dados criptografados:
- Campos como `customerName`, `customerEmail`, `customerCpf` aparecem como `ENC:...`
- Isso é normal — são criptografados com AES-256 por LGPD
- No painel admin, clique em "Descriptografar" para visualizar

### Se precisar restaurar:
- Firestore tem backups automáticos (se Blaze com backup ativado)
- Exportar: Firebase Console → Firestore → Importar/Exportar

---

## 5. Login Admin Não Funciona

### Verificar:
1. Firebase Console → **Authentication** → verificar se o usuário existe
2. Firebase Console → **Firestore** → coleção `admins` → verificar se tem documento com o email
3. O documento precisa ter: `email`, `nome`, `role: "admin"`, `unidade`

### Resetar senha:
1. Firebase Console → Authentication → encontre o usuário → **Reset password**
2. Ou use o botão "Esqueci minha senha" na tela de login

### Criar novo admin:
1. Firebase Console → Authentication → **Add User** (email + senha)
2. Copie o **UID** gerado
3. Firestore → `admins` → **Add Document** (ID = UID copiado):
   ```json
   {
     "nome": "Novo Admin",
     "email": "admin@loja.com",
     "role": "admin",
     "unidade": "geral"
   }
   ```

---

## 6. Variáveis de Ambiente — Referência Completa

| Variável | Onde obter | Obrigatória |
|----------|-----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase Console → Configurações → Seus apps | ✅ |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Console → Configurações → Seus apps | ✅ |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Console → Configurações → Seus apps | ✅ |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Console → Configurações → Seus apps | ✅ |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Console → Configurações (número 9-12 dígitos) | ✅ |
| `VITE_FIREBASE_APP_ID` | Firebase Console → Configurações (formato 1:XXX:web:YYY) | ✅ |
| `VITE_FIREBASE_VAPID_KEY` | Firebase Console → Cloud Messaging → Web Push | ✅ |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase Console → Contas de serviço → JSON em 1 linha | ✅ |
| `APP_ENCRYPTION_KEY` | Gerar: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | ✅ |
| `MP_ACCESS_TOKEN` | Mercado Pago → Credenciais → Access Token | ✅ |
| `VITE_MP_PUBLIC_KEY` | Mercado Pago → Credenciais → Public Key | ✅ |
| `MP_WEBHOOK_SECRET` | Mercado Pago → Webhooks → Chave secreta | ✅ |
| `VITE_WHATSAPP_MATRIZ` | Número WhatsApp com código (5582...) | ✅ |
| `VITE_STORE_NAME` | Nome da loja | ✅ |
| `VITE_STORE_SHORT_NAME` | Nome curto da loja | ✅ |
| `VITE_MIN_ORDER_VALUE` | Valor mínimo do pedido em reais | Opcional (default: 30) |

---

## 7. Contatos de Emergência

| Quem | Contato | Quando usar |
|------|---------|-------------|
| **Desenvolvedor** | [SEU WHATSAPP] | Problemas técnicos |
| **Mercado Pago Suporte** | 0800 637 7246 | Problemas com pagamentos |
| **Firebase Suporte** | [firebase.google.com/support](https://firebase.google.com/support) | Problemas com banco de dados |
| **Vercel Status** | [vercel-status.com](https://www.vercel-status.com/) | Verificar se a Vercel está fora do ar |

---

> ⚠️ **IMPORTANTE:** Nunca compartilhe senhas ou chaves por WhatsApp ou email. Use sempre o painel da Vercel para gerenciar variáveis de ambiente.
