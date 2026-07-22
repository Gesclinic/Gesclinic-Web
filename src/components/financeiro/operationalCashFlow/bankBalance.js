function firstMeaningful(...values) {
  return values.find((value) => value !== null && typeof value !== 'undefined' && String(value).trim() !== '') || '';
}

function money(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getFinancialBalanceAccountName(account = {}) {
  return firstMeaningful(
    [account.bank_name, account.account_name].filter(Boolean).join(' - '),
    account.name,
    account.account_name,
    account.bank_name,
    account.description,
  );
}

export function getFinancialBalanceOpening(account = {}) {
  return money(
    account.initial_balance
      ?? account.opening_balance
      ?? account.saldo_inicial
      ?? account.beginning_balance
      ?? 0,
  );
}

export function getStatementEndBalance(statement = {}) {
  return money(
    statement.metadata?.end_balance
      ?? statement.metadata?.saldo
      ?? statement.metadata?.balance
      ?? statement.end_balance
      ?? statement.balance
      ?? null,
  );
}

export function hasStatementEndBalance(statement = {}) {
  return [
    statement.metadata?.end_balance,
    statement.metadata?.saldo,
    statement.metadata?.balance,
    statement.end_balance,
    statement.balance,
  ].some((value) => value !== null && typeof value !== 'undefined' && value !== '');
}

export function buildStatementBalanceRows(bankStatements = [], periods = [], findPeriodKey, dateOnly) {
  return bankStatements
    .filter((statement) => statement && hasStatementEndBalance(statement))
    .map((statement) => ({
      id: statement.id,
      accountId: statement.bank_account_id || statement.account_id || null,
      periodKey: findPeriodKey(statement.statement_date || statement.date, periods),
      date: dateOnly(statement.statement_date || statement.date),
      endBalance: getStatementEndBalance(statement),
      importOrder: Number(statement.metadata?.import_row_index ?? 0),
    }))
    .filter((statement) => statement.periodKey && statement.date)
    .sort((left, right) => left.date.localeCompare(right.date) || left.importOrder - right.importOrder || String(left.id).localeCompare(String(right.id)));
}

export function getStatementBalanceForAccount(statementBalances = [], account = {}, periodKey, primaryUnlinkedBalanceAccountId = null) {
  const matches = statementBalances.filter((statement) => {
    if (statement.periodKey !== periodKey) return false;
    if (statement.accountId && account.id && String(statement.accountId) === String(account.id)) return true;
    return primaryUnlinkedBalanceAccountId && String(account.id) === String(primaryUnlinkedBalanceAccountId) && !statement.accountId;
  });

  return matches.length ? matches[matches.length - 1].endBalance : null;
}