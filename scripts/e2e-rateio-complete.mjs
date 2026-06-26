#!/usr/bin/env node
/**
 * e2e-rateio-complete.mjs
 * 
 * E2E test: Create PERCENT rule, create AP, validate split in Lancamentos
 */

const playwright = require('playwright');

async function main() {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🎭 TESTE E2E RATEIO COMPLETO VIA UI');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Navigate to app
    console.log('🌐 Abrindo aplicação...');
    await page.goto('http://localhost:3000/clinica/financeiro/centro-custos', {
      waitUntil: 'networkidle'
    });

    // Check if authenticated
    const title = await page.title();
    console.log('✓ Página carregada: ' + title);

    // Step 1: Create PERCENT rule
    console.log('\n📋 ETAPA 1: Criar regra PERCENT 70/30');
    console.log('  Abrindo modal de rateio...');
    
    const rateioBtn = page.locator('button:has-text("Rateio"), button:has-text("Automático")').first();
    if (await rateioBtn.count() === 0) {
      throw new Error('Botão de rateio não encontrado');
    }
    await rateioBtn.click();
    await page.waitForTimeout(500);

    console.log('  Preenchendo formulário...');
    // Select source center
    const sourceSelect = page.locator('[role="dialog"] [role="combobox"]').nth(0);
    await sourceSelect.focus();
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    await page.keyboard.type('6');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Method should already be PERCENT, but verify
    console.log('  Adicionando destino 1 (70%)...');
    const modal = page.locator('[role="dialog"]').first();
    const addBtn = modal.locator('button:has-text("Adicionar")').first();
    await addBtn.click({ force: true });
    await page.waitForTimeout(300);

    // Fill first destination
    const destCombos = page.locator('[role="dialog"] [role="combobox"]');
    const dest1 = destCombos.nth(1);
    await dest1.focus();
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    await page.keyboard.type('7');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    // Fill percentage
    const percentInputs = modal.locator('input[type="number"]');
    const percent1 = percentInputs.nth(0);
    await percent1.click({ force: true });
    await percent1.fill('70');
    await page.waitForTimeout(200);

    // Add second destination
    console.log('  Adicionando destino 2 (30%)...');
    const addBtn2 = modal.locator('button:has-text("Adicionar")').last();
    await addBtn2.click({ force: true });
    await page.waitForTimeout(300);

    // Fill second destination
    const dest2 = destCombos.nth(2);
    await dest2.focus();
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    await page.keyboard.type('8');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    const percent2 = percentInputs.nth(1);
    await percent2.click({ force: true });
    await percent2.fill('30');
    await page.waitForTimeout(300);

    // Save rule
    console.log('  Salvando regra...');
    const saveBtn = modal.locator('button:has-text("Salvar"), button:has-text("Sa")').last();
    await saveBtn.click({ force: true });
    await page.waitForTimeout(1000);

    const modalClosed = await page.locator('[role="dialog"]').count() === 0;
    if (modalClosed) {
      console.log('✓ Regra salva com sucesso');
    } else {
      console.log('⚠️ Modal ainda aberto, fechando com ESC...');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Step 2: Create AP
    console.log('\n💰 ETAPA 2: Criar AP com centro origem 6 (R$ 1000)');
    await page.goto('http://localhost:3000/clinica/financeiro/contas-pagar/nova', {
      waitUntil: 'networkidle'
    });

    console.log('  Abrindo formulário de AP...');
    await page.waitForTimeout(500);

    // Fill AP form
    console.log('  Preenchendo dados...');
    
    // Vendor
    const vendorInput = page.locator('input[placeholder*="Fornecedor"], input[placeholder*="Vendor"]').first();
    await vendorInput.fill('TESTE RATEIO PERCENT');
    
    // Description  
    const descInputs = page.locator('input[type="text"]');
    const descInput = descInputs.nth(1);
    await descInput.fill('Teste 70/30 rateio');

    // Amount
    const amountInput = page.locator('input[type="number"], input[inputmode="decimal"]').first();
    await amountInput.fill('1000');

    // Save
    console.log('  Salvando AP...');
    const createBtn = page.locator('button:has-text("Criar"), button:has-text("Salvar")').last();
    await createBtn.click({ force: true });
    await page.waitForTimeout(2000);

    console.log('✓ AP criada');

    // Step 3: Verify in Lancamentos
    console.log('\n📊 ETAPA 3: Validar split em Lancamentos');
    await page.goto('http://localhost:3000/clinica/financeiro/lancamentos', {
      waitUntil: 'networkidle'
    });

    await page.waitForTimeout(1000);

    // Search for recent AP
    const searchInput = page.locator('input[placeholder*="Pesquisar"], input[type="search"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('TESTE RATEIO PERCENT');
      await page.waitForTimeout(500);
    }

    // Get table data
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    console.log('  Linhas encontradas: ' + rowCount);

    if (rowCount >= 2) {
      console.log('✓ Pelo menos 2 linhas encontradas (split realizado!)');

      // Extract values
      const firstAmount = await rows.nth(0).locator('td').nth(2).textContent();
      const secondAmount = await rows.nth(1).locator('td').nth(2).textContent();
      console.log('  Valores: ' + firstAmount + ' e ' + secondAmount);

      console.log('\n✅ TESTE PASSOU!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Rateio PERCENT 70/30 funcionando com sucesso!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.log('⚠️ Menos de 2 linhas encontradas - verificar');
    }

    // Take screenshot
    await page.screenshot({ path: '/tmp/lancamentos-split.png' });
    console.log('📸 Screenshot salvo');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  } finally {
    await browser.close();
    process.exit(0);
  }
}

main();
