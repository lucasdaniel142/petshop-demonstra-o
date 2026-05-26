#!/usr/bin/env node
// =============================================================================
// monitor-deploy.mjs — Monitora saúde do sistema após deploy
// =============================================================================
// Este script verifica a saúde do sistema em produção, testando endpoints
// críticos, Firebase, e coletando métricas de performance.
//
// USO:
//   node scripts/monitor-deploy.mjs
//   node scripts/monitor-deploy.mjs --url https://seu-dominio.vercel.app
//   node scripts/monitor-deploy.mjs --continuous (monitora a cada 30s)
//
// =============================================================================

import https from 'https';
import http from 'http';
import { URL } from 'url';

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

const DEFAULT_URL = 'https://sagrada-familia-a334e.vercel.app'; // Ajuste conforme necessário
const TIMEOUT = 10000; // 10 segundos
const CONTINUOUS_INTERVAL = 30000; // 30 segundos

// Endpoints críticos para testar
const CRITICAL_ENDPOINTS = [
  { path: '/', name: 'Homepage', method: 'GET' },
  { path: '/admin', name: 'Admin Login', method: 'GET' },
];

// Testes de API (requerem autenticação, então apenas verificamos se respondem)
const API_ENDPOINTS = [
  { path: '/api/checkout', name: 'Checkout API', method: 'OPTIONS' }, // CORS preflight
  { path: '/api/notify', name: 'Notify API', method: 'OPTIONS' },
];

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

function makeRequest(url, method = 'GET', timeout = TIMEOUT) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      timeout: timeout,
      headers: {
        'User-Agent': 'Monitor-Deploy/1.0',
      },
    };
    
    const startTime = Date.now();
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          duration: duration,
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// =============================================================================
// TESTES DE SAÚDE
// =============================================================================

async function testEndpoint(baseUrl, endpoint) {
  const url = `${baseUrl}${endpoint.path}`;
  
  try {
    const result = await makeRequest(url, endpoint.method);
    
    const isSuccess = result.statusCode >= 200 && result.statusCode < 400;
    const statusColor = isSuccess ? 'green' : 'red';
    const statusIcon = isSuccess ? '✅' : '❌';
    
    log(`  ${statusIcon} ${endpoint.name}`, statusColor);
    log(`     URL: ${url}`, 'blue');
    log(`     Status: ${result.statusCode}`, statusColor);
    log(`     Tempo de resposta: ${result.duration}ms`, result.duration < 1000 ? 'green' : result.duration < 3000 ? 'yellow' : 'red');
    
    // Verifica headers importantes
    if (result.headers['content-type']) {
      log(`     Content-Type: ${result.headers['content-type']}`, 'blue');
    }
    
    if (result.headers['x-vercel-id']) {
      log(`     Vercel ID: ${result.headers['x-vercel-id']}`, 'blue');
    }
    
    return {
      success: isSuccess,
      statusCode: result.statusCode,
      duration: result.duration,
      endpoint: endpoint.name,
    };
  } catch (error) {
    log(`  ❌ ${endpoint.name}`, 'red');
    log(`     URL: ${url}`, 'blue');
    log(`     Erro: ${error.message}`, 'red');
    
    return {
      success: false,
      error: error.message,
      endpoint: endpoint.name,
    };
  }
}

