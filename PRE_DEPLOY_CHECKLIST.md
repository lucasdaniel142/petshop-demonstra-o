# ✅ Checklist Pré-Deploy - Sistema E-commerce Sagrada Família

**Data da última auditoria:** 26/05/2026  
**Status do Build:** ✅ Compilando sem erros  
**Testes Unitários:** ✅ 19/19 passando

---

## 🔒 SEGURANÇA (CRÍTICO)

### Variáveis de Ambiente
- [ ] **FIREBASE_SERVICE_ACCOUNT_KEY** configurada no Vercel (Secrets)
- [ ] **MP_ACCESS_TOKEN** configurada no Vercel (Secrets) - NUNCA com prefixo VITE_
- [ ] **MP_WEBHOOK_SECRET** configurada no Vercel (Secrets)
- [ ] **APP_ENCRYPTION_KEY** configurada no Vercel (32 bytes hex)
- [ ] Verificar que `.env.local` está no `.gitignore`
- [ ] Confirmar que nenhum secret está commitado no repositório
- [ ] **Executar validação:** `npm run validate:env:vercel`

### Firebase
- [x] Regras de segurança do Firestore revisadas e testadas
- [x] Regras de segurança do Storage revisadas (se aplicável)
- [x] Authentication configurado (Anonymous + Email/Password)
- [x] Índice composto criado: `fcmTokens` (phone ASC, updatedAt DESC)
- [ ] Coleção `admins` populada com pelo menos 1 admin

### APIs
- [x] CORS configurado corretamente em `/api/notify.ts` e `/api/notify-offers.ts`
- [x] Rate limiting de notificações testado (6 horas entre envios)
- [ ] Webhook do Mercado Pago configurado (se aplicável)

---

## 🚀 PERFORMANCE

### Build
- [x] Build de produção compila sem erros
- [x] Bundle size aceitável (< 1MB gzipped)
- [x] Code splitting funcionando (lazy loading de rotas admin)
- [x] PWA configurado e funcionando

### Cache
- [x] Cache de produtos implementado no backend (5 min TTL)
- [ ] Service Worker registrado e funcionando
- [ ] Imagens otimizadas (WebP quando possível)

### Firebase
- [x] Listeners do Firestore com cleanup correto
- [x] Queries otimizadas (sem N+1)
- [x] Índices criados para queries frequentes

---

## 🧪 TESTES FUNCIONAIS

### Fluxo do Cliente
- [ ] **Vitrine:** Produtos carregam corretamente
- [ ] **Busca:** Filtros e busca funcionam
- [ ] **Carrinho:** Adicionar/remover itens funciona
- [ ] **CEP:** Busca de endereço e cálculo de frete funcionam
- [ ] **Checkout:** Pedido é salvo no Firestore
- [ ] **WhatsApp:** Link abre corretamente com dados do pedido
- [ ] **Notificações:** Soft prompt aparece no momento certo

### Fluxo do Admin
- [ ] **Login:** Autenticação funciona
- [ ] **Pedidos:** Lista carrega e atualização de status funciona
- [ ] **Notificações:** Push enviado quando status muda
- [ ] **Produtos:** CRUD completo funciona
- [ ] **Preços:** Edição por loja funciona
- [ ] **Equipe:** Cadastro de novos admins funciona
- [ ] **Configurações:** Alteração de frete grátis funciona

### Casos Extremos
- [ ] **Offline:** App funciona offline (PWA)
- [ ] **Rede lenta:** Retry com backoff funciona no AuthContext
- [ ] **Token expirado:** FCM token é limpo do localStorage
- [ ] **Pedido duplicado:** Race condition corrigida (setIsSubmitting antes de await)
- [ ] **Frete grátis:** Regra de R$ 100 funciona corretamente

---

## 📱 COMPATIBILIDADE

### Navegadores
- [ ] Chrome/Edge (desktop e mobile)
- [ ] Firefox (desktop e mobile)
- [ ] Safari (desktop e mobile)
- [ ] Samsung Internet

### Dispositivos
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

---

## 📊 MONITORAMENTO

### Logs
- [x] Logger implementado (console limpo em produção)
- [ ] Sentry ou similar configurado (opcional)
- [ ] Firebase Analytics configurado (opcional)

### Métricas
- [ ] Vercel Analytics habilitado
- [ ] Firebase Performance Monitoring habilitado (opcional)

---

## 🔧 CONFIGURAÇÕES FINAIS

### Vercel
- [ ] Domínio customizado configurado (se aplicável)
- [ ] HTTPS forçado
- [ ] Environment Variables configuradas:
  - [ ] Production
  - [ ] Preview (opcional)
