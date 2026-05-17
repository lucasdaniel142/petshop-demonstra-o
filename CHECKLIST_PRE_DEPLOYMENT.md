# ✅ Checklist Pré-Deployment — E-commerce White Label

Antes de fazer deploy para qualquer cliente, execute este checklist **obrigatoriamente**. Cada item não verificado resulta em experiência degradada do usuário ou falha de segurança.

---

## 🔧 CONFIGURAÇÃO DO MANIFEST.JSON

**Arquivo**: `public/manifest.json`

Cada cliente precisa ter seu próprio manifest. **Não deixe "Sagrada Família" no manifest de outro supermercado.**

### Obrigatório

- [ ] **`name`**: Nome completo do supermercado (ex: "Supermercado Vida Boa")
- [ ] **`short_name`**: Nome curto para exibir na tela inicial (max 12 caracteres, ex: "Vida Boa")
- [ ] **`description`**: Descrição da loja (ex: "Compre online e receba em casa")
- [ ] **`theme_color`**: Cor primária da marca (ex: `#004b22` para verde)

### Ícones PWA

- [ ] **Ícones com `"purpose": "maskable"`**: Necessário para Android. Use pelo menos as versões 192×192 e 512×512 com versões "-maskable"
- [ ] **Ícones sem bordas brancas**: Os ícones maskable devem ter o logo centralizado em fundo sólido. Teste em [maskable.app](https://maskable.app)

### Screenshots

- [ ] **`screenshots`**: Adicione screenshots do catálogo de produtos (não obrigatório, mas melhora a taxa de instalação)

---

## 🎨 ÍCONES E BRANDING

**Diretório**: `public/icons/`

Crie os seguintes arquivos PNG para cada cliente:

| Arquivo | Dimensão | Descrição |
|---------|----------|-----------|
| `icon-192.png` | 192×192 | Ícone com fundo branco/qualquer fundo |
| `icon-192-maskable.png` | 192×192 | Ícone centralizado em fundo sólido para Android (sem borda branca) |
| `icon-512.png` | 512×512 | Ícone HD com fundo branco |
| `icon-512-maskable.png` | 512×512 | Ícone HD para Android |
| `screenshot-narrow.png` | 540×720 | Screenshot do app em modo retrato |
| `screenshot-wide.png` | 1280×720 | Screenshot do app em modo paisagem |

**Teste**: Instale o PWA em um Android e iOS para verificar se os ícones aparecem corretamente.

---

## 🔐 VARIÁVEIS DE AMBIENTE (`.env.local`)

Preencha todas as variáveis Firebase:

```env
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
```

---

## 🛡️ CONFIGURAÇÃO FIREBASE (Console)

### Firestore Rules

- [ ] Deploy `firestore.rules` com regras atualizadas (veja [firestore.rules](./firestore.rules))
- [ ] Verif que `allow create: if false` está na coleção `pedidos` para bloquear escrita do cliente

### Authentication

- [ ] Ative **Anonymous Authentication** para permitir que clientes registrem tokens FCM
  - Firebase Console → Authentication → Sign-in method → ativar "Anonymous"

### FCM Token Collection

- [ ] Coleção `fcmTokens` deve estar criada e com regras:
  ```
  allow write: if request.auth != null;
  allow read: if request.auth.uid == resource.id;
  ```

---

## 🌐 CONFIGURAÇÃO VERCEL

### Serverless Functions (`api/`)

- [ ] Deploy `.env.production` com configurações do Firebase Admin:
  ```
  VITE_DELIVERY_BASE_FEE=5.00
  VITE_DELIVERY_BASE_RADIUS_KM=3
  VITE_DELIVERY_PER_KM_FEE=1.50
  VITE_DELIVERY_MAX_RADIUS_KM=15
  ```

### Rate Limiting (Firewall)

- [ ] Ativar Vercel Firewall:
  - Vercel Dashboard → Settings → Security
  - Adicionar regra: bloquear >50 requisições por IP em 1 minuto para `/api/checkout`

### Domain & SSL

- [ ] Domínio configurado e SSL ativo
- [ ] CDN cacheando assets estáticos com `Cache-Control: max-age=31536000`

---

## 📱 PWA: Instalação

- [ ] Testar instalação em pelo menos 2 devices (1 Android, 1 iOS)
- [ ] Verificar que nome correto aparece na tela inicial
- [ ] Verificar que ícone appears sem bordas brancas
- [ ] Testar offlinemode: desativar internet e verificar que app mostra página offline amigável

---

## 🧪 TESTES PRÉ-DEPLOYMENT

### Segurança

- [ ] Fazer checkout completo: preços calculados corretamente no servidor?
- [ ] Verificar que preço exibido == preço calculado no pedido (não NaN)
- [ ] Tentar enviar CEP fora da zona de entrega: retorna erro?
- [ ] Tentar injetar script no campo de observação: é sanitizado?

### Performance

- [ ] Abrir catálogo: LCP < 2.5s em 3G?
- [ ] Scroll na Home: sem travamentos, 60 FPS?
- [ ] Adicionar 10+ itens ao carrinho: sem lag ao abrir drawer?

### UX

- [ ] Campos de entrada têm autofill correto (nome, CEP, endereço, telefone)?
- [ ] Em iOS: teclado numérico aparece para CEP e telefone?
- [ ] Botão "Finalizar Pedido": não pode ser clicado 2x (double-submit)?
- [ ] Mensagem de erro é clara quando produto está esgotado?

---

## 📊 MONITORAMENTO PÓS-DEPLOY

Depois do launch, monitar por 24h:

- [ ] Firebase Firestore: sem erros de write na coleção `pedidos`
- [ ] Vercel: sem 5xx errors em `/api/checkout`
- [ ] Google Analytics: taxa de bounce, tempo de permanência, conversões
- [ ] Firebase Crashlytics: sem crashes no app

---

## 🔄 ROLLBACK PLAN

Se algo der errado:

1. **Revert branch**: `git revert <commit>` ou redeploy versão anterior
2. **Limpar cache**: Vercel → Deployments → "Clear Cache"
3. **Notificar clientes**: Email + WhatsApp com status

---

## 📞 Contatos

| Papel | Responsável | Contato |
|-------|-------------|---------|
| DevOps / Vercel | [Seu nome] | [Email] |
| Firebase Admin | [Seu nome] | [Email] |
| QA / Teste | [Seu nome] | [Email] |

---

**Última atualização**: 16 de maio de 2026  
**Versão**: 1.0 — Final

---

## 🎬 ROTEIRO DE DEMONSTRAÇÃO (SAÍDA DE CAMPO)

Use este roteiro para a apresentação com a Débora — siga na ordem e teste rapidamente cada item.

1) Massa de Dados Realista
- [ ] Importar `scripts/seed_products.json` para Firestore (veja `scripts/import_products.mjs`).
- [ ] Substituir as `imageUrl` por imagens reais de marcas locais (opcional, mas recomendado).
- [ ] Verificar no Admin → Produtos se existem 20–30 itens divididos por categoria.

