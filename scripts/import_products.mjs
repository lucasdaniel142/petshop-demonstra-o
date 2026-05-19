import fs from 'fs/promises';
import path from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const ROOT = path.resolve('./');
const seedPath = path.join(ROOT, 'scripts', 'seed_products.json');

async function main() {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY não definido. Exporte a chave do service account como variável de ambiente.');
    process.exit(1);
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(key);
  } catch (err) {
    console.error('Erro ao parsear FIREBASE_SERVICE_ACCOUNT_KEY:', err.message);
    process.exit(1);
  }

  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  const content = await fs.readFile(seedPath, 'utf-8');
  const products = JSON.parse(content);

  console.log(`Importando ${products.length} produtos...`);

  let created = 0;
  for (const p of products) {
    try {
      await db.collection('produtos').add(p);
      created++;
    } catch (err) {
      console.error('Falha ao adicionar produto', p.nome, err.message);
    }
  }

  console.log(`Import concluída. ${created}/${products.length} produtos criados.`);
  process.exit(0);
}

// Executa diretamente
main();
