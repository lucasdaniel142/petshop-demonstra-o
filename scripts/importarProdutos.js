import { initializeApp, cert, getApps, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuração para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// 1. DADOS DE ENTRADA MOCKADOS
// ==========================================
// Array com EANs reais de produtos brasileiros e preços por loja
const produtosEntrada = [
  // ACHOCOLATADOS
  { ean: '7891000412855', preco_benedito_bentes: 12.49, preco_vergel: 12.15, preco_salvador_lyra: 12.85 },
  { ean: '7891000426210', preco_benedito_bentes: 10.99, preco_vergel: 10.75, preco_salvador_lyra: 11.20 },
  { ean: '7891000379585', preco_benedito_bentes: 13.90, preco_vergel: 13.55, preco_salvador_lyra: 14.10 },
  { ean: '7891000379691', preco_benedito_bentes: 13.80, preco_vergel: 13.45, preco_salvador_lyra: 14.00 },
  { ean: '7891000258613', preco_benedito_bentes: 14.90, preco_vergel: 14.55, preco_salvador_lyra: 15.20 },
  // BEBIDAS - Refrigerantes
  { ean: '7894900010014', preco_benedito_bentes: 9.99, preco_vergel: 9.75, preco_salvador_lyra: 10.25 },
  { ean: '7894900012457', preco_benedito_bentes: 8.99, preco_vergel: 8.75, preco_salvador_lyra: 9.15 },
  { ean: '7894900015821', preco_benedito_bentes: 7.49, preco_vergel: 7.25, preco_salvador_lyra: 7.75 },
  // MERCEARIA - Arroz
  { ean: '7898902841108', preco_benedito_bentes: 35.90, preco_vergel: 34.50, preco_salvador_lyra: 36.75 },
  { ean: '7898902841085', preco_benedito_bentes: 15.90, preco_vergel: 15.45, preco_salvador_lyra: 16.25 },
  // MERCEARIA - Feijão
  { ean: '7898902041108', preco_benedito_bentes: 7.99, preco_vergel: 7.75, preco_salvador_lyra: 8.15 },
  { ean: '7898902041092', preco_benedito_bentes: 13.99, preco_vergel: 13.50, preco_salvador_lyra: 14.25 },
  // MERCEARIA - Óleo
  { ean: '7891000052000', preco_benedito_bentes: 8.99, preco_vergel: 8.65, preco_salvador_lyra: 9.25 },
  { ean: '7891000073006', preco_benedito_bentes: 24.99, preco_vergel: 24.15, preco_salvador_lyra: 25.50 },
  // CONGELADOS
  { ean: '7896036088406', preco_benedito_bentes: 12.90, preco_vergel: 12.50, preco_salvador_lyra: 13.20 },
  { ean: '7896036088390', preco_benedito_bentes: 18.90, preco_vergel: 18.35, preco_salvador_lyra: 19.25 },
  // PADARIA/CONFEITARIA
  { ean: '7891000103001', preco_benedito_bentes: 8.99, preco_vergel: 8.65, preco_salvador_lyra: 9.25 },
  { ean: '7891000103018', preco_benedito_bentes: 5.99, preco_vergel: 5.75, preco_salvador_lyra: 6.15 },
  // LIMPEZA
  { ean: '7898903701071', preco_benedito_bentes: 4.99, preco_vergel: 4.75, preco_salvador_lyra: 5.15 },
  { ean: '7898903701102', preco_benedito_bentes: 12.99, preco_vergel: 12.50, preco_salvador_lyra: 13.25 },
];

// ==========================================
// 2. CONFIGURAÇÃO DO FIREBASE ADMIN
// ==========================================
let db;
try {
  const serviceAccount = JSON.parse(
    await fs.readFile(path.join(__dirname, '../serviceAccountKey.json'), 'utf-8')
  );

  // Limpar apps existentes para evitar conflitos
  const existingApps = getApps();
  for (const app of existingApps) {
    await deleteApp(app);
  }

  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  db = getFirestore();
  console.log('✅ Firebase Admin inicializado com sucesso.\n');
} catch (error) {
  console.error('❌ Erro ao inicializar Firebase Admin:', error.message);
  process.exit(1);
}

// ==========================================
// 3. FUNÇÕES AUXILIARES
// ==========================================

/**
 * Busca informações do produto na API Open Food Facts
 * @param {string} ean - Código de barras do produto
 * @returns {Promise<Object>} Dados do produto
 */
async function buscarProdutoOpenFoodFacts(ean) {
  try {
    const response = await axios.get(
      `https://world.openfoodfacts.org/api/v0/product/${ean}.json`,
      { timeout: 8000 }
    );

    if (!response.data || response.data.status !== 1) {
      throw new Error('Produto não encontrado na API.');
    }

    const product = response.data.product;
    const nome =
      product.product_name_pt ||
      product.product_name ||
      `Produto ${ean}`;

    const imageUrl =
      product.image_url ||
      product.image_front_url ||
      'https://via.placeholder.com/400?text=Imagem+não+disponível';

    const categorias = product.categories_tags || [];
    const categoriaRaw =
      categorias.length > 0
        ? categorias[0]
        : product.categories || 'Produtos Gerais';

    const categoria = categoriaRaw
      .toString()
      .toLowerCase()
      .replace(/^(en:|pt:)/, '')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Mapeamento para categorias mais específicas
    const categoriaMapeada = categoria.includes('cocoa') || categoria.includes('achocolatado') || categoria.includes('nescau')
      ? 'Achocolatados'
      : categoria.includes('cereal') || categoria.includes('floco')
      ? 'Cereais'
      : categoria.includes('beverage') || categoria.includes('drink') || categoria.includes('bebida')
      ? 'Bebidas'
      : categoria.includes('food') || categoria.includes('alimento')
      ? 'Mercearia'
      : categoria || 'Mercearia';

    return { nome, imageUrl, categoria: categoriaMapeada };
  } catch (error) {
    throw new Error(`Erro ao buscar produto ${ean}: ${error.message}`);
  }
}

/**
 * Estrutura os dados do produto para o Firestore
 * @param {Object} entrada - Dados de entrada com EAN e preços
 * @param {Object} dadosAPI - Dados obtidos da API
 * @returns {Object} Documento estruturado para Firestore
 */
function estruturarDocumento(entrada, dadosAPI) {
  return {
    nome: dadosAPI.nome,
    ean: entrada.ean,
    imageUrl: dadosAPI.imageUrl,
    unit: 'un',
    categoria: dadosAPI.categoria || 'Produtos Gerais',
    precos: {
      benedito_bentes: {
        valor: entrada.preco_benedito_bentes,
        emOferta: false,
        esgotado: false,
      },
      vergel: {
        valor: entrada.preco_vergel,
        emOferta: false,
        esgotado: false,
      },
      salvador_lyra: {
        valor: entrada.preco_salvador_lyra,
        emOferta: false,
        esgotado: false,
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Salva o produto no Firestore
 * @param {string} ean - Código de barras (ID do documento)
 * @param {Object} documento - Dados estruturados do produto
 */
async function salvarNoFirestore(ean, documento) {
  try {
    await db.collection('produtos').doc(ean).set(documento, { merge: true });
  } catch (error) {
    const mensagemBase = `Erro ao salvar no Firestore: ${error.message}`;
    const hint =
      error.code === 5 || String(error.message).includes('NOT_FOUND')
        ? ' Verifique se o Firestore está configurado no console Firebase e se o banco de dados padrão foi criado.'
        : '';
    throw new Error(mensagemBase + hint);
  }
}

// ==========================================
// 4. LÓGICA PRINCIPAL
// ==========================================

async function executarImportacao() {
  console.log('��� Iniciando importação de produtos...\n');

  let sucessos = 0;
  let erros = 0;
  const errosDetalhados = [];

  // Delay para respeitar rate limit das APIs
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  for (const entrada of produtosEntrada) {
    const { ean } = entrada;
    process.stdout.write(`⏳ Processando EAN ${ean}... `);

    try {
      // Buscar na API Open Food Facts
      const dadosAPI = await buscarProdutoOpenFoodFacts(ean);

      // Estruturar documento
      const documento = estruturarDocumento(entrada, dadosAPI);

      // Salvar no Firestore
      await salvarNoFirestore(ean, documento);

      console.log(`✅ Sucesso: "${documento.nome}"`);
      sucessos++;
    } catch (error) {
      console.log(`❌ Erro`);
      const mensagem = `  EAN ${ean}: ${error.message}`;
      errosDetalhados.push(mensagem);
      erros++;
    }

    // Aguardar 3 segundos entre requisições para não sobrecarregar a API
    await delay(3000);
  }

  // ==========================================
  // 5. RELATÓRIO FINAL
  // ==========================================
  console.log('\n' + '='.repeat(60));
  console.log('��� RELATÓRIO DA IMPORTAÇÃO');
  console.log('='.repeat(60));
  console.log(`Total de produtos processados: ${produtosEntrada.length}`);
  console.log(`✅ Sucessos: ${sucessos}`);
  console.log(`❌ Erros: ${erros}`);

  if (errosDetalhados.length > 0) {
    console.log('\n⚠️  Detalhes dos erros:');
    errosDetalhados.forEach((msg) => console.log(msg));
  }

  console.log('='.repeat(60));
  console.log('��� Importação finalizada!\n');
}

// Executar script
executarImportacao().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
