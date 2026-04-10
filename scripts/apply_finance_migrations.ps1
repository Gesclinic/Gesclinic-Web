# Script para aplicar migrations financeiras (ap_items/impostos e recorrentes)
# Execute este conteúdo no SQL Editor do Supabase ou via psql.

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  MIGRATIONS: AP Itens/Impostos + Recorrentes" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "INSTRUCOES:" -ForegroundColor Yellow
Write-Host "1. Abra o Supabase Dashboard" -ForegroundColor White
Write-Host "2. Va em SQL Editor" -ForegroundColor White
Write-Host "3. Copie e execute o conteudo dos arquivos abaixo (na ordem):" -ForegroundColor White
Write-Host "   1) supabase/migrations/20260111_ap_items_and_taxes.sql" -ForegroundColor Green
Write-Host "   2) supabase/migrations/20260111_create_recurring_accounts_payable.sql" -ForegroundColor Green
Write-Host "   3) supabase/migrations/20260112_create_ar_receivables.sql" -ForegroundColor Green
Write-Host "   4) supabase/migrations/20260112_update_cashflow_summary_for_ar.sql" -ForegroundColor Green
Write-Host "   4) supabase/migrations/20260112_create_cash_flow.sql" -ForegroundColor Green
Write-Host ""
Write-Host "OU execute diretamente via psql/pgAdmin com o conteudo abaixo:" -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================ (1) ap_items_and_taxes" -ForegroundColor Cyan
Get-Content "c:\Users\ferna\Desktop\Projeto Gesclinic Web\supabase\migrations\20260111_ap_items_and_taxes.sql"
Write-Host ""
Write-Host "============================================ (2) recurring_accounts_payable" -ForegroundColor Cyan
Get-Content "c:\Users\ferna\Desktop\Projeto Gesclinic Web\supabase\migrations\20260111_create_recurring_accounts_payable.sql"
Write-Host ""
Write-Host "============================================ (3) ar_receivables" -ForegroundColor Cyan
Get-Content "c:\Users\ferna\Desktop\Projeto Gesclinic Web\supabase\migrations\20260112_create_ar_receivables.sql"
Write-Host ""
Write-Host "============================================ (4) cashflow_summary (AR)" -ForegroundColor Cyan
Get-Content "c:\Users\ferna\Desktop\Projeto Gesclinic Web\supabase\migrations\20260112_update_cashflow_summary_for_ar.sql"
Write-Host ""
Write-Host "============================================ (4) cash_flow" -ForegroundColor Cyan
Get-Content "c:\Users\ferna\Desktop\Projeto Gesclinic Web\supabase\migrations\20260112_create_cash_flow.sql"
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "APOS APLICAR:" -ForegroundColor Yellow
Write-Host "- Teste criar uma conta com produtos e impostos; verifique tabela ap_items e colunas de impostos em ap_bills." -ForegroundColor White
Write-Host "- Ative 'Lancamento recorrente' e salve; verifique a tabela recurring_accounts_payable." -ForegroundColor White
Write-Host "- Crie um recebivel em 'Financeiro > Contas a Receber'; verifique a tabela ar_receivables e a view view_ar_receivables_v1." -ForegroundColor White
Write-Host "- Abra o dashboard financeiro; verifique RPC cashflow_summary refletindo AR/AP no período." -ForegroundColor White
Write-Host "- Pague um titulo de AP ou receba uma fatura; verifique lançamentos automáticos em cash_flow e a função cashflow_summary." -ForegroundColor White
Write-Host "- Se desejar geracao automatica, configuraremos um job (cron) no Supabase." -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
