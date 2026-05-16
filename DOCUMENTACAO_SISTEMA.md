# 📑 Documentação Completa: Sistema E-commerce White Label
**Versão:** 1.0.0 (Enterprise Ready)  
**Projeto:** Supermercado Sagrada Família  
**Stack:** React 19 + Vite + Tailwind 4 + Zustand + Firebase + Vercel Serverless

---

## 1. Visão Geral do Projeto
O sistema é uma plataforma de e-commerce "chave na mão" (White Label) otimizada para alta performance, baixo custo de manutenção (Serverless) e segurança de nível bancário. O foco principal é a experiência de compra rápida via dispositivo móvel (PWA) com fechamento de pedido integrado ao WhatsApp e notificações em tempo real.

---

## 2. Arquitetura Técnica
O projeto segue os princípios de **Clean Architecture** e **Feature-Based Design**, dividindo-se em:
*   **Frontend:** React 19 utilizando os novos hooks de transição e gerenciamento de estado leve com Zustand.
*   **Backend (Serverless):** APIs Node.js hospedadas na Vercel para processamento sensível (Checkout, Notificações).
*   **Banco de Dados:** Google Firestore (NoSQL) com sincronização em tempo real.
*   **Segurança:** "Muralha de Segurança" via Firebase Admin SDK, impossibilitando manipulação de preços por usuários mal-intencionados.

---

## 3. Módulos e Funcionalidades

### 🛒 Experiência do Cliente (Storefront)
*   **Catálogo Dinâmico:** Listagem de produtos com suporte a categorias e busca instantânea.
*   **Gestão Multi-Loja:** Troca inteligente de preços e estoques baseada na loja selecionada pelo usuário.
*   **Carrinho Persistente:** Gerenciado via Zustand com persistência em `sessionStorage` para evitar perda de dados em atualizações de página.
*   **Checkout Blindado:**
    *   Cálculo automático de frete via Geocodificação (ViaCEP + Haversine).
    *   Validação de preços no servidor (Vercel API) contra fraude.
    *   Opções de pagamento na entrega (Dinheiro, Pix, Cartão, Ticket).
*   **PWA (Progressive Web App):** Instalável no celular, funciona offline e possui cache inteligente de imagens via Service Workers.

### 🛡️ Painel Administrativo (Dashboard)
*   **Gestão de Pedidos (Real-time):** Monitoramento de pedidos em tempo real com alertas sonoros e visuais.
*   **Controle de Status:** Fluxo completo de pedido (Pendente → Em Separação → Saiu para Entrega → Entregue).
*   **Gestão de Produtos e Preços:** Interface para cadastro de produtos e ajuste de preços específicos por filial.
*   **Notificações Push:** Envio automático de alertas para o celular do cliente quando o status do pedido muda.
*   **Gestão de Equipe:** Controle de acesso para múltiplos administradores com níveis de permissão via Firestore Rules.

---

## 4. Design e Estética (UX/UI)
*   **Estética Premium:** Uso de Tailwind 4 com uma paleta de cores harmoniosa, focada em legibilidade e conversão.
*   **Micro-interações:** Feedback visual em todos os botões, skeletons de carregamento e transições suaves entre rotas administrativas (Lazy Loading).
*   **Responsividade Total:** Interface *Mobile-First*, garantindo que a experiência no smartphone seja idêntica a um aplicativo nativo.

---

## 5. Camada de Segurança ("A Muralha")
*   **Validação Soberana:** O cliente nunca dita o preço. A API de checkout revalida cada centavo contra o banco de dados antes de confirmar.
*   **Regras de Acesso:** Firestore Rules configuradas para negar qualquer tentativa de escrita direta em coleções críticas por usuários anônimos.
*   **Proteção contra Bots:** Limitação de taxa (Rate Limiting) e proteção contra Replay Attacks em APIs de notificação.

---

## 6. SRE e Resiliência (Confiabilidade)
*   **Fallback de APIs:** Se serviços externos (ViaCEP) falharem, o sistema possui fluxos de contingência para não interromper a venda.
*   **Gestão de Memória:** Otimização de ouvintes do banco de dados e instâncias de áudio para manter o sistema fluido em abas abertas por longos períodos.
*   **Sincronização Offline:** Capacidade de reidratar o estado do carrinho mesmo após quedas de conexão.

---

## 7. Integrações Externas
*   **WhatsApp Business:** Geração de links dinâmicos com template de pedido formatado.
*   **Firebase Cloud Messaging (FCM):** Infraestrutura de Web Push Notifications.
*   **ViaCEP:** Consulta automatizada de endereços.

---
**Desenvolvido por Antigravity AI - Comitê de Elite de Engenharia.**
