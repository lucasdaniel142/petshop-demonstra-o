# 🚀 Guia de Scripts de Deploy e Monitoramento

Este guia explica como usar os scripts de validação e monitoramento criados para garantir um deploy seguro e monitorar a saúde do sistema em produção.

---

## 📋 Scripts Disponíveis

### 1. **Validação de Variáveis de Ambiente**

Valida se todas as variáveis de ambiente necessárias estão configuradas corretamente.

#### Uso Local (valida .env.local ou .env)
```bash
npm run validate:env
```

#### Uso com Vercel (valida variáveis no Vercel)
```bash
npm run validate:env:vercel
```

**Pré-requisito para Vercel:** Instale e autentique o Vercel CLI:
```bash
npm i -g vercel
vercel login
```

#### O que o script valida:

✅ **Variáveis Obrigatórias:**
- Firebase Client SDK (VITE_FIREBASE_*)
- Firebase Admin (FIREBASE_SERVICE_ACCOUNT_KEY)
- WhatsApp por loja (VITE_WHATSAPP_*)
- Chave de criptografia (APP_ENCRYPTION_KEY)
- ImgBB API Key (VITE_IMGBB_API_KEY)

⚠️ **Variáveis Opcionais:**
- Mercado Pago (MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET)
- Configurações de frete (VITE_DELIVERY_*)
- URL do app (VITE_APP_URL)

#### Validações Específicas:

- **FIREBASE_SERVICE_ACCOUNT_KEY:** Valida se é um JSON válido com campos obrigatórios
- **APP_ENCRYPTION_KEY:** Valida se é hexadecimal de 64 caracteres (32 bytes)
- **WhatsApp:** Valida formato brasileiro (55 + DDD + número)
- **URLs:** Valida se começam com http:// ou https://

#### Exemplo de Saída:

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   🔍 VALIDADOR DE VARIÁVEIS DE AMBIENTE                                  ║
║   Sistema E-commerce Sagrada Família                                     ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

================================================================================
  Validando Variáveis de Ambiente (Local)
================================================================================

