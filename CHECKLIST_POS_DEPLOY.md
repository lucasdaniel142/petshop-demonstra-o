# ✅ Checklist Pós-Deploy

> Execute toda vez que alterar código ou configurações. Tempo: 10-15 min.

## Vitrine
- [ ] URL carrega sem erros
- [ ] Produtos aparecem com nome, preço e imagem
- [ ] Filtro por categoria funciona
- [ ] Busca por nome funciona

## Carrinho
- [ ] Adicionar/remover itens
- [ ] Alterar quantidade recalcula total
- [ ] Limpar carrinho funciona

## CEP e Frete
- [ ] CEP válido preenche endereço
- [ ] Taxa calculada corretamente
- [ ] CEP fora da área mostra erro

## WhatsApp
- [ ] Preencher dados e enviar via WhatsApp
- [ ] Mensagem formatada com itens, totais, endereço

## Pagamento Online (Mercado Pago Bricks)
- [ ] **Checkout Bricks:** Pix gera QR Code e Cartão tokeniza (use chaves TEST)
- [ ] **Wallet Brick:** Botão "Mercado Pago" renderiza e abre popup de login
- [ ] **Status Screen:** Modal mostra status oficial do MP após o pagamento
- [ ] **Webhook:** Pedido no Firestore muda para `approved` automaticamente
- [ ] **WhatsApp Fallback:** Link aparece se o pagamento falhar ou for cancelado

## Horário de Funcionamento
- [ ] Checkout bloqueia fora do horário

## Admin
- [ ] Login funciona (válido e inválido)
- [ ] Rota protegida redireciona sem login
- [ ] CRUD de produtos funciona
- [ ] Upload de imagem (Firebase Storage)
- [ ] Alterar preços funciona
- [ ] Tela de pedidos carrega
- [ ] Dados descriptografados corretamente
- [ ] Notificação sonora ao receber pedido

## LGPD
- [ ] Página `/privacidade` carrega
- [ ] Checkbox de consentimento no checkout
- [ ] Checkout bloqueia sem aceitar política

## Se Algo Falhar
1. Logs Vercel: Dashboard → Functions → Logs
2. Console do navegador: F12 → Console
3. Variáveis de ambiente na Vercel
4. Consultar `GUIA_DE_EMERGENCIA.md`