- [ ] Build & Development Settings corretos
- [ ] Cron Jobs configurados (se aplicável)

### Firebase
- [ ] Billing habilitado (Blaze Plan) para Cloud Functions
- [ ] Quotas revisadas (Firestore, Storage, FCM)
- [ ] Backup automático configurado (opcional)

### DNS
- [ ] Registros A/CNAME apontando para Vercel
- [ ] SSL/TLS válido

---

## ⚠️ PROBLEMAS CONHECIDOS (Não Bloqueantes)

1. **Console.log remanescentes:** Alguns `console.log` ainda existem em:
   - `src/features/cart/CartDrawer.tsx` (linhas 244, 281)
   - `src/features/admin/OrderManager.tsx` (linhas 247-325)
   - `src/features/admin/ProductManager.tsx` (linha 196)
   - `src/shared/hooks/usePushNotifications.ts` (linha 46)
   - `src/shared/lib/firebase.ts` (linha 28)
   
   **Impacto:** Baixo - logs aparecem no console do usuário mas não afetam funcionalidade
   **Recomendação:** Substituir por `logger` em próxima iteração

2. **Componentes de notificação duplicados:**
   - `NotificationBanner.tsx`, `NotificationPermissionBanner.tsx`, `SoftNotificationPrompt.tsx` ainda existem
   - Novo componente unificado `NotificationPrompt.tsx` criado mas não substituído
   
   **Impacto:** Nenhum - componentes antigos ainda funcionam
   **Recomendação:** Substituir gradualmente em próxima iteração

---

## 🎯 DEPLOY SEGURO

### Estratégia Recomendada

#### 1. Validação Pré-Deploy
```bash
# Valida variáveis de ambiente, testes e type checking
npm run predeploy

# Ou valide apenas as variáveis
npm run validate:env
```

#### 2. Deploy em Preview primeiro
```bash
git push origin feature/refactoring
# Vercel cria preview automaticamente
```

#### 3. Validar variáveis no Vercel
```bash
npm run validate:env:vercel
```

#### 4. Testar Preview extensivamente
- Fazer pedido completo
- Testar painel admin
- Verificar notificações
- Testar em mobile

#### 5. Monitorar Preview
```bash
npm run monitor
# Ou com URL customizada:
node scripts/monitor-deploy.mjs --url https://seu-preview.vercel.app
```

#### 6. Merge para main apenas após validação
```bash
git checkout main
git merge feature/refactoring
git push origin main
```

#### 7. Monitorar produção após deploy
```bash
# Execução única
npm run monitor

# Monitoramento contínuo (a cada 30s)
npm run monitor:continuous
```

**📖 Guia completo:** Consulte `GUIA_SCRIPTS_DEPLOY.md` para instruções detalhadas.

---

## 📞 CONTATOS DE EMERGÊNCIA

- **Firebase Console:** https://console.firebase.google.com
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Mercado Pago:** https://www.mercadopago.com.br/developers

---

## ✅ APROVAÇÃO FINAL

- [ ] Todos os itens **CRÍTICOS** de Segurança verificados
- [ ] Todos os testes funcionais passaram
- [ ] Build de produção testado localmente
- [ ] Preview deploy testado e aprovado
- [ ] Backup do banco de dados realizado (se aplicável)

**Responsável pelo Deploy:** _______________  
**Data/Hora:** _______________  
**Versão:** v1.0.0 (pós-auditoria)

---

## 🚨 ROLLBACK PLAN

Se algo der errado após deploy:

1. **Rollback imediato no Vercel:**
   - Dashboard → Deployments → Selecionar deploy anterior → "Promote to Production"

2. **Reverter Firebase Rules (se alteradas):**
   - Firebase Console → Firestore → Rules → Histórico → Restaurar versão anterior

3. **Notificar equipe:**
   - Documentar o problema
   - Criar issue no repositório
   - Planejar correção

---

**Última atualização:** 26/05/2026 01:15  
**Próxima revisão:** Após primeiro deploy em produção

---

## 🆕 NOVOS SCRIPTS DISPONÍVEIS

### Validação de Variáveis de Ambiente
```bash
npm run validate:env          # Valida .env.local
npm run validate:env:vercel   # Valida variáveis no Vercel
```

### Monitoramento Pós-Deploy
```bash
npm run monitor               # Monitora saúde do sistema (execução única)
npm run monitor:continuous    # Monitora continuamente (a cada 30s)
```

### Pré-Deploy Automático
```bash
npm run predeploy            # Executa lint + test + validate:env
```

**📖 Documentação completa:** Consulte `GUIA_SCRIPTS_DEPLOY.md`