2) Preparar o "Teatro" da Demo
- [ ] Aba 1 (Mobile): abrir o site em modo responsivo (Chrome DevTools → Toggle device toolbar) ou em um celular físico.
- [ ] Aba 2 (Admin): abrir `ProductManager` / `OrderManager` em outro monitor/aba para ver os pedidos chegando em tempo real.
- [ ] WhatsApp: configure variáveis `VITE_WHATSAPP_*` no `.env.local` ou no ambiente Vercel para apontar um número seu.

3) Teste de Resiliência (impacto visual)
- [ ] Durante a compra, ative o Offline (DevTools → Network → Offline) e tente navegar.
- [ ] Verificar que `offline.html` aparece e o app volta ao normal ao reconectar.

4) Checklist técnico rápido antes da demo
- [ ] Ativar Anonymous Auth em Firebase Console → Authentication → Sign-in method.
- [ ] Garantir que `FIREBASE_SERVICE_ACCOUNT_KEY` (para scripts/import) esteja disponível localmente se for importar dados.
- [ ] Fazer o push e confirmar deploy na Vercel (status Ready). Testar o link no celular.
- [ ] Testar envio de pedido e observar o `OrderManager` receber o novo pedido imediatamente.

5) Execução do fluxo de demo (roteiro curto)
- [ ] Entrar como cliente, procurar categoria "Hortifruti" e adicionar 2 itens ao carrinho.
- [ ] Abrir o carrinho, verificar preços revalidados, preencher nome e CEP (mostrar teclado numérico).
- [ ] Finalizar pedido; mostrar o pedido aparecendo no painel Admin.
- [ ] Abrir WhatsApp (ou simular) e mostrar a mensagem formatada chegando.

---

Se quiser, eu executo a importação localmente (preciso que você exporte `FIREBASE_SERVICE_ACCOUNT_KEY` como variável de ambiente no terminal). Deseja que eu execute agora o script `scripts/import_products.mjs` com a sua chave local?
