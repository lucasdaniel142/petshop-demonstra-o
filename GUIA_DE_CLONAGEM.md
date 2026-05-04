# 🚀 Guia de Clonagem — White Label E-commerce

> **Versão:** 3.0 (Enterprise Ready)  
> **Última atualização:** 02/05/2026  
> **Tempo estimado de setup:** 45–90 minutos por cliente

Este é seu manual operacional. Toda vez que vender o sistema para um novo cliente, siga este checklist para subir a loja dele em tempo recorde e sem erros.

---

## 1. Preparação das Contas do Cliente

Para entregar o modelo "Business in a Box", crie contas isoladas:

- [ ] Crie um **Gmail** específico (ex: `tecnologia.sagradafamilia@gmail.com`)
- [ ] Crie uma conta no **GitHub** e um **repositório privado** com este Gmail
- [ ] Crie uma conta na **Vercel** usando este Gmail (login com GitHub)
- [ ] Crie um projeto no **Firebase** usando este Gmail
- [ ] Crie uma conta/app no **Mercado Pago** usando este Gmail
- [ ] Crie uma conta no **ImgBB** (para upload de imagens de produtos)

> [!IMPORTANT]
> **Anote todas as senhas** em um documento seguro. Você entregará essas credenciais ao cliente junto com o sistema.

---

## 2. Configuração do Firebase

No Firebase Console do cliente:

- [ ] Ative o **Authentication** → método **Email/Password**
- [ ] Ative o **Firestore Database** (modo production)
- [ ] Copie as regras do arquivo `firestore.rules` do repositório e cole em **Firestore → Regras**
- [ ] Crie o **primeiro admin** manualmente no Firestore:
  ```
  Coleção: admins
  Documento ID: (será gerado pelo Firebase Auth)
  Campos:
    - nome: "Admin"
    - email: "admin@loja.com"
    - role: "admin"
    - unidade: "geral"
  ```
- [ ] Crie o usuário correspondente no **Authentication** com o mesmo email

### 2.1 — Configurar Firebase Admin SDK e Firebase Cloud Messaging

Para que o servidor (`/api/*`) possa acessar o banco e enviar Pushes:

1. No Firebase Console, vá em **Configurações do Projeto → Contas de serviço**
2. Selecione **Node.js** e clique em **Gerar nova chave privada**
3. Abra o `.json` baixado. Você precisará do conteúdo inteiro dele. Cole em `FIREBASE_SERVICE_ACCOUNT_KEY` (em uma linha só).
4. Para as notificações PUSH, vá na aba **Cloud Messaging**, desça até "Certificados Web Push", gere um par de chaves e copie a **chave pública**. Essa será a sua `VITE_FIREBASE_VAPID_KEY`.
5. Vá em **Configurações → Seus apps → Web** e copie as chaves do SDK.

### 2.2 — Gerar chave de criptografia (LGPD)

Para proteger dados sensíveis, gere uma chave de 32 bytes rodando no terminal:
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
O resultado será sua `APP_ENCRYPTION_KEY`.

> [!WARNING]
> **NUNCA** coloque o arquivo `serviceAccountKey.json` ou chaves privadas no repositório. Use **apenas** variáveis de ambiente na Vercel.

---

## 3. Configuração do Mercado Pago (Checkout Bricks)

O sistema utiliza o **Checkout Bricks**, a solução mais moderna e modular do Mercado Pago.

