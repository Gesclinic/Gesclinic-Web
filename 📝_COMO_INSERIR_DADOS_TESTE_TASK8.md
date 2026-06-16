📋 INSTRUÇÕES: Como Inserir Dados de Teste
==========================================

Objetivo: Inserir dados reais no Supabase para validar os componentes da Task 8

Método: Usando o console do navegador (F12)
Tempo: 2 minutos
Risco: BAIXO (dados são facilmente deletáveis)


🔧 OPÇÃO 1: Via Console do Navegador (RECOMENDADO)
===================================================

Passo 1: Abra o DevTools
├─ Pressione F12 no navegador
├─ Vá para a aba "Console"
└─ Certifique-se de estar em http://localhost:3000/clinica/financeiro/fluxo-caixa

Passo 2: Obtenha o Clinic ID
├─ Cole no console:
│  const clinicId = localStorage.getItem('clinicId');
│  console.log('Clinic ID:', clinicId);
│
└─ Pressione Enter

Passo 3: Execute o Script de Inserção
├─ Cole TODO este script no console:

async function seedCashFlowData() {
  const clinicId = localStorage.getItem('clinicId');
  if (!clinicId) {
    console.error('❌ Clinic ID not found in localStorage');
    return;
  }

  console.log('🌱 Starting seed for clinic:', clinicId);
  
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
  
  const supabase = createClient(
    'YOUR_SUPABASE_URL',
    'YOUR_SUPABASE_ANON_KEY'
  );

  const snapshots = [
    {
      clinic_id: clinicId,
      snapshot_date: '2026-05-01',
      total_income: 50000,
      total_expense: 30000,
      closing_balance: 20000,
    },
    {
      clinic_id: clinicId,
      snapshot_date: '2026-05-03',
      total_income: 60000,
      total_expense: 35000,
      closing_balance: 45000,
    },
    {
      clinic_id: clinicId,
      snapshot_date: '2026-05-05',
      total_income: 55000,
      total_expense: 40000,
      closing_balance: 60000,
    },
    {
      clinic_id: clinicId,
      snapshot_date: '2026-05-07',
      total_income: 70000,
      total_expense: 45000,
      closing_balance: 85000,
    },
    {
      clinic_id: clinicId,
      snapshot_date: '2026-05-09',
      total_income: 75000,
      total_expense: 50000,
      closing_balance: 110000,
    },
    {
      clinic_id: clinicId,
      snapshot_date: '2026-05-11',
      total_income: 80000,
      total_expense: 55000,
      closing_balance: 135000,
    },
    {
      clinic_id: clinicId,
      snapshot_date: '2026-05-13',
      total_income: 85000,
      total_expense: 60000,
      closing_balance: 160000,
    },
  ];

  const { data, error } = await supabase
    .from('cash_flow_snapshots')
    .insert(snapshots)
    .select();

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log('✅ Success! Inserted', data?.length || 0, 'snapshots');
  console.log('📊 Data:', data);
  console.log('🔄 Refresh the page to see data in components');
}

seedCashFlowData();

└─ Pressione Enter

Passo 4: Aguarde a Resposta
├─ Você deve ver:
│  ✅ Success! Inserted 7 snapshots
│  📊 Data: [Array of 7 items]
│  🔄 Refresh the page to see data in components
│
└─ Se houver erro, verifique as credenciais do Supabase

Passo 5: Recarregue a Página
├─ Pressione F5 ou Ctrl+R
├─ Aguarde a página carregar completamente
└─ Os componentes devem agora exibir dados reais


🔧 OPÇÃO 2: Via SQL do Supabase Dashboard
===========================================

Passo 1: Acesse https://app.supabase.com
├─ Faça login com suas credenciais
├─ Vá para o projeto gesclinic-web
└─ Abra "SQL Editor"

Passo 2: Copie e Execute o SQL

