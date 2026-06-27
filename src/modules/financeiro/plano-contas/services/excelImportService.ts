/**
 * Excel Import Service
 * Handles parsing and validation of Excel files for bulk imports
 */

import { ChartOfAccountCreateInput } from '../types';

/**
 * Validate hierarchical relationship between child code and parent code
 * Example: 1.2.1 must have parent 1.2, 1.2 must have parent 1
 */
function validateCodeHierarchy(childCode: string, parentCode: string | null | undefined): void {
  if (!parentCode) {
    // No parent: child code must be single digit (1, 2, 3, etc.)
    if (!/^\d+$/.test(childCode)) {
      throw new Error(
        `Código raiz inválido: "${childCode}". Contas de nível superior devem ser números simples (1, 2, 3, etc.)`
      );
    }
    return;
  }

  // Extract parent code from child code by removing last segment
  const childParts = childCode.split('.');
  const expectedParentCode = childParts.slice(0, -1).join('.') || childParts[0];

  if (expectedParentCode !== parentCode) {
    throw new Error(
      `Hierarquia de código inválida: ${childCode} (pai esperado: ${expectedParentCode}, informado: ${parentCode}). ` +
      `A estrutura de códigos deve seguir: 1 > 1.1 > 1.1.1`
    );
  }
}

/**
 * Parse Chart of Accounts from Excel file
 */
export async function parseChartOfAccountsExcel(
  fileData: ArrayBuffer
): Promise<ChartOfAccountCreateInput[]> {
  // Dynamic import of xlsx library
  const XLSX = await import('xlsx');
  
  const workbook = XLSX.read(new Uint8Array(fileData), { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  
  if (!worksheet) {
    throw new Error('Nenhuma aba encontrada no arquivo Excel');
  }

  // Parse with headers
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  if (!data || data.length === 0) {
    throw new Error('Nenhum dado encontrado no arquivo');
  }

  // Validate and transform data
  const accounts: ChartOfAccountCreateInput[] = [];
  const errors: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i] as any;
    const rowNum = i + 2; // +2 because +1 for header, +1 for 1-based indexing

    try {
      // Validate required fields
      if (!row.Código || !row.Nome || !row.Tipo || !row.Natureza) {
        throw new Error(
          'Campos obrigatórios faltando: Código, Nome, Tipo, Natureza'
        );
      }

      // Validate type
      const validTypes = ['RECEITA', 'DESPESA', 'ATIVO', 'PASSIVO', 'PATRIMONIO', 'CUSTO', 'DEDUCAO', 'HONORARIO', 'INVESTIMENTO'];
      if (!validTypes.includes(String(row.Tipo).toUpperCase())) {
        throw new Error(
          `Tipo inválido: ${row.Tipo}. Deve ser: ${validTypes.join(', ')}`
        );
      }

      // Validate nature
      const validNatures = ['CREDORA', 'DEVEDORA'];
      if (!validNatures.includes(String(row.Natureza).toUpperCase())) {
        throw new Error(
          `Natureza inválida: ${row.Natureza}. Deve ser: ${validNatures.join(', ')}`
        );
      }

      const code = String(row.Código).trim();
      const parentCode = row['Código Pai'] ? String(row['Código Pai']).trim() : undefined;

      // Validate code hierarchy
      validateCodeHierarchy(code, parentCode);

      accounts.push({
        code,
        parent_code: parentCode,
        name: String(row.Nome).trim(),
        type: String(row.Tipo).toUpperCase() as any,
        nature: String(row.Natureza).toUpperCase() as any,
        description: row.Descrição ? String(row.Descrição).trim() : undefined,
      });
    } catch (err: any) {
      errors.push(`Linha ${rowNum}: ${err.message}`);
    }
  }

  if (errors.length > 0 && errors.length === data.length) {
    throw new Error(`Nenhum registro válido encontrado. ${errors[0]}`);
  }

  if (errors.length > 0) {
    console.warn('Erros na importação (linhas ignoradas):', errors);
  }

  return accounts;
}

/**
 * Parse Bills (Contas a Pagar) from Excel file
 */
export async function parseBillsExcel(fileData: ArrayBuffer): Promise<any[]> {
  const XLSX = await import('xlsx');
  
  const workbook = XLSX.read(new Uint8Array(fileData), { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  
  if (!worksheet) {
    throw new Error('Nenhuma aba encontrada no arquivo Excel');
  }

  const data = XLSX.utils.sheet_to_json(worksheet);
  
  if (!data || data.length === 0) {
    throw new Error('Nenhum dado encontrado no arquivo');
  }

  const bills: any[] = [];
  const errors: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i] as any;
    const rowNum = i + 2;

    try {
      // Validate required fields
      if (!row.Data || !row.Fornecedor || !row.Valor) {
        throw new Error('Campos obrigatórios faltando: Data, Fornecedor, Valor');
      }

      // Parse date
      const dateStr = String(row.Data).trim();
      const dateObj = parseDate(dateStr);
      if (!dateObj) {
        throw new Error(`Data inválida: ${dateStr}. Use formato YYYY-MM-DD`);
      }

      // Parse value
      const value = parseFloat(String(row.Valor).replace(',', '.'));
      if (isNaN(value) || value <= 0) {
        throw new Error(`Valor inválido: ${row.Valor}. Deve ser um número positivo`);
      }

      bills.push({
        due_date: dateObj,
        provider: String(row.Fornecedor).trim(),
        amount: value,
        category: row.Categoria ? String(row.Categoria).trim() : undefined,
        description: row.Descrição ? String(row.Descrição).trim() : undefined,
        status: 'open',
      });
    } catch (err: any) {
      errors.push(`Linha ${rowNum}: ${err.message}`);
    }
  }

  if (errors.length > 0 && errors.length === data.length) {
    throw new Error(`Nenhum registro válido encontrado. ${errors[0]}`);
  }

  return bills;
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Try DD/MM/YYYY
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }

  // Try DD-MM-YYYY
  const match2 = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (match2) {
    const [, day, month, year] = match2;
    return `${year}-${month}-${day}`;
  }

  return null;
}
