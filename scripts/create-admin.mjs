// scripts/create-admin.mjs
// ============================================================
// Script para criar o primeiro administrador do sistema.
// Use para cada novo cliente que você entregar.
//
// Uso:
//   1. Baixe a Service Account Key do Firebase Console:
//      Firebase Console → ⚙️ Configurações → Contas de serviço → Gerar nova chave privada
//   2. Salve o arquivo como `serviceAccountKey.json` na raiz do projeto
//   3. Execute: node scripts/create-admin.mjs
// ============================================================

import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createInterface } from 'readline';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function main() {
  console.log('\n🔧 CRIADOR DE ADMIN — E-commerce Chave na Mão\n');

  // 1. Carregar Service Account
  let serviceAccount;
  try {
    const raw = readFileSync('./serviceAccountKey.json', 'utf-8');
    serviceAccount = JSON.parse(raw);
  } catch {
    console.error('❌ Arquivo serviceAccountKey.json não encontrado na raiz do projeto.');
    console.error('   Baixe em: Firebase Console → ⚙️ Configurações → Contas de serviço → Gerar nova chave privada');
    process.exit(1);
  }

  // 2. Inicializar Firebase Admin
  const app = initializeApp({ credential: cert(serviceAccount) });
  const auth = getAuth(app);
  const db = getFirestore(app);

  // 3. Coletar dados
  const nome = await ask('📝 Nome do administrador: ');
  const email = await ask('📧 E-mail: ');
  const senha = await ask('🔑 Senha (mín. 8 caracteres): ');
  const unidade = await ask('🏪 Unidade (ex: geral, matriz): ') || 'geral';

  if (!nome.trim() || !email.trim() || senha.length < 8) {
    console.error('\n❌ Nome, email e senha (8+ chars) são obrigatórios.');
    process.exit(1);
  }

  try {
    // 4. Criar usuário no Firebase Auth
    console.log('\n⏳ Criando usuário no Firebase Auth...');
    const userRecord = await auth.createUser({
      email: email.trim(),
      password: senha,
      displayName: nome.trim(),
    });

    // 5. Criar documento na coleção 'admins'
    console.log('⏳ Registrando como administrador no Firestore...');
    await db.collection('admins').doc(userRecord.uid).set({
      nome: nome.trim(),
      email: email.trim(),
      unidade: unidade.trim(),
      role: 'admin',
      createdAt: new Date(),
    });

    console.log('\n✅ ADMIN CRIADO COM SUCESSO!');
    console.log('─────────────────────────────');
    console.log(`   Nome:    ${nome.trim()}`);
    console.log(`   Email:   ${email.trim()}`);
    console.log(`   UID:     ${userRecord.uid}`);
    console.log(`   Unidade: ${unidade.trim()}`);
    console.log('─────────────────────────────');
    console.log('\n🔐 Use esse email e senha para acessar /login\n');
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.error('\n❌ Esse email já está em uso. Use outro email ou remova o usuário existente.');
    } else {
      console.error('\n❌ Erro ao criar admin:', error.message);
    }
    process.exit(1);
  }

  rl.close();
}

main();
