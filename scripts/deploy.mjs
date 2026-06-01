#!/usr/bin/env node
// =============================================================================
// deploy.mjs — Script de Deploy Automatizado
// =============================================================================
// Este script automatiza todo o processo de deploy do sistema e-commerce
// Sagrada Família, incluindo validações, build, deploy e monitoramento.
//
// USO:
//   node scripts/deploy.mjs [opções]
//
// OPÇÕES:
//   --preview          Faz deploy em ambiente de preview
//   --production       Faz deploy em produção (padrão)
//   --skip-validation  Pula validações pré-deploy (não recomendado)
//   --skip-monitor     Pula monitoramento pós-deploy
//   --firebase-only    Faz deploy apenas das regras do Firebase
//   --help             Mostra ajuda
//
// =============================================================================

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
};

// =============================================================================
// CONFIGURAÇÃO
// =============================================================================

const CONFIG = {
  projectName: 'sagrada-familia',
  defaultEnvironment: 'production',
  vercelTimeout: 300000, // 5 minutos
  firebaseTimeout: 120000, // 2 minutos
};

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

function log(message, color = 'reset') {
  const timestamp = new Date().toLocaleTimeString('pt-BR');
  console.log(`${COLORS[color]}[${timestamp}] ${message}${COLORS.reset}`);
}

function logSection(title) {
  console.log('');
  log(`${'='.repeat(80)}`, 'cyan');
  log(`  ${title}`, 'bold');
  log(`${'='.repeat(80)}`, 'cyan');
}

function execCommand(command, options = {}) {
  try {
    const output = execSync(command, {
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
      ...options,
    });
    return { success: true, output };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      output: error.stdout || '',
    };
  }
}

// =============================================================================
// VALIDAÇÕES PRÉ-DEPLOY
// =============================================================================

async function runPreDeployValidations() {
  logSection('🔍 VALIDAÇÕES PRÉ-DEPLOY');

  // 1. Verifica se há alterações não commitadas
  log('\n📋 Verificando status do Git...', 'blue');
  const gitStatus = execCommand('git status --porcelain');
  
  if (gitStatus.success && gitStatus.output.trim()) {
    log('⚠️  Há alterações não commitadas:', 'yellow');
    log(gitStatus.output, 'yellow');
    log('   Recomendação: Faça commit das alterações antes do deploy', 'yellow');
    
    const response = await promptUser('Deseja continuar mesmo assim? (s/N): ');
    if (response.toLowerCase() !== 's') {
      log('❌ Deploy cancelado pelo usuário', 'red');
      process.exit(1);
    }
  } else {
    log('✅ Nenhuma alteração não commitada', 'green');
  }

  // 2. Executa validação de variáveis de ambiente
  log('\n📋 Validando variáveis de ambiente...', 'blue');
  const envValidation = execCommand('node scripts/validate-env.mjs');
  
  if (!envValidation.success) {
    log('❌ Validação de variáveis de ambiente falhou', 'red');
    log(envValidation.error, 'red');
    process.exit(1);
  }
  log('✅ Variáveis de ambiente validadas', 'green');

  // 3. Executa lint
  log('\n📋 Executando lint (TypeScript)...', 'blue');
  const lint = execCommand('npm run lint');
  
  if (!lint.success) {
    log('❌ Lint falhou', 'red');
    log(lint.error, 'red');
    process.exit(1);
  }
  log('✅ Lint passou', 'green');

  // 4. Executa testes
  log('\n📋 Executando testes...', 'blue');
  const test = execCommand('npm run test');
  
  if (!test.success) {
    log('❌ Testes falharam', 'red');
    log(test.error, 'red');
    process.exit(1);
  }
  log('✅ Testes passaram', 'green');

  log('\n✅ Todas as validações pré-deploy passaram!', 'green');
}

// =============================================================================
// BUILD
// =============================================================================