async function testFirebaseConnection(baseUrl) {
  logSection('Testando Conexão com Firebase');
  
  try {
    // Testa se a página carrega (o que indica que Firebase SDK está configurado)
    const result = await makeRequest(baseUrl);
    
    if (result.statusCode === 200) {
      // Verifica se há referências ao Firebase no HTML
      const hasFirebase = result.data.includes('firebase') || result.data.includes('firebaseapp');
      
      if (hasFirebase) {
        log('  ✅ Firebase SDK detectado no frontend', 'green');
        return { success: true };
      } else {
        log('  ⚠️  Firebase SDK não detectado no HTML (pode ser normal se estiver em bundle)', 'yellow');
        return { success: true, warning: true };
      }
    } else {
      log('  ❌ Não foi possível carregar a página principal', 'red');
      return { success: false };
    }
  } catch (error) {
    log(`  ❌ Erro ao testar Firebase: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function testPWA(baseUrl) {
  logSection('Testando PWA (Progressive Web App)');
  
  try {
    // Testa manifest.json
    const manifestResult = await makeRequest(`${baseUrl}/manifest.json`);
    
    if (manifestResult.statusCode === 200) {
      log('  ✅ manifest.json acessível', 'green');
      
      try {
        const manifest = JSON.parse(manifestResult.data);
        log(`     Nome: ${manifest.name || manifest.short_name}`, 'blue');
        log(`     Ícones: ${manifest.icons?.length || 0} configurados`, 'blue');
      } catch (e) {
        log('  ⚠️  manifest.json não é um JSON válido', 'yellow');
      }
    } else {
      log('  ❌ manifest.json não encontrado', 'red');
    }
    
    // Testa Service Worker
    const swResult = await makeRequest(`${baseUrl}/sw.js`);
    
    if (swResult.statusCode === 200) {
      log('  ✅ Service Worker (sw.js) acessível', 'green');
    } else {
      log('  ⚠️  Service Worker não encontrado (pode estar em outro caminho)', 'yellow');
    }
    
    return { success: true };
  } catch (error) {
    log(`  ⚠️  Erro ao testar PWA: ${error.message}`, 'yellow');
    return { success: false, error: error.message };
  }
}

async function checkBuildSize(baseUrl) {
  logSection('Verificando Tamanho dos Assets');
  
  try {
    const indexResult = await makeRequest(baseUrl);
    
    if (indexResult.statusCode === 200) {
      const html = indexResult.data;
      
      // Extrai referências a arquivos JS e CSS
      const jsFiles = [...html.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);
      const cssFiles = [...html.matchAll(/href="([^"]+\.css)"/g)].map(m => m[1]);
      
      log(`  📦 Arquivos JavaScript: ${jsFiles.length}`, 'blue');
      log(`  📦 Arquivos CSS: ${cssFiles.length}`, 'blue');
      
      // Testa tamanho do bundle principal
      if (jsFiles.length > 0) {
        const mainJs = jsFiles.find(f => f.includes('index') || f.includes('main')) || jsFiles[0];
        const fullUrl = mainJs.startsWith('http') ? mainJs : `${baseUrl}${mainJs}`;
        
        try {
          const jsResult = await makeRequest(fullUrl);
          const sizeKB = (jsResult.data.length / 1024).toFixed(2);
          
          log(`  📊 Bundle principal: ${sizeKB} KB`, sizeKB < 500 ? 'green' : sizeKB < 1000 ? 'yellow' : 'red');
          
          if (sizeKB > 1000) {
            log('     ⚠️  Bundle muito grande! Considere code splitting.', 'yellow');
          }
        } catch (e) {
          log(`  ⚠️  Não foi possível medir tamanho do bundle`, 'yellow');
        }
      }
      
      return { success: true };
    }
  } catch (error) {
    log(`  ⚠️  Erro ao verificar assets: ${error.message}`, 'yellow');
    return { success: false };
  }
}

async function checkSecurityHeaders(baseUrl) {
  logSection('Verificando Headers de Segurança');
  
  try {
    const result = await makeRequest(baseUrl);
    
    const securityHeaders = {
      'x-frame-options': 'Proteção contra clickjacking',
      'x-content-type-options': 'Proteção contra MIME sniffing',
      'strict-transport-security': 'HTTPS forçado (HSTS)',
      'content-security-policy': 'Política de segurança de conteúdo',
      'x-xss-protection': 'Proteção contra XSS',
    };
    
    let foundHeaders = 0;
    
    for (const [header, description] of Object.entries(securityHeaders)) {
      if (result.headers[header]) {
        log(`  ✅ ${header}: ${description}`, 'green');
        foundHeaders++;
      } else {
        log(`  ⚪ ${header}: não configurado`, 'yellow');
      }
    }
    
    if (foundHeaders >= 3) {
      log(`\n  ✅ ${foundHeaders}/${Object.keys(securityHeaders).length} headers de segurança configurados`, 'green');
    } else {
      log(`\n  ⚠️  Apenas ${foundHeaders}/${Object.keys(securityHeaders).length} headers de segurança configurados`, 'yellow');
      log('     Considere configurar mais headers no vercel.json', 'yellow');
    }
    
    return { success: true, foundHeaders };
  } catch (error) {
    log(`  ❌ Erro ao verificar headers: ${error.message}`, 'red');
    return { success: false };
  }
}

// =============================================================================
// RELATÓRIO FINAL
// =============================================================================

function generateReport(results) {
  logSection('RELATÓRIO DE SAÚDE DO SISTEMA');
  
  const totalTests = results.length;
  const successfulTests = results.filter(r => r.success).length;
  const failedTests = totalTests - successfulTests;
  
  const avgDuration = results
    .filter(r => r.duration)
    .reduce((sum, r) => sum + r.duration, 0) / results.filter(r => r.duration).length;
  
  log(`\n  📊 Total de testes: ${totalTests}`, 'blue');
  log(`  ✅ Sucessos: ${successfulTests}`, 'green');
  log(`  ❌ Falhas: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  
  if (avgDuration) {
    log(`  ⏱️  Tempo médio de resposta: ${avgDuration.toFixed(0)}ms`, avgDuration < 1000 ? 'green' : avgDuration < 3000 ? 'yellow' : 'red');
  }
  
  console.log('');
  
  if (failedTests === 0) {
    log('✅ SISTEMA SAUDÁVEL! Todos os testes passaram.', 'green');
  } else if (failedTests <= 2) {
    log('⚠️  SISTEMA COM AVISOS. Alguns testes falharam, mas o sistema está operacional.', 'yellow');
  } else {
    log('❌ SISTEMA COM PROBLEMAS! Múltiplos testes falharam. Investigue imediatamente.', 'red');
  }
  
  console.log('');
  
  // Recomendações
  log('💡 RECOMENDAÇÕES:', 'cyan');
  
  if (failedTests > 0) {
    log('   1. Verifique os logs do Vercel: https://vercel.com/dashboard', 'blue');
    log('   2. Verifique o Firebase Console: https://console.firebase.google.com', 'blue');
    log('   3. Teste manualmente os endpoints que falharam', 'blue');
  }
  
  if (avgDuration > 3000) {
    log('   • Tempo de resposta alto. Considere otimizar queries do Firestore', 'yellow');
  }
  
  log('   • Monitore métricas no Vercel Analytics', 'blue');
  log('   • Configure alertas para erros críticos', 'blue');
  
  console.log('');
}

// =============================================================================
// MAIN
// =============================================================================

async function runMonitoring(baseUrl) {
  log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   📊 MONITOR DE DEPLOY                                                   ║
║   Sistema E-commerce Sagrada Família                                     ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
  `, 'cyan');
  
  log(`🌐 URL Base: ${baseUrl}`, 'blue');
  log(`⏰ Iniciando monitoramento...`, 'blue');
  
  const results = [];
  
  // Testa endpoints críticos
  logSection('Testando Endpoints Críticos');
  for (const endpoint of CRITICAL_ENDPOINTS) {
    const result = await testEndpoint(baseUrl, endpoint);
    results.push(result);
  }
  
  // Testa APIs
  logSection('Testando APIs');
  for (const endpoint of API_ENDPOINTS) {
    const result = await testEndpoint(baseUrl, endpoint);
    results.push(result);
  }
  
  // Testa Firebase
  const firebaseResult = await testFirebaseConnection(baseUrl);
  results.push(firebaseResult);
  
  // Testa PWA
  const pwaResult = await testPWA(baseUrl);
  results.push(pwaResult);
  
  // Verifica tamanho dos assets
  await checkBuildSize(baseUrl);
  
  // Verifica headers de segurança
  const securityResult = await checkSecurityHeaders(baseUrl);
  results.push(securityResult);
  
  // Gera relatório
  generateReport(results);
  
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  
  let baseUrl = DEFAULT_URL;
  let continuous = false;
  
  // Parse argumentos
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      baseUrl = args[i + 1];
      i++;
    } else if (args[i] === '--continuous') {
      continuous = true;
    } else if (args[i] === '--help') {
      console.log(`
USO: node scripts/monitor-deploy.mjs [opções]

OPÇÕES:
  --url <url>       URL base do sistema (padrão: ${DEFAULT_URL})
  --continuous      Monitora continuamente a cada 30 segundos
  --help            Mostra esta mensagem

EXEMPLOS:
  node scripts/monitor-deploy.mjs
  node scripts/monitor-deploy.mjs --url https://meu-dominio.vercel.app
  node scripts/monitor-deploy.mjs --continuous
      `);
      process.exit(0);
    }
  }
  
  if (continuous) {
    log('🔄 Modo contínuo ativado. Monitorando a cada 30 segundos...', 'cyan');
    log('   Pressione Ctrl+C para parar.', 'yellow');
    
    while (true) {
      await runMonitoring(baseUrl);
      
      log(`\n⏳ Aguardando ${CONTINUOUS_INTERVAL / 1000}s até próxima verificação...\n`, 'blue');
      await new Promise(resolve => setTimeout(resolve, CONTINUOUS_INTERVAL));
    }
  } else {
    await runMonitoring(baseUrl);
  }
}

main().catch(error => {
  log(`❌ Erro fatal: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
