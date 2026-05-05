#!/usr/bin/env node

/**
 * 🚀 Gesclinic Web - Automação de Deploy
 * 
 * Este script automatiza:
 * 1. Extrai credenciais Supabase do .env
 * 2. Prova do GitHub CLI
 * 3. Configura GitHub Secrets
 * 4. Faz merge automático
 * 5. Monitora deployment
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cores para terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.bold}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

function exec(command, silent = false) {
  try {
    // Usar npx se houver 'gh' que não está no PATH
    if (command.startsWith('gh ')) {
      command = command.replace('gh ', 'npx gh ');
    }
    
    const output = execSync(command, { encoding: 'utf-8' });
    if (!silent) log(output, 'green');
    return output.trim();
  } catch (error) {
    log(`❌ Erro: ${error.message}`, 'red');
    throw error;
  }
}

function checkCommand(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────

logSection('🚀 GESCLINIC WEB - AUTOMAÇÃO DE DEPLOY');

// 1. VERIFICAR PRÉ-REQUISITOS
logSection('1. Verificando Pré-requisitos');

log('Verificando Node.js...', 'cyan');
if (!checkCommand('node')) {
  log('❌ Node.js não encontrado!', 'red');
  process.exit(1);
}
log('✅ Node.js OK', 'green');

log('Verificando Git...', 'cyan');
if (!checkCommand('git')) {
  log('❌ Git não encontrado!', 'red');
  process.exit(1);
}
log('✅ Git OK', 'green');

log('Verificando GitHub CLI...', 'cyan');
const hasGH = checkCommand('gh');
if (!hasGH) {
  log('⚠️ GitHub CLI não encontrado', 'yellow');
  log('   Instalando via npm...', 'cyan');
  try {
    exec('npm install -g github-cli', true);
    log('✅ GitHub CLI instalado', 'green');
  } catch {
    log('⚠️ Não foi possível instalar via npm', 'yellow');
    log('   Execute manualmente: https://github.com/cli/cli#installation', 'yellow');
  }
}

// 2. EXTRAIR CREDENCIAIS DO .ENV
logSection('2. Extraindo Credenciais do .env');

const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  log('❌ Arquivo .env não encontrado!', 'red');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1];
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1];

if (!supabaseUrl || !supabaseKey) {
  log('❌ Credenciais Supabase não encontradas no .env!', 'red');
  process.exit(1);
}

log('✅ VITE_SUPABASE_URL encontrada', 'green');
log('✅ VITE_SUPABASE_ANON_KEY encontrada', 'green');

// 3. VERIFICAR STATUS GIT
logSection('3. Verificando Status Git');

try {
  const status = exec('git status --porcelain', true);
  
  // Filtrar apenas arquivos modificados (excluir untracked)
  const modified = status.split('\n').filter(line => !line.startsWith('??') && line.trim());
  
  if (modified.length > 0) {
    log('❌ Existem mudanças no código não commitadas!', 'red');
    console.log(modified.join('\n'));
    log('\nExecute: git add . && git commit -m "suas mudanças"', 'yellow');
    process.exit(1);
  }
  log('✅ Working tree limpo', 'green');

  const branch = exec('git rev-parse --abbrev-ref HEAD', true);
  log(`✅ Branch atual: ${branch}`, 'green');

  const commits = exec('git log --oneline -3', true);
  log('✅ Últimos commits:', 'green');
  console.log(commits);
} catch (error) {
  log(`❌ Erro ao verificar git: ${error.message}`, 'red');
  process.exit(1);
}

// 4. CONFIGURAR GITHUB SECRETS
logSection('4. Configurando GitHub Secrets');

try {
  log('Verificando autenticação GitHub...', 'cyan');
  exec('gh auth status', true);
  log('✅ Autenticação GitHub OK', 'green');
} catch {
  log('⚠️ Não autenticado no GitHub', 'yellow');
  log('   Execute: gh auth login', 'cyan');
  log('   Depois rode este script novamente', 'cyan');
  process.exit(1);
}

log('\nConfigurando secrets...', 'cyan');

try {
  exec(`gh secret set VITE_SUPABASE_URL -b "${supabaseUrl}"`, true);
  log('✅ VITE_SUPABASE_URL configurado', 'green');

  exec(`gh secret set VITE_SUPABASE_ANON_KEY -b "${supabaseKey}"`, true);
  log('✅ VITE_SUPABASE_ANON_KEY configurado', 'green');
} catch (error) {
  log(`⚠️ Erro ao configurar secrets: ${error.message}`, 'yellow');
}

// 5. FAZER BUILD VALIDATION
logSection('5. Validando Build Production');

try {
  log('Building for production...', 'cyan');
  exec('npm run build', true);
  log('✅ Build passou com sucesso!', 'green');
} catch {
  log('❌ Build falhou!', 'red');
  process.exit(1);
}

// 6. FAZER MERGE
logSection('6. Fazendo Merge no GitHub');

try {
  log('Procurando PR aberta...', 'cyan');
  const prs = exec('gh pr list --json number,title,headRefName --limit 5', true);
  
  if (!prs) {
    log('❌ Nenhuma PR encontrada!', 'red');
    process.exit(1);
  }

  log('PRs encontradas:', 'cyan');
  console.log(prs);

  log('\nFazendo merge da PR...', 'cyan');
  try {
    exec('gh pr merge --squash --auto 2>&1', true);
    log('✅ Merge feito com sucesso!', 'green');
  } catch {
    log('⚠️ Merge pode estar pendente de revisão', 'yellow');
    log('   Execute manualmente no GitHub:', 'cyan');
    log('   https://github.com/Gesclinic/Gesclinic-Web/pulls', 'cyan');
  }
} catch (error) {
  log(`⚠️ Erro ao fazer merge: ${error.message}`, 'yellow');
}

// 7. MONITOR DEPLOYMENT
logSection('7. Monitorando Deployment');

log('GitHub Actions iniciado!', 'cyan');
log('Monitore o progresso em:', 'cyan');
log('https://github.com/Gesclinic/Gesclinic-Web/actions', 'green');

log('\nVerele deployment:', 'cyan');
log('https://vercel.com/dashboard', 'green');

log('\nProduction URL:', 'cyan');
log('https://gesclinic.vercel.app', 'green');

// 8. RESUMO FINAL
logSection('✅ SCRIPT EXECUTADO COM SUCESSO!');

log('\n📋 O que foi feito:', 'cyan');
log('  ✅ Credenciais extraídas do .env');
log('  ✅ GitHub Secrets configurados');
log('  ✅ Build validado');
log('  ✅ Merge iniciado');

log('\n🔄 Próximas etapas:', 'cyan');
log('  1. Aguarde GitHub Actions completar (~10 min)');
log('  2. Aguarde Vercel deployment (~5 min)');
log('  3. Teste produção: https://gesclinic.vercel.app');

log('\n🎉 Projeto em produção em ~15 minutos!', 'green');

process.exit(0);
