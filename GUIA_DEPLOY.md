# 🚀 Guia de Deploy - Sistema E-commerce Sagrada Família

## 📋 Scripts Disponíveis

### Deploy Completo
```bash
# Deploy em produção (recomendado após validações)
npm run deploy

# Deploy em ambiente de preview (para testes)
npm run deploy:preview
```

### Deploy Apenas do Firebase
```bash
# Atualiza apenas as regras do Firestore
npm run deploy:firebase
```

### Opções Avançadas
```bash
# Deploy sem validações (não recomendado)
node scripts/deploy.mjs --skip-validation

# Deploy sem monitoramento pós-deploy
node scripts/deploy.mjs --skip-monitor

# Ver todas as opções
node scripts/deploy.mjs --help
```

## 🔄 Fluxo do Deploy Automatizado

O script de deploy executa automaticamente:

1. **Validações Pré-Deploy**
   - Verifica alterações não commitadas no Git
   - Valida variáveis de ambiente
   - Executa lint (TypeScript)
   - Executa testes

2. **Build do Projeto**
   - Compila o projeto para produção
   - Verifica tamanho do bundle

3. **Deploy para Vercel**
   - Faz upload do build
   - Configura ambiente (produção ou preview)
   - Retorna URL do deploy

4. **Deploy do Firebase**
   - Atualiza regras do Firestore
   - Aplica configurações de segurança

5. **Monitoramento Pós-Deploy**
   - Testa endpoints críticos
   - Verifica headers de segurança
   - Valida PWA e Firebase
   - Gera relatório de saúde

## 📝 Pré-Requisitos

### Antes do Primeiro Deploy

1. **Instalar Vercel CLI**
```bash
npm i -g vercel
vercel login
```

2. **Configurar Variáveis de Ambiente no Vercel**
```bash
# Validar variáveis locais
npm run validate:env

# Validar variáveis no Vercel
npm run validate:env:vercel
```

3. **Configurar Firebase**
```bash
# Instalar Firebase CLI
npm i -g firebase-tools
firebase login

# Inicializar projeto (se necessário)
firebase init
```

## 🚀 Estratégia Recomendada de Deploy

### 1. Deploy em Preview Primeiro
```bash
# Faça deploy em uma branch de feature
git checkout -b feature/minha-alteracao
git add .
git commit -m "Minha alteração"
git push origin feature/minha-alteracao

# Deploy em preview
npm run deploy:preview
```

### 2. Testar Extensivamente
- Teste o fluxo completo de compras
- Verifique o painel admin
- Teste notificações
- Teste em mobile

### 3. Monitorar Preview
```bash
# Monitorar saúde do sistema
npm run monitor

# Ou com URL específica
node scripts/monitor-deploy.mjs --url https://seu-preview.vercel.app
```

### 4. Promover para Produção
Após validar o preview:
```bash
# Merge para main
git checkout main
git merge feature/minha-alteracao
git push origin main

# Deploy em produção
npm run deploy
```

### 5. Monitorar Produção
```bash
# Monitoramento único
npm run monitor

# Monitoramento contínuo (a cada 30s)
npm run monitor:continuous
```

## ⚠️ Rollback em Caso de Problemas

### Rollback no Vercel
1. Acesse https://vercel.com/dashboard
2. Selecione o projeto
3. Vá em "Deployments"
4. Selecione o deploy anterior
5. Clique em "Promote to Production"

### Rollback no Firebase
1. Acesse https://console.firebase.google.com
2. Selecione o projeto
3. Vá em "Firestore" → "Rules"
4. Clique no histórico de versões
5. Restaure a versão anterior

## 🔧 Solução de Problemas

### Erro: Variáveis de Ambiente Não Configuradas
```bash
# Validar variáveis
npm run validate:env

# Configurar no Vercel
vercel env add FIREBASE_SERVICE_ACCOUNT_KEY
vercel env add APP_ENCRYPTION_KEY
# ... (outras variáveis)
```

### Erro: Build Falha
```bash
# Limpar cache e rebuild
npm run clean
npm run build
```

### Erro: Deploy Vercel Falha
```bash
# Verificar autenticação
vercel whoami

# Re-autenticar se necessário
vercel login
```

### Erro: Firebase Deploy Falha
```bash
# Verificar configuração
firebase projects:list

# Re-autenticar
firebase login
```

## 📊 Checklist Antes do Deploy

- [ ] Todas as alterações estão commitadas
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Testes locais passaram
- [ ] Lint sem erros
- [ ] Preview deploy testado e aprovado
- [ ] Backup do banco de dados realizado (se aplicável)

## 📞 Suporte

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Firebase Console:** https://console.firebase.google.com
- **Documentação:** Consulte `PRE_DEPLOY_CHECKLIST.md` para detalhes completos

---

**Última atualização:** 01/06/2026
