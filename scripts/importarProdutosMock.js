import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
  readFileSync('./serviceAccountKey.json', 'utf-8')
);

// Inicializar Firebase Admin
const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Produtos mock com dados realistas de supermercado
const produtosMock = [
  // MERCEARIA
  {
    nome: 'Arroz Integral 5kg',
    descricao: 'Arroz integral de alta qualidade, 100% natural',
    categoria: 'Mercearia',
    imagem:
      'https://via.placeholder.com/300x300?text=Arroz+Integral',
    precos: {
      benedito_bentes: 32.90,
      vergel: 31.50,
      salvador_lyra: 33.50,
    },
    emOferta: false,
  },
  {
    nome: 'Feijão Carioca 1kg',
    descricao: 'Feijão carioca selecionado',
    categoria: 'Mercearia',
    imagem:
      'https://via.placeholder.com/300x300?text=Feijao+Carioca',
    precos: {
      benedito_bentes: 7.90,
      vergel: 7.50,
      salvador_lyra: 8.10,
    },
    emOferta: true,
  },
  {
    nome: 'Óleo de Soja 900ml',
    descricao: 'Óleo vegetal refinado',
    categoria: 'Mercearia',
    imagem:
      'https://via.placeholder.com/300x300?text=Oleo+Soja',
    precos: {
      benedito_bentes: 8.50,
      vergel: 8.20,
      salvador_lyra: 8.80,
    },
    emOferta: false,
  },
  {
    nome: 'Açúcar Cristal 1kg',
    descricao: 'Açúcar cristal puro',
    categoria: 'Mercearia',
    imagem:
      'https://via.placeholder.com/300x300?text=Acucar',
    precos: {
      benedito_bentes: 4.50,
      vergel: 4.20,
      salvador_lyra: 4.80,
    },
    emOferta: false,
  },
  {
    nome: 'Sal Refinado 1kg',
    descricao: 'Sal refinado iodado',
    categoria: 'Mercearia',
    imagem:
      'https://via.placeholder.com/300x300?text=Sal',
    precos: {
      benedito_bentes: 2.90,
      vergel: 2.70,
      salvador_lyra: 3.10,
    },
    emOferta: false,
  },
  // BEBIDAS
  {
    nome: 'Refrigerante Cola 2L',
    descricao: 'Bebida carbonatada',
    categoria: 'Bebidas',
    imagem:
      'https://via.placeholder.com/300x300?text=Refrigerante+Cola',
    precos: {
      benedito_bentes: 8.90,
      vergel: 8.50,
      salvador_lyra: 9.20,
    },
    emOferta: true,
  },
  {
    nome: 'Suco Natural 1L',
    descricao: 'Suco natural integral',
    categoria: 'Bebidas',
    imagem:
      'https://via.placeholder.com/300x300?text=Suco',
    precos: {
      benedito_bentes: 6.90,
      vergel: 6.50,
      salvador_lyra: 7.20,
    },
    emOferta: false,
  },
  {
    nome: 'Leite Integral 1L',
    descricao: 'Leite fresco integral',
    categoria: 'Bebidas',
    imagem:
      'https://via.placeholder.com/300x300?text=Leite',
    precos: {
      benedito_bentes: 4.50,
      vergel: 4.20,
      salvador_lyra: 4.80,
    },
    emOferta: false,
  },
  // PADARIA
  {
    nome: 'Pão Francês 500g',
    descricao: 'Pão francês fresco diariamente',
    categoria: 'Padaria',
    imagem:
      'https://via.placeholder.com/300x300?text=Pao+Frances',
    precos: {
      benedito_bentes: 8.90,
      vergel: 8.50,
      salvador_lyra: 9.20,
    },
    emOferta: false,
  },
  {
    nome: 'Bolo Chocolate 400g',
    descricao: 'Bolo de chocolate caseiro',
    categoria: 'Confeitaria',
    imagem:
      'https://via.placeholder.com/300x300?text=Bolo+Chocolate',
    precos: {
      benedito_bentes: 12.90,
      vergel: 12.50,
      salvador_lyra: 13.20,
    },
    emOferta: false,
  },
  // HORTIFRUTI
  {
    nome: 'Maçã Vermelha 1kg',
    descricao: 'Maçã vermelha importada',
    categoria: 'Hortifruti',
    imagem:
      'https://via.placeholder.com/300x300?text=Maca',
    precos: {
      benedito_bentes: 9.90,
      vergel: 9.50,
      salvador_lyra: 10.20,
    },
    emOferta: true,
  },
  {
    nome: 'Batata Inglesa 2kg',
    descricao: 'Batata inglesa selecionada',
    categoria: 'Hortifruti',
    imagem:
      'https://via.placeholder.com/300x300?text=Batata',
    precos: {
      benedito_bentes: 6.90,
      vergel: 6.50,
      salvador_lyra: 7.20,
    },
    emOferta: false,
  },
  {
    nome: 'Cebola Roxa 1kg',
    descricao: 'Cebola roxa fresca',
    categoria: 'Hortifruti',
    imagem:
      'https://via.placeholder.com/300x300?text=Cebola',
    precos: {
      benedito_bentes: 5.90,
      vergel: 5.50,
      salvador_lyra: 6.20,
    },
    emOferta: false,
  },
  // LIMPEZA
  {
    nome: 'Detergente Neutro 500ml',
    descricao: 'Detergente neutro concentrado',
    categoria: 'Limpeza',
    imagem:
      'https://via.placeholder.com/300x300?text=Detergente',
    precos: {
      benedito_bentes: 3.90,
      vergel: 3.70,
      salvador_lyra: 4.10,
    },
    emOferta: false,
  },
  {
    nome: 'Desinfetante Uso Geral 1L',
    descricao: 'Desinfetante multiuso',
    categoria: 'Limpeza',
    imagem:
      'https://via.placeholder.com/300x300?text=Desinfetante',
    precos: {
      benedito_bentes: 5.90,
      vergel: 5.50,
      salvador_lyra: 6.20,
    },
    emOferta: true,
  },
  {
    nome: 'Sabão em Pó 500g',
    descricao: 'Sabão em pó alta eficiência',
    categoria: 'Limpeza',
    imagem:
      'https://via.placeholder.com/300x300?text=Sabao+Po',
    precos: {
      benedito_bentes: 8.90,
      vergel: 8.50,
      salvador_lyra: 9.20,
    },
    emOferta: false,
  },
  // HIGIENE
  {
    nome: 'Sabonete Líquido Neutro 250ml',
    descricao: 'Sabonete neutro para todas as peles',
    categoria: 'Higiene',
    imagem:
      'https://via.placeholder.com/300x300?text=Sabonete',
    precos: {
      benedito_bentes: 4.90,
      vergel: 4.70,
      salvador_lyra: 5.10,
    },
    emOferta: false,
  },
  {
    nome: 'Papel Higiênico 4 rolos',
    descricao: 'Papel higiênico macio e resistente',
    categoria: 'Higiene',
    imagem:
      'https://via.placeholder.com/300x300?text=Papel+Higienico',
    precos: {
      benedito_bentes: 12.90,
      vergel: 12.50,
      salvador_lyra: 13.20,
    },
    emOferta: true,
  },
  {
    nome: 'Escova de Dente 3 pack',
    descricao: 'Escova de dente macia pack 3',
    categoria: 'Higiene',
    imagem:
      'https://via.placeholder.com/300x300?text=Escova+Dente',
    precos: {
      benedito_bentes: 9.90,
      vergel: 9.50,
      salvador_lyra: 10.20,
    },
    emOferta: false,
  },
  // CONGELADOS
  {
    nome: 'Frango Congelado 1kg',
    descricao: 'Peito de frango congelado',
    categoria: 'Congelados',
    imagem:
      'https://via.placeholder.com/300x300?text=Frango',
    precos: {
      benedito_bentes: 18.90,
      vergel: 18.50,
      salvador_lyra: 19.20,
    },
    emOferta: false,
  },
  {
    nome: 'Brócolis Congelado 500g',
    descricao: 'Brócolis congelado fresquinho',
    categoria: 'Congelados',
    imagem:
      'https://via.placeholder.com/300x300?text=Brocolis',
    precos: {
      benedito_bentes: 8.90,
      vergel: 8.50,
      salvador_lyra: 9.20,
    },
    emOferta: false,
  },
  // OFERTAS ESPECIAIS
  {
    nome: 'Promoção: Combo Café da Manhã',
    descricao:
      'Leite, pão e queijo - pack especial com desconto',
    categoria: 'Ofertas',
    imagem:
      'https://via.placeholder.com/300x300?text=Combo',
    precos: {
      benedito_bentes: 19.90,
      vergel: 18.90,
      salvador_lyra: 20.50,
    },
    emOferta: true,
  },
];

async function importarProdutosAoFirestore() {
  try {
    console.log('📚 Iniciando importação de produtos mock...\n');

    let sucessos = 0;
    let erros = 0;

    for (const produto of produtosMock) {
      try {
        await db.collection('produtos').add(produto);
        console.log(`✅ Adicionado: ${produto.nome}`);
        sucessos++;
      } catch (error) {
        console.error(`❌ Erro ao adicionar ${produto.nome}:`, error);
        erros++;
      }
    }

    console.log('\n============================================================');
    console.log('📊 RELATÓRIO DA IMPORTAÇÃO');
    console.log('============================================================');
    console.log(`Total de produtos: ${produtosMock.length}`);
    console.log(`✅ Sucessos: ${sucessos}`);
    console.log(`❌ Erros: ${erros}`);
    console.log('============================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Erro crítico durante importação:', error);
    process.exit(1);
  }
}

importarProdutosAoFirestore();
