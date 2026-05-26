#!/usr/bin/env node
// =============================================================================
// validate-env.mjs — Valida variáveis de ambiente antes do deploy
// =============================================================================
// Este script verifica se todas as variáveis críticas estão configuradas
// corretamente no Vercel ou localmente antes de fazer deploy.
//
// USO:
//   node scripts/validate-env.mjs
//   node scripts/validate-env.mjs --vercel (valida via Vercel CLI)
//
// =============================================================================

import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// =============================================================================
// CONFIGURAÇÃO: Variáveis obrigatórias e opcionais
// =============================================================================

const REQUIRED_VARS = {
  // Frontend (VITE_*)
  frontend: [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_FIREBASE_VAPID_KEY',
    'VITE_WHATSAPP_BENEDITO_BENTES',
    'VITE_WHATSAPP_SALVADOR_LYRA',
    'VITE_WHATSAPP_VERGEL_DO_LAGO',
    'VITE_STORE_NAME',
    'VITE_IMGBB_API_KEY',
  ],
  // Backend (sem VITE_*)
  backend: [
    'FIREBASE_SERVICE_ACCOUNT_KEY',
    'APP_ENCRYPTION_KEY',
  ],
};

const OPTIONAL_VARS = [
  'VITE_APP_URL',
  'MP_ACCESS_TOKEN',
  'MP_WEBHOOK_SECRET',
  'VITE_DELIVERY_BASE_FEE',
  'VITE_DELIVERY_BASE_RADIUS_KM',
  'VITE_DELIVERY_PER_KM_FEE',
  'VITE_DELIVERY_MAX_RADIUS_KM',
  'VITE_FREE_SHIPPING_MIN_VALUE_ENABLED',
  'VITE_FREE_SHIPPING_MIN_VALUE',
  'VITE_STORE_OPEN_HOUR',
  'VITE_STORE_CLOSE_HOUR',
];

// =============================================================================
// VALIDADORES ESPECÍFICOS
// =============================================================================

const validators = {
  VITE_FIREBASE_API_KEY: (value) => {
    if (value.length < 30) return 'API Key muito curta (esperado ~39 caracteres)';
    return null;
  },
  
  VITE_FIREBASE_PROJECT_ID: (value) => {
    if (!/^[a-z0-9-]+$/.test(value)) return 'Project ID deve conter apenas letras minúsculas, números e hífens';
    return null;
  },
  
  VITE_FIREBASE_VAPID_KEY: (value) => {
    if (value.length < 80) return 'VAPID Key muito curta (esperado ~88 caracteres)';
    return null;
  },
  
  VITE_WHATSAPP_BENEDITO_BENTES: (value) => {
    if (!/^55\d{10,11}$/.test(value)) return 'Formato inválido. Esperado: 55 + DDD + número (ex: 5582999776895)';
    return null;
  },
  
  VITE_WHATSAPP_SALVADOR_LYRA: (value) => {
    if (!/^55\d{10,11}$/.test(value)) return 'Formato inválido. Esperado: 55 + DDD + número (ex: 5582999776895)';
    return null;
  },
  
  VITE_WHATSAPP_VERGEL_DO_LAGO: (value) => {
    if (!/^55\d{10,11}$/.test(value)) return 'Formato inválido. Esperado: 55 + DDD + número (ex: 5582999776895)';
    return null;
  },
  
  FIREBASE_SERVICE_ACCOUNT_KEY: (value) => {
    try {
      const parsed = JSON.parse(value);
      if (!parsed.type || parsed.type !== 'service_account') {
        return 'JSON inválido: campo "type" deve ser "service_account"';
      }
      if (!parsed.project_id) return 'JSON inválido: campo "project_id" ausente';
      if (!parsed.private_key) return 'JSON inválido: campo "private_key" ausente';
      if (!parsed.client_email) return 'JSON inválido: campo "client_email" ausente';
      return null;
    } catch (e) {
      return `JSON inválido: ${e.message}`;
    }
  },
  
  APP_ENCRYPTION_KEY: (value) => {
    if (!/^[a-fA-F0-9]{64}$/.test(value)) {
      return 'Deve ser uma string hexadecimal de 64 caracteres (32 bytes). Gere com: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"';
    }
    return null;
  },
  
  VITE_IMGBB_API_KEY: (value) => {
    if (value.length < 20) return 'API Key muito curta (esperado ~32 caracteres)';
    return null;
  },
  
  VITE_APP_URL: (value) => {
    if (value && !value.startsWith('http')) return 'Deve começar com http:// ou https://';
    return null;
  },
};

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logSection(title) {
  console.log('');
  log(`${'='.repeat(80)}`, 'cyan');
  log(`  ${title}`, 'bold');
  log(`${'='.repeat(80)}`, 'cyan');
}

function loadEnvFromFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const env = {};
    
    content.split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match) {
        let value = match[2].trim();
        // Remove aspas se existirem
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        env[match[1]] = value;
      }
    });
    
    return env;
  } catch (e) {
    return null;
  }
}

function loadEnvFromVercel() {
  try {
    log('Buscando variáveis do Vercel...', 'blue');
    const output = execSync('vercel env pull .env.vercel.temp --yes', { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const env = loadEnvFromFile('.env.vercel.temp');
    
    // Limpa arquivo temporário
    try {
      execSync('del .env.vercel.temp', { stdio: 'ignore' });
    } catch (e) {
      // Ignora erro ao deletar
    }
    
    return env;
  } catch (e) {
    log(`⚠️  Erro ao buscar variáveis do Vercel: ${e.message}`, 'yellow');
    log('   Certifique-se de que o Vercel CLI está instalado e autenticado:', 'yellow');
    log('   npm i -g vercel && vercel login', 'yellow');
    return null;
  }
}

function validateVar(name, value) {
  const errors = [];
  const warnings = [];
  
  // Verifica se está vazia
  if (!value || value.trim() === '') {
    errors.push('Variável não definida ou vazia');
    return { errors, warnings };
  }
  
  // Verifica se é placeholder
  const placeholders = [
    '<COLE AQUI',
    'your-',
    'YOUR_',
    'exemplo',
    'EXEMPLO',
    'test',
    'TEST',
  ];
  
  if (placeholders.some(p => value.includes(p))) {
    errors.push('Valor parece ser um placeholder. Configure com valor real.');
    return { errors, warnings };
  }
  
  // Validação específica
  if (validators[name]) {
    const error = validators[name](value);
    if (error) {
      errors.push(error);
    }
  }
  
  // Aviso para variáveis VITE_ em backend
  if (name.startsWith('VITE_') && ['FIREBASE_SERVICE_ACCOUNT_KEY', 'APP_ENCRYPTION_KEY', 'MP_ACCESS_TOKEN'].includes(name)) {
    warnings.push('⚠️  Variável de backend não deve ter prefixo VITE_');
  }
  
  return { errors, warnings };
}

// =============================================================================
// VALIDAÇÃO PRINCIPAL
// =============================================================================

function validateEnvironment(env, source = 'local') {
  logSection(`Validando Variáveis de Ambiente (${source})`);
  
  let totalErrors = 0;
  let totalWarnings = 0;
  let missingVars = 0;
  
  // Valida variáveis obrigatórias
  log('\n📋 VARIÁVEIS OBRIGATÓRIAS:', 'bold');
  
  ['frontend', 'backend'].forEach(category => {
    log(`\n  ${category.toUpperCase()}:`, 'cyan');
    
    REQUIRED_VARS[category].forEach(varName => {
      const value = env[varName];
      const { errors, warnings } = validateVar(varName, value);
      
      if (!value || value.trim() === '') {
        log(`    ❌ ${varName}: AUSENTE`, 'red');
        missingVars++;
        totalErrors++;
      } else if (errors.length > 0) {
        log(`    ❌ ${varName}: INVÁLIDA`, 'red');
        errors.forEach(err => log(`       → ${err}`, 'red'));
        totalErrors += errors.length;
      } else {
        const preview = value.length > 40 ? value.substring(0, 40) + '...' : value;
        log(`    ✅ ${varName}: ${preview}`, 'green');
      }
      
      if (warnings.length > 0) {
        warnings.forEach(warn => log(`       ${warn}`, 'yellow'));
        totalWarnings += warnings.length;
      }
    });
  });
  
  // Valida variáveis opcionais
  log('\n\n📋 VARIÁVEIS OPCIONAIS:', 'bold');
  
  OPTIONAL_VARS.forEach(varName => {
    const value = env[varName];
    
    if (!value || value.trim() === '') {
      log(`    ⚪ ${varName}: não configurada (opcional)`, 'yellow');
    } else {
      const { errors, warnings } = validateVar(varName, value);
      
      if (errors.length > 0) {
        log(`    ⚠️  ${varName}: INVÁLIDA`, 'yellow');
        errors.forEach(err => log(`       → ${err}`, 'yellow'));
        totalWarnings += errors.length;
      } else {
        const preview = value.length > 40 ? value.substring(0, 40) + '...' : value;
        log(`    ✅ ${varName}: ${preview}`, 'green');
      }
      
      if (warnings.length > 0) {
        warnings.forEach(warn => log(`       ${warn}`, 'yellow'));
        totalWarnings += warnings.length;
      }
    }
  });
  
  // Resumo
  logSection('RESUMO DA VALIDAÇÃO');
  
  log(`\n  Total de variáveis obrigatórias: ${REQUIRED_VARS.frontend.length + REQUIRED_VARS.backend.length}`, 'blue');
  log(`  Total de variáveis opcionais: ${OPTIONAL_VARS.length}`, 'blue');
  log(`  Variáveis ausentes: ${missingVars}`, missingVars > 0 ? 'red' : 'green');
  log(`  Erros encontrados: ${totalErrors}`, totalErrors > 0 ? 'red' : 'green');
  log(`  Avisos: ${totalWarnings}`, totalWarnings > 0 ? 'yellow' : 'green');
  
  console.log('');
  
  if (totalErrors > 0) {
    log('❌ VALIDAÇÃO FALHOU! Corrija os erros acima antes de fazer deploy.', 'red');
    return false;
  } else if (totalWarnings > 0) {
    log('⚠️  VALIDAÇÃO PASSOU COM AVISOS. Revise os avisos acima.', 'yellow');
    return true;
  } else {
    log('✅ VALIDAÇÃO PASSOU! Todas as variáveis estão configuradas corretamente.', 'green');
    return true;
  }
}

// =============================================================================
// MAIN
// =============================================================================

function main() {
  const args = process.argv.slice(2);
  const useVercel = args.includes('--vercel');
  
  log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   🔍 VALIDADOR DE VARIÁVEIS DE AMBIENTE                                  ║
║   Sistema E-commerce Sagrada Família                                     ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
  `, 'cyan');
  
  let env = null;
  
  if (useVercel) {
    env = loadEnvFromVercel();
    if (!env) {
      log('\n❌ Não foi possível carregar variáveis do Vercel.', 'red');
      process.exit(1);
    }
  } else {
    // Tenta carregar de .env.local primeiro, depois .env
    env = loadEnvFromFile('.env.local') || loadEnvFromFile('.env');
    
    if (!env) {
      log('\n⚠️  Nenhum arquivo .env.local ou .env encontrado.', 'yellow');
      log('   Criando validação baseada em variáveis de ambiente do sistema...', 'yellow');
      env = process.env;
    } else {
      log('\n✅ Arquivo .env carregado com sucesso.', 'green');
    }
  }
  
  const isValid = validateEnvironment(env, useVercel ? 'Vercel' : 'Local');
  
  if (!isValid) {
    process.exit(1);
  }
  
  log('\n💡 PRÓXIMOS PASSOS:', 'cyan');
  log('   1. Se validação passou, você pode fazer deploy com segurança', 'blue');
  log('   2. Para validar variáveis do Vercel: node scripts/validate-env.mjs --vercel', 'blue');
  log('   3. Para monitorar após deploy: node scripts/monitor-deploy.mjs', 'blue');
  console.log('');
}

main();