async function runBuild() {
  logSection('🔨 BUILD DO PROJETO');

  log('\n📦 Executando build de produção...', 'blue');
  const build = execCommand('npm run build', { timeout: CONFIG.vercelTimeout });
  
  if (!build.success) {
    log('❌ Build falhou', 'red');
    log(build.error, 'red');
    process.exit(1);
  }
  
  log('✅ Build concluído com sucesso', 'green');
  
  // Verifica tamanho do build
  try {
    const buildInfo = execCommand('du -sh dist', { stdio: 'pipe' });
    if (buildInfo.success) {
      log(`📊 Tamanho do build: ${buildInfo.output.trim()}`, 'blue');
    }
  } catch (e) {
    // Ignora se du não estiver disponível no Windows
  }
}

// =============================================================================
// DEPLOY VERCEL
// =============================================================================

async function deployToVercel(environment = 'production') {
  logSection('🚀 DEPLOY PARA VERCEL');

  const isPreview = environment === 'preview';
  const envFlag = isPreview ? '--prebuilt' : '--prod';
  
  log(`\n📦 Fazendo deploy para ${environment}...`, 'blue');
  log(`   Ambiente: ${environment}`, 'blue');
  
  let command = `vercel deploy ${envFlag} --yes`;
  
  if (isPreview) {
    // Para preview, usa a branch atual
    const branch = execCommand('git branch --show-current');
    if (branch.success) {
      command += ` --meta gitBranch="${branch.output.trim()}"`;
    }
  }

  const deploy = execCommand(command, { timeout: CONFIG.vercelTimeout });
  
  if (!deploy.success) {
    log('❌ Deploy para Vercel falhou', 'red');
    log(deploy.error, 'red');
    process.exit(1);
  }

  // Extrai URL do deploy
  const output = deploy.output;
  const urlMatch = output.match(/https?:\/\/[^\s]+\.vercel\.app/);
  
  if (urlMatch) {
    const deployUrl = urlMatch[0];
    log(`✅ Deploy concluído!`, 'green');
    log(`🌐 URL: ${deployUrl}`, 'cyan');
    return deployUrl;
  } else {
    log('⚠️  Deploy concluído mas não foi possível extrair a URL', 'yellow');
    log('   Verifique o dashboard do Vercel', 'yellow');
    return null;
  }
}

// =============================================================================
// DEPLOY FIREBASE
// =============================================================================

async function deployFirebase() {
  logSection('🔥 DEPLOY DAS REGRAS DO FIREBASE');

  log('\n📋 Verificando configuração do Firebase...', 'blue');
  
  // Verifica se firebase.json existe
  try {
    readFileSync('firebase.json');
  } catch (e) {
    log('⚠️  firebase.json não encontrado. Pulando deploy do Firebase.', 'yellow');
    return;
  }

  log('\n📦 Fazendo deploy das regras do Firestore...', 'blue');
  const firebaseDeploy = execCommand('firebase deploy --only firestore:rules', { 
    timeout: CONFIG.firebaseTimeout 
  });
  
  if (!firebaseDeploy.success) {
    log('❌ Deploy das regras do Firebase falhou', 'red');
    log(firebaseDeploy.error, 'red');
    log('⚠️  O deploy do Vercel foi concluído, mas as regras do Firebase não foram atualizadas', 'yellow');
    return;
  }
  
  log('✅ Regras do Firebase atualizadas com sucesso', 'green');
}

// =============================================================================
// MONITORAMENTO PÓS-DEPLOY
// =============================================================================

async function runPostDeployMonitoring(deployUrl) {
  logSection('📊 MONITORAMENTO PÓS-DEPLOY');

  if (!deployUrl) {
    log('⚠️  URL do deploy não disponível. Pulando monitoramento.', 'yellow');
    return;
  }

  log('\n📋 Iniciando monitoramento do sistema...', 'blue');
  log(`🌐 URL: ${deployUrl}`, 'blue');
  
  const monitor = execCommand(`node scripts/monitor-deploy.mjs --url ${deployUrl}`, { 
    timeout: 60000 
  });
  
  if (!monitor.success) {
    log('⚠️  Monitoramento encontrou problemas', 'yellow');
    log(monitor.error, 'yellow');
    log('   Verifique manualmente o sistema', 'yellow');
  } else {
    log('✅ Monitoramento concluído', 'green');
  }
}

// =============================================================================
// FUNÇÕES DE INTERAÇÃO
// =============================================================================

function promptUser(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    process.stdin.once('data', (data) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      resolve(data.toString().trim());
    });
  });
}