📋 VARIÁVEIS OBRIGATÓRIAS:

  FRONTEND:
    ✅ VITE_FIREBASE_API_KEY: AIzaSyD8uwYVG34wf5m0BlbFOf6_Dmdlh0lqGs4
    ✅ VITE_FIREBASE_AUTH_DOMAIN: sagrada-familia-a334e.firebaseapp.com
    ✅ VITE_WHATSAPP_BENEDITO_BENTES: 5582999776895
    ...

  BACKEND:
    ✅ FIREBASE_SERVICE_ACCOUNT_KEY: {"type":"service_account","project_id...
    ✅ APP_ENCRYPTION_KEY: a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0...

📋 VARIÁVEIS OPCIONAIS:
    ⚪ MP_ACCESS_TOKEN: não configurada (opcional)
    ✅ VITE_DELIVERY_BASE_FEE: 5.00
    ...

================================================================================
  RESUMO DA VALIDAÇÃO
================================================================================

  Total de variáveis obrigatórias: 13
  Total de variáveis opcionais: 10
  Variáveis ausentes: 0
  Erros encontrados: 0
  Avisos: 0

✅ VALIDAÇÃO PASSOU! Todas as variáveis estão configuradas corretamente.
```

---

### 2. **Monitoramento Pós-Deploy**

Monitora a saúde do sistema em produção, testando endpoints críticos e coletando métricas.

#### Uso Básico (execução única)
```bash
npm run monitor
```

#### Uso com URL Customizada
```bash
node scripts/monitor-deploy.mjs --url https://seu-dominio.vercel.app
```

#### Modo Contínuo (monitora a cada 30 segundos)
```bash
npm run monitor:continuous
```

#### O que o script monitora:

🌐 **Endpoints Críticos:**
- Homepage (/)
- Admin Login (/admin)

🔌 **APIs:**
- Checkout API (/api/checkout)
- Notify API (/api/notify)

🔥 **Firebase:**
- Detecta se Firebase SDK está carregado
- Verifica conexão com Firestore

📱 **PWA:**
- Verifica manifest.json
- Verifica Service Worker (sw.js)

📦 **Assets:**
- Mede tamanho do bundle principal
- Alerta se bundle > 1MB

🔒 **Segurança:**
- Verifica headers de segurança (HSTS, CSP, etc.)
- Recomenda melhorias

#### Exemplo de Saída:

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   📊 MONITOR DE DEPLOY                                                   ║
║   Sistema E-commerce Sagrada Família                                     ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

🌐 URL Base: https://sagrada-familia-a334e.vercel.app
⏰ Iniciando monitoramento...

================================================================================
  Testando Endpoints Críticos
================================================================================

  ✅ Homepage
     URL: https://sagrada-familia-a334e.vercel.app/
     Status: 200
     Tempo de resposta: 342ms
     Content-Type: text/html; charset=utf-8
     Vercel ID: sfo1::abc123

  ✅ Admin Login
     URL: https://sagrada-familia-a334e.vercel.app/admin
     Status: 200
     Tempo de resposta: 289ms

================================================================================
  Testando APIs
================================================================================

  ✅ Checkout API
     URL: https://sagrada-familia-a334e.vercel.app/api/checkout
     Status: 200
     Tempo de resposta: 156ms

================================================================================
  Testando Conexão com Firebase
================================================================================

  ✅ Firebase SDK detectado no frontend

================================================================================
  Testando PWA (Progressive Web App)
================================================================================

  ✅ manifest.json acessível
     Nome: Supermercado Sagrada Família
     Ícones: 4 configurados
  ✅ Service Worker (sw.js) acessível

================================================================================
  Verificando Tamanho dos Assets
================================================================================

  📦 Arquivos JavaScript: 3
  📦 Arquivos CSS: 1
  📊 Bundle principal: 303.03 KB

================================================================================
  Verificando Headers de Segurança
================================================================================

  ✅ x-frame-options: Proteção contra clickjacking
  ✅ x-content-type-options: Proteção contra MIME sniffing
  ✅ strict-transport-security: HTTPS forçado (HSTS)
  ⚪ content-security-policy: não configurado
  ⚪ x-xss-protection: não configurado

  ✅ 3/5 headers de segurança configurados

================================================================================
  RELATÓRIO DE SAÚDE DO SISTEMA
================================================================================

  📊 Total de testes: 8
  ✅ Sucessos: 8
  ❌ Falhas: 0
  ⏱️  Tempo médio de resposta: 245ms

✅ SISTEMA SAUDÁVEL! Todos os testes passaram.

💡 RECOMENDAÇÕES:
   • Monitore métricas no Vercel Analytics
   • Configure alertas para erros críticos
```

---

### 3. **Script Pré-Deploy (Automático)**

Executa automaticamente antes de qualquer deploy:

```bash
npm run predeploy
```

Este script executa em sequência:
1. ✅ Type checking (npm run lint)
2. ✅ Testes unitários (npm run test)
3. ✅ Validação de variáveis de ambiente (npm run validate:env)

Se qualquer etapa falhar, o deploy é bloqueado.

---

## 🎯 Fluxo Recomendado de Deploy

### 1️⃣ **Antes do Deploy**

```bash
# 1. Valide variáveis localmente
npm run validate:env

# 2. Execute testes e type checking
npm run predeploy

# 3. Faça build local para testar
npm run build

# 4. (Opcional) Teste o build localmente
npm run preview
```

### 2️⃣ **Deploy em Preview**

```bash
# Crie uma branch de deploy
git checkout -b deploy/v1.0.0

# Commit suas mudanças
git add .
git commit -m "chore: preparação para deploy v1.0.0"

# Push para criar Preview Deploy no Vercel
git push origin deploy/v1.0.0
```

### 3️⃣ **Validação no Vercel**

```bash
# Valide variáveis no Vercel
npm run validate:env:vercel

# Aguarde o Preview Deploy terminar
# URL será exibida no terminal ou no GitHub
```

### 4️⃣ **Monitoramento do Preview**

```bash
# Monitore o Preview Deploy
node scripts/monitor-deploy.mjs --url https://seu-preview-url.vercel.app

# Teste manualmente:
# - Fazer um pedido completo
# - Atualizar status no admin
# - Verificar notificações
# - Testar em mobile
```

### 5️⃣ **Deploy em Produção**

```bash
# Se tudo OK, merge para main
git checkout main
git merge deploy/v1.0.0
git push origin main

# Vercel faz deploy automático em produção
```

### 6️⃣ **Monitoramento Pós-Deploy**

```bash
# Monitore produção imediatamente após deploy
npm run monitor

# Ou monitore continuamente nas primeiras horas
npm run monitor:continuous

# Pressione Ctrl+C para parar
```

---

## 🚨 Troubleshooting

### Erro: "FIREBASE_SERVICE_ACCOUNT_KEY inválida"

**Causa:** JSON da Service Account está malformado ou incompleto.

**Solução:**
1. Acesse Firebase Console → Configurações → Contas de serviço
2. Clique em "Gerar nova chave privada"
3. Copie o conteúdo do arquivo JSON **em uma única linha**
4. Cole no Vercel ou .env.local

**Exemplo correto:**
```bash
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key":"..."}
```

---

### Erro: "APP_ENCRYPTION_KEY inválida"

**Causa:** Chave não tem 64 caracteres hexadecimais.

**Solução:**
```bash
# Gere uma nova chave
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copie o resultado (64 caracteres) para .env.local ou Vercel
```

---

### Erro: "Vercel CLI não encontrado"

**Causa:** Vercel CLI não está instalado.

**Solução:**
```bash
npm i -g vercel
vercel login
```

---

### Monitor retorna "Request timeout"

**Causa:** Servidor está lento ou não responde.

**Solução:**
1. Verifique logs do Vercel: https://vercel.com/dashboard
2. Verifique Firebase Console: https://console.firebase.google.com
3. Teste manualmente a URL no navegador
4. Verifique se há cold start (primeira requisição após inatividade)

---

### Monitor retorna "404 Not Found"

**Causa:** Endpoint não existe ou URL está incorreta.

**Solução:**
1. Verifique se a URL base está correta
2. Verifique se o deploy foi concluído com sucesso
3. Teste a URL manualmente no navegador

---

## 📊 Métricas Importantes

### Tempo de Resposta
- ✅ **< 1000ms:** Excelente
- ⚠️ **1000-3000ms:** Aceitável
- ❌ **> 3000ms:** Lento (investigue)

### Bundle Size
- ✅ **< 500 KB:** Excelente
- ⚠️ **500-1000 KB:** Aceitável
- ❌ **> 1000 KB:** Grande (considere code splitting)

### Headers de Segurança
- ✅ **≥ 3/5:** Aceitável
- ⚠️ **< 3/5:** Melhorias recomendadas

---

## 🔗 Links Úteis

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Firebase Console:** https://console.firebase.google.com
- **Vercel CLI Docs:** https://vercel.com/docs/cli
- **Firebase Admin SDK:** https://firebase.google.com/docs/admin/setup

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do Vercel
2. Verifique o Firebase Console
3. Execute os scripts de validação e monitoramento
4. Consulte este guia para troubleshooting

---

**Última atualização:** 26/05/2026  
**Versão:** 1.0.0