INSERT INTO cash_flow_snapshots (
  clinic_id,
  snapshot_date,
  total_income,
  total_expense,
  closing_balance
) VALUES
  ('08f00f17-f33a-4410-ace0-001b64ae0e63', '2026-05-01'::date, 50000, 30000, 20000),
  ('08f00f17-f33a-4410-ace0-001b64ae0e63', '2026-05-03'::date, 60000, 35000, 45000),
  ('08f00f17-f33a-4410-ace0-001b64ae0e63', '2026-05-05'::date, 55000, 40000, 60000),
  ('08f00f17-f33a-4410-ace0-001b64ae0e63', '2026-05-07'::date, 70000, 45000, 85000),
  ('08f00f17-f33a-4410-ace0-001b64ae0e63', '2026-05-09'::date, 75000, 50000, 110000),
  ('08f00f17-f33a-4410-ace0-001b64ae0e63', '2026-05-11'::date, 80000, 55000, 135000),
  ('08f00f17-f33a-4410-ace0-001b64ae0e63', '2026-05-13'::date, 85000, 60000, 160000);

⚠️ NOTA: Substitua o clinic_id pela ID correta da sua clínica!

Passo 3: Clique em "Run"
├─ Você deve ver "7 rows inserted" na resposta
└─ Não deve haver erros


🔧 OPÇÃO 3: Via PowerShell (Mais Avançado)
===========================================

Passo 1: Crie um arquivo insert-data.sql
├─ Copie o SQL da Opção 2 acima
├─ Salve como c:\dev\gesclinic-web\insert-test-data.sql
└─ Certifique-se de ter a ID correta da clínica

Passo 2: Execute via PowerShell

$supabaseUrl = "https://seu-projeto.supabase.co"
$apiKey = "sua-chave-api"

$sqlFile = "c:\dev\gesclinic-web\insert-test-data.sql"
$sql = Get-Content -Path $sqlFile -Raw

$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

$body = @{
    "query" = $sql
} | ConvertTo-Json

Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/exec_sql" `
    -Headers $headers `
    -Method POST `
    -Body $body


📊 VERIFICAÇÃO: Como Confirmar que os Dados Foram Inseridos
==========================================================

No Console do Navegador:

// 1. Verifique direto no Supabase
const { data, error } = await window.supabaseClient
  .from('cash_flow_snapshots')
  .select('*')
  .eq('clinic_id', localStorage.getItem('clinicId'));

console.log('Snapshots:', data);

// 2. Deve retornar 7 registros de maio de 2026


🧹 LIMPEZA: Como Remover Dados de Teste
========================================

Se precisar limpar os dados após testes:

// No Console do Navegador:
const clinicId = localStorage.getItem('clinicId');
const { error } = await window.supabaseClient
  .from('cash_flow_snapshots')
  .delete()
  .eq('clinic_id', clinicId)
  .gte('snapshot_date', '2026-05-01')
  .lte('snapshot_date', '2026-05-31');

if (error) console.error(error);
else console.log('✅ Data cleared');


✅ CHECKLIST PÓS-INSERÇÃO
=========================

Após inserir os dados:

[ ] Dados aparecem no Supabase (verificar tabela)
[ ] Página recarregada no navegador
[ ] Aba "Resumo" mostra valores reais
[ ] Aba "Tendência" mostra gráfico com pontos
[ ] Aba "Projeção" mostra projeção (não erro)
[ ] Aba "Relatório" mostra transações
[ ] Nenhum erro no console
[ ] Todos os gráficos renderizam
[ ] Exportação funciona


🚀 PRÓXIMOS PASSOS
==================

1. Escolha a opção (1, 2 ou 3) que preferir
2. Execute os comandos exatamente como estão
3. Aguarde resposta de sucesso
4. Recarregue a página do navegador
5. Verifique se os componentes exibem dados
6. Teste cada aba manualmente
7. Documente os resultados
8. Complete a Task 8 Phase 2


⏱️ TEMPO ESPERADO
=================

- Opção 1 (Console): 2 minutos
- Opção 2 (SQL Dashboard): 3 minutos
- Opção 3 (PowerShell): 5 minutos
- Verificação e Testes: 10 minutos
- Total: 15-20 minutos


════════════════════════════════════════════════════════════

Pronto para começar? Escolha uma opção e execute!

Dúvidas? Verifique:
- Credenciais Supabase corretas
- Clinic ID correct
- Internet conexão ativa
- Dev server rodando (npm run dev)

════════════════════════════════════════════════════════════