// =============================================================================
// RELATÓRIO FINAL
// =============================================================================

function generateFinalReport(deployUrl, environment) {
  logSection('📋 RELATÓRIO FINAL DO DEPLOY');

  log('\n✅ Deploy concluído com sucesso!', 'green');
  log(`\n📊 Detalhes:`, 'blue');
  log(`   Ambiente: ${environment}`, 'blue');
  log(`   Projeto: ${CONFIG.projectName}`, 'blue');
  
  if (deployUrl) {
    log(`   URL: ${deployUrl}`, 'cyan');
  }
  
  log('\n📝 Próximos passos:', 'cyan');
  log('   1. Teste o sistema manualmente', 'blue');
  log('   2. Verifique o dashboard do Vercel: https://vercel.com/dashboard', 'blue');
  log('   3. Verifique o Firebase Console: https://console.firebase.google.com', 'blue');
  log('   4. Monitore os logs e métricas', 'blue');
  
  if (environment === 'preview') {
    log('\n⚠️  Este é um deploy de preview. Para promover para produção:', 'yellow');
    log('   - Vá ao dashboard do Vercel', 'blue');
    log('   - Selecione este deployment', 'blue');
    log('   - Clique em "Promote to Production"', 'blue');
  }
  
  console.log('');
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  let environment = CONFIG.defaultEnvironment;
  let skipValidation = false;
  let skipMonitor = false;
  let firebaseOnly = false;
  
  // Parse argumentos
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--preview') {
      environment = 'preview';
    } else if (args[i] === '--production') {
      environment = 'production';
    } else if (args[i] === '--skip-validation') {
      skipValidation = true;
    } else if (args[i] === '--skip-monitor') {
      skipMonitor = true;
    } else if (args[i] === '--firebase-only') {
      firebaseOnly = true;
    } else if (args[i] === '--help') {
      console.log(`
USO: node scripts/deploy.mjs [opções]

OPÇÕES:
  --preview          Faz deploy em ambiente de preview
  --production       Faz deploy em produção (padrão)
  --skip-validation  Pula validações pré-deploy (não recomendado)
  --skip-monitor     Pula monitoramento pós-deploy
  --firebase-only    Faz deploy apenas das regras do Firebase
  --help             Mostra esta mensagem

EXEMPLOS:
  node scripts/deploy.mjs                           # Deploy em produção
  node scripts/deploy.mjs --preview                  # Deploy em preview
  node scripts/deploy.mjs --skip-validation          # Deploy sem validações
  node scripts/deploy.mjs --firebase-only            # Deploy apenas do Firebase

FLUXO DO DEPLOY:
  1. Validações pré-deploy (Git, env, lint, test)
  2. Build do projeto
  3. Deploy para Vercel
  4. Deploy das regras do Firebase
  5. Monitoramento pós-deploy
      `);
      process.exit(0);
    }
  }
  
  log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   🚀 SCRIPT DE DEPLOY AUTOMATIZADO                                        ║
║   Sistema E-commerce Sagrada Família                                     ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
  `, 'cyan');
  
  log(`\n📊 Configuração:`, 'blue');
  log(`   Ambiente: ${environment}`, 'blue');
  log(`   Projeto: ${CONFIG.projectName}`, 'blue');
  
  try {
    // Deploy apenas do Firebase
    if (firebaseOnly) {
      await deployFirebase();
      log('\n✅ Deploy do Firebase concluído!', 'green');
      process.exit(0);
    }
    
    // Validações pré-deploy
    if (!skipValidation) {
      await runPreDeployValidations();
    } else {
      log('\n⚠️  Validações pré-deploy puladas (--skip-validation)', 'yellow');
    }
    
    // Build
    await runBuild();
    
    // Deploy Vercel
    const deployUrl = await deployToVercel(environment);
    
    // Deploy Firebase
    await deployFirebase();
    
    // Monitoramento
    if (!skipMonitor) {
      await runPostDeployMonitoring(deployUrl);
    } else {
      log('\n⚠️  Monitoramento pós-deploy pulado (--skip-monitor)', 'yellow');
    }
    
    // Relatório final
    generateFinalReport(deployUrl, environment);
    
  } catch (error) {
    log(`\n❌ Erro fatal durante o deploy: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