- [ ] Acesse o [Painel de Desenvolvedores](https://www.mercadopago.com.br/developers/panel/app) e crie uma **Aplicação** (ex: `Delivery - Nome da Loja`).
- [ ] Em **Suas integrações** → Selecione a aplicação → **Credenciais de produção**:
  - Copie a `Public Key` para `VITE_MP_PUBLIC_KEY`.
  - Copie o `Access Token` para `MP_ACCESS_TOKEN`.
- [ ] **Configurar Webhook:**
  - Em **Webhooks**, adicione a URL: `https://seu-dominio.vercel.app/api/webhook`.
  - Marque o evento: **`payments`**.
  - Copie o **Secret ID** para `MP_WEBHOOK_SECRET`.
- [ ] **Configurar Chave Pix:** No painel do MP do cliente, certifique-se de que há uma chave Pix cadastrada para aceitar pagamentos instantâneos.

> [!TIP]
> O Checkout Bricks exige que o site rode em **HTTPS**. Em ambiente local (localhost), o SDK funciona para testes, mas em produção o certificado SSL é obrigatório (a Vercel fornece isso automaticamente).

---

## 4. Personalização do Código

Clone o repositório "Mãe" e edite **apenas** os arquivos dentro de `src/config/`:

### 4.1 — Identidade Visual (`src/index.css`)

Altere as cores da paleta para as cores da logomarca do cliente:

```css
@theme {
  --color-primary: #1B5E20;       /* Cor principal da logomarca */
  --color-primary-dark: #0D3B0E;  /* Versão mais escura (hover) */
  --color-accent: #2E7D32;        /* Cor de destaque/secundária */
  --color-accent-dark: #1B5E20;   /* Hover do accent */
  --color-secondary: #388E3C;     /* Textos secundários */
}
```

### 4.2 — Nome da Marca (`src/config/brand.ts`)

Já é lido das variáveis de ambiente. Não precisa editar o arquivo, apenas o `.env.local`.

### 4.3 — Lojas e WhatsApp (`src/config/stores.ts`)

Por padrão, o sistema vem configurado com uma única loja de ID `matriz`.
Se o cliente tiver apenas uma loja, **você não precisa editar o código**, basta preencher a variável `VITE_WHATSAPP_MATRIZ` no `.env.local` e alterar o Label em `src/config/stores.ts` se quiser.

Se o cliente tiver **múltiplas lojas**, altere o ID, label e WhatsApp da loja do cliente:

```typescript
// Altere o StoreId no types/index.ts TAMBÉM:
// export type StoreId = 'matriz' | 'filial_1';

export const STORE_IDS: StoreId[] = ['matriz', 'filial_1'];

export const STORES: ReadonlyArray<StoreOption> = [
  { id: 'matriz', label: 'Matriz' },
  { id: 'filial_1', label: 'Filial Centro' },
] as const;

export const ADMIN_STORES = [
  { id: 'matriz', label: 'Matriz' },
  { id: 'filial_1', label: 'Filial Centro' },
];

export const ADMIN_UNIDADES = [
  { id: 'geral', name: 'Administrativo Geral' },
  { id: 'sagrada_familia', name: 'Sagrada Família' },
];

// WhatsApp — a env var precisa mudar de nome também:
export const STORE_WHATSAPP_NUMBERS: Record<StoreId, string> = {
  sagrada_familia: getWhatsAppNumber('VITE_WHATSAPP_SAGRADA_FAMILIA', 'Sagrada Família'),
};
```

### 4.4 — Tipo StoreId (`src/types/index.ts`)

Altere o literal type para o novo ID:

```typescript
export type StoreId = 'sagrada_familia';
```

### 4.5 — Categorias (`src/config/categories.ts`)

Se o cliente tem categorias diferentes, edite aqui. Se não, **não precisa alterar**.

### 4.6 — Logomarcas

- [ ] Substitua `public/logo.png` pela logo do cliente
- [ ] Substitua `public/favicon.ico` pelo ícone do cliente
- [ ] Atualize o `<title>` em `index.html`

---

## 5. Configuração do `.env.local`

Duplique `.env.example` → `.env.local` e preencha **todos** os campos:

```bash
# === FIREBASE CLIENT ===
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=sagrada-familia.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sagrada-familia-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=sagrada-familia-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# === FIREBASE ADMIN (SERVER-SIDE) ===
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key":"..."}

# === FIREBASE CLOUD MESSAGING (PUSH) ===
VITE_FIREBASE_VAPID_KEY=xxxxxxxx

# === SEGURANÇA (CRIPTOGRAFIA DE DADOS LGPD) ===
APP_ENCRYPTION_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# === WHATSAPP ===
VITE_WHATSAPP_SAGRADA_FAMILIA=5582912345678

# === IMGBB ===
VITE_IMGBB_API_KEY=xxxxxxxx

# === ENTREGA ===
VITE_STORE_LAT=-9.6498
VITE_STORE_LNG=-35.7089
VITE_DELIVERY_BASE_FEE=5.00
VITE_DELIVERY_BASE_RADIUS_KM=3
VITE_DELIVERY_PER_KM_FEE=1.50
VITE_DELIVERY_MAX_RADIUS_KM=15

# === IDENTIDADE ===
VITE_STORE_NAME=Supermercado Sagrada Família
VITE_STORE_SHORT_NAME=Sagrada Família
VITE_STORE_WHATSAPP_GREETING=Olá! Obrigado por escolher o Sagrada Família 🙏

# === HORÁRIO DE FUNCIONAMENTO ===
VITE_STORE_OPEN_HOUR=07:00
VITE_STORE_CLOSE_HOUR=22:00

# === MERCADO PAGO ===
MP_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxx
VITE_MP_PUBLIC_KEY=APP_USR-xxxxxxxxxxxx
MP_WEBHOOK_SECRET=xxxxxxxx
VITE_MIN_ORDER_VALUE=30.00
```

> [!WARNING]
> **NUNCA** envie o `.env.local` pelo WhatsApp ou email. Configure as variáveis **diretamente** no painel da Vercel (Settings → Environment Variables).

---

## 6. Deploy na Vercel

1. Faça push do código personalizado para o GitHub do cliente
2. Na Vercel, importe o repositório do GitHub
3. Em **Settings → Environment Variables**, cole **todas** as variáveis do `.env.local`
4. Em **Settings → Domains**, configure o domínio personalizado (se houver)
5. Clique em **Deploy**
6. Após o deploy, **atualize a URL do webhook** no Mercado Pago:
   - `https://dominio-real.vercel.app/api/webhook`

---

## 7. Testes Pós-Deploy

Antes de entregar ao cliente, valide:

- [ ] **Vitrine:** Produtos aparecem corretamente?
- [ ] **Carrinho:** Adicionar/remover itens funciona?
- [ ] **Frete:** CEP calcula a taxa corretamente?
- [ ] **Checkout Bricks (Pix/Cartão):** QR Code é gerado e o formulário de cartão aparece corretamente?
- [ ] **Wallet Brick (Pagamento Rápido):** O botão azul "Mercado Pago" aparece e abre o popup de login?
- [ ] **Status Screen:** Após o pagamento, a tela de confirmação oficial do MP aparece no modal?
- [ ] **Webhook:** O status do pedido muda no Firestore após o pagamento (de `processing` para `approved`)?
- [ ] **Horário:** Bloqueia checkout fora do horário configurado?
- [ ] **WhatsApp:** Link abre com mensagem formatada?
- [ ] **Admin Login:** Consegue logar com o admin criado?
- [ ] **Admin Pedidos:** Tela de pedidos carrega? (mesmo vazia)
- [ ] **Admin Preços:** Consegue alterar preço de um produto?
- [ ] **Admin Preços (Push):** Consegue disparar uma notificação Push (Testar no celular)?
- [ ] **Admin Produtos:** Consegue adicionar um produto novo?
- [ ] **Criptografia PII:** Os dados de clientes no banco aparecem como ENC:... e o botão "Descriptografar" do painel revela os dados?
- [ ] **LGPD Compliance:** A página `/privacidade` carrega e o checkbox de consentimento bloqueia o checkout se desmarcado?
- [ ] **Checklist Final:** Execute o arquivo `CHECKLIST_POS_DEPLOY.md` completo.

---

## 8. Entrega ao Cliente

- [ ] Gere um `.zip` do projeto (**excluindo** `node_modules/`, `.env.local`, `.git/`)
- [ ] Crie um PDF com:
  - Credenciais (Gmail, GitHub, Vercel, Firebase, Mercado Pago)
  - URL do sistema (ex: `https://sagrada-familia.vercel.app`)
  - URL do painel admin (ex: `https://sagrada-familia.vercel.app/admin`)
  - Login e senha do admin
  - Número do WhatsApp configurado
  - Horário de funcionamento configurado
- [ ] Agende uma **sessão de treinamento** (30-60 min) mostrando:
  - Como gerenciar preços e estoque
  - Como gerenciar produtos (adicionar, editar, importar CSV)
  - Como acompanhar pedidos (tela de pedidos + notificação sonora)
  - Como imprimir pedidos
+- [ ] Entregue o acesso ao **GUIA_DE_EMERGENCIA.md** para a equipe técnica do cliente.

---

## Checklist Rápido (Copie para cada cliente)

```
CLIENTE: _________________
DATA: ____/____/____

[ ] Mercado Pago criado (conta digital) e chaves Production copiadas
[ ] Firebase criado (Firestore e Auth habilitados)
[ ] Firebase: Cloud Messaging ativado e Chave VAPID copiada
[ ] Arquivo `.env.local` configurado (incluindo VAPID e chave AES-256 gerada)
[ ] GitHub criado e repositório subido
[ ] Deploy na Vercel realizado e `.env` configurado lá
[ ] URL de Webhook atualizada no MP
[ ] Script de admin rodado
[ ] Personalização visual feita (ícones, cores, textos, `.env`)
[ ] Testes Pós-Deploy aprovados
[ ] Entrega final realizada (.zip + doc + treinamento)
```
