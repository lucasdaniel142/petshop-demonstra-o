// src/pages/PrivacyPolicy.tsx
// ============================================================
// Página de Política de Privacidade (LGPD).
// Requisito regulatório para e-commerce no Brasil.
// O conteúdo é genérico e White Label — adapta-se
// automaticamente ao nome da loja via BRAND config.
// ============================================================

import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BRAND } from '../config/brand';

export const PrivacyPolicy: React.FC = () => {
  const storeName = BRAND.name;
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            to="/"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Voltar à loja"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-primary" />
            <h1 className="text-lg font-extrabold text-gray-900">Política de Privacidade</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10 space-y-6 text-sm text-gray-700 leading-relaxed">

          <p className="text-xs text-gray-400">
            Última atualização: {currentDate}
          </p>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">1. Introdução</h2>
            <p>
              O <strong>{storeName}</strong> ("nós", "nosso") valoriza e respeita a
              privacidade de seus clientes. Esta Política de Privacidade descreve como
              coletamos, utilizamos, armazenamos e protegemos seus dados pessoais quando
              você utiliza nosso sistema de pedidos online, em conformidade com a{' '}
              <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">2. Dados que Coletamos</h2>
            <p>Para processar seus pedidos, coletamos apenas os dados estritamente necessários:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li><strong>Nome completo</strong> — para identificação do pedido e entrega</li>
              <li><strong>Endereço de entrega e CEP</strong> — para cálculo de frete e envio do pedido</li>
              <li><strong>E-mail</strong> — para processamento do pagamento online (quando aplicável)</li>
              <li><strong>CPF</strong> — exigido pela operadora de pagamento para transações online</li>
              <li><strong>Número de WhatsApp</strong> — quando o pedido é enviado por esta via</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">3. Como Utilizamos seus Dados</h2>
            <p>Seus dados pessoais são utilizados exclusivamente para:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Processar e entregar seus pedidos</li>
              <li>Calcular a taxa de entrega com base na distância</li>
              <li>Processar pagamentos via Mercado Pago (Pix e cartão de crédito)</li>
              <li>Enviar atualizações sobre o status do seu pedido</li>
              <li>Cumprir obrigações legais e regulatórias</li>
            </ul>
            <p className="mt-2">
              <strong>Não vendemos, compartilhamos ou cedemos</strong> seus dados pessoais
              para terceiros para fins de marketing ou publicidade.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">4. Proteção dos Dados</h2>
            <p>Implementamos medidas técnicas e organizacionais para proteger seus dados:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                <strong>Criptografia AES-256</strong> — dados sensíveis (nome, CPF, endereço)
                são criptografados antes de serem armazenados
              </li>
              <li>
                <strong>HTTPS obrigatório</strong> — toda comunicação entre seu navegador e
                nossos servidores é criptografada em trânsito
              </li>
              <li>
                <strong>Acesso restrito</strong> — apenas administradores autorizados da
                loja têm acesso aos dados de pedidos
              </li>
              <li>
                <strong>Processamento seguro de pagamentos</strong> — os dados do cartão
                são processados diretamente pelo Mercado Pago e nunca passam pelo nosso servidor
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">5. Compartilhamento com Terceiros</h2>
            <p>
              Compartilhamos dados apenas com os prestadores de serviço estritamente
              necessários para a operação:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>
                <strong>Mercado Pago</strong> — processamento de pagamentos (sujeito à{' '}
                <a href="https://www.mercadopago.com.br/privacidade" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  política de privacidade do Mercado Pago
                </a>)
              </li>
              <li>
                <strong>Firebase (Google)</strong> — armazenamento seguro dos dados de pedidos
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">6. Seus Direitos (LGPD)</h2>
            <p>Conforme a LGPD, você tem direito a:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Solicitar acesso aos seus dados pessoais</li>
              <li>Solicitar a correção de dados incompletos ou incorretos</li>
              <li>Solicitar a exclusão dos seus dados pessoais</li>
              <li>Revogar o consentimento dado para o tratamento dos dados</li>
              <li>Solicitar a portabilidade dos dados</li>
            </ul>
            <p className="mt-2">
              Para exercer qualquer um desses direitos, entre em contato conosco pelo
              WhatsApp da loja ou pelo e-mail informado no rodapé do site.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">7. Retenção de Dados</h2>
            <p>
              Os dados de pedidos são mantidos pelo período necessário para cumprimento
              de obrigações legais, fiscais e contratuais. Após esse período, os dados
              são anonimizados ou excluídos de forma segura.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">8. Cookies e Tecnologias de Rastreamento</h2>
            <p>
              Nosso sistema não utiliza cookies de rastreamento ou tecnologias de
              publicidade comportamental. Utilizamos apenas armazenamento local
              (localStorage) para manter os itens do seu carrinho de compras durante
              a sessão de navegação.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">9. Alterações nesta Política</h2>
            <p>
              Esta política pode ser atualizada periodicamente. Recomendamos que você
              a consulte regularmente. Alterações significativas serão comunicadas
              através do nosso site ou WhatsApp.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">10. Contato</h2>
            <p>
              Para dúvidas sobre esta Política de Privacidade ou sobre o tratamento
              dos seus dados pessoais, entre em contato pelo WhatsApp da loja ou
              através do nosso atendimento presencial.
            </p>
          </section>

          <div className="border-t border-gray-200 pt-4 mt-6">
            <p className="text-xs text-gray-400 text-center">
              {storeName} — Todos os direitos reservados.
              <br />
              Controlador de dados: {storeName} (estabelecimento comercial)
            </p>
          </div>
        </div>

        {/* Back button */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:underline"
          >
            <ArrowLeft size={16} />
            Voltar à loja
          </Link>
        </div>
      </main>
    </div>
  );
};
