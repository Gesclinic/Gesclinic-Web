╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║  🎬 AÇÃO IMEDIATA - OPERADORAS DE CARTÃO (3 PASSOS = 5 MINUTOS)              ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝


╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║  PASSO 1️⃣  - SUPABASE SQL EDITOR (30 segundos)                                ║
║  ──────────────────────────────────────────────────────────────────────────  ║
║                                                                               ║
║  1. Vá para: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike     ║
║     └─ Clicar em \"SQL Editor\" (esquerda)                                    ║
║     └─ Clicar em \"New query\"                                                ║
║                                                                               ║
║  2. Copie TODA a SQL abaixo e cole no editor:                                ║
║  ┌─────────────────────────────────────────────────────────────────────────  ║
║  │ CREATE TABLE card_processors (                                            ║
║  │   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                          ║
║  │   clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,       ║
║  │   name VARCHAR(100) NOT NULL,                                             ║
║  │   settlement_day INT NOT NULL CHECK (settlement_day >= 1 AND ... <= 31),  ║
║  │   notes TEXT,                                                             ║
║  │   is_active BOOLEAN DEFAULT true,                                         ║
║  │   created_at TIMESTAMP DEFAULT NOW(),                                     ║
║  │   updated_at TIMESTAMP DEFAULT NOW(),                                     ║
║  │   UNIQUE(clinic_id, name)                                                 ║
║  │ );                                                                         ║
║  │                                                                            ║
║  │ ALTER TABLE card_processors ENABLE ROW LEVEL SECURITY;                    ║
║  │                                                                            ║
║  │ CREATE POLICY card_processors_clinic_isolation ON card_processors         ║
║  │   FOR SELECT USING (clinic_id = auth.jwt() ->> 'clinic_id');             ║
║  │                                                                            ║
║  │ CREATE POLICY card_processors_insert ON card_processors                   ║
║  │   FOR INSERT WITH CHECK (clinic_id = auth.jwt() ->> 'clinic_id');        ║
║  │                                                                            ║
║  │ CREATE POLICY card_processors_update ON card_processors                   ║
║  │   FOR UPDATE USING (clinic_id = auth.jwt() ->> 'clinic_id');             ║
║  │                                                                            ║
║  │ CREATE POLICY card_processors_delete ON card_processors                   ║
║  │   FOR DELETE USING (clinic_id = auth.jwt() ->> 'clinic_id');             ║
║  └─────────────────────────────────────────────────────────────────────────  ║
║                                                                               ║
║  3. Clique botão \"Run\" (superior direito) ✓                                  ║
║     └─ Deve aparecer: \"Success. No rows returned\"                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝


╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║  PASSO 2️⃣  - ADICIONAR COLUNA (20 segundos)                                   ║
║  ──────────────────────────────────────────────────────────────────────────  ║
║                                                                               ║
║  1. Novo editor (New query)                                                   ║
║                                                                               ║
║  2. Copie e cole EXATAMENTE isto:                                            ║
║  ┌─────────────────────────────────────────────────────────────────────────  ║
║  │ ALTER TABLE clinic_payment_cards ADD COLUMN processor_id UUID             ║
║  │ REFERENCES card_processors(id) ON DELETE SET NULL;                        ║
║  └─────────────────────────────────────────────────────────────────────────  ║
║                                                                               ║
║  3. Clique \"Run\" ✓                                                           ║
║     └─ Deve aparecer: \"Success. No rows returned\"                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝


╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║  PASSO 3️⃣  - INSERIR OPERADORAS PADRÃO (30 segundos)                          ║
║  ──────────────────────────────────────────────────────────────────────────  ║
║                                                                               ║
║  ⚠️ IMPORTANTE: Primeiro descubra seu clinic_id                               ║
║     1. Execute esta query ANTES:                                             ║
║     ┌─────────────────────────────────────────────────────────────────────   ║
║     │ SELECT id, name FROM clinics LIMIT 1;                                  ║
║     └─────────────────────────────────────────────────────────────────────   ║
║     2. Copie o valor de \"id\" que aparecer                                   ║
║     3. Substitua {clinic_id} abaixo pelo valor copiado                       ║
║                                                                               ║
║  Copie e cole SUBSTITUINDO {clinic_id}:                                      ║
║  ┌─────────────────────────────────────────────────────────────────────────  ║
║  │ INSERT INTO card_processors (clinic_id, name, settlement_day, notes)      ║
║  │ VALUES                                                                     ║
║  │   ('{clinic_id}', 'STONE', 1, 'D+1 próximo dia útil'),                   ║
║  │   ('{clinic_id}', 'PAGBANK', 1, 'D+1 ou D+2'),                           ║
║  │   ('{clinic_id}', 'PAGSEGURO', 15, '15º do mês'),                        ║
║  │   ('{clinic_id}', 'MERCADO PAGO', 1, 'D+1 a D+3'),                       ║
║  │   ('{clinic_id}', 'CIELO', 1, 'D+1 dia útil'),                           ║
║  │   ('{clinic_id}', 'REDE', 1, 'D+1 próximo dia');                         ║
║  └─────────────────────────────────────────────────────────────────────────  ║
║                                                                               ║
║  3. Clique \"Run\" ✓                                                           ║
║     └─ Deve aparecer: \"Success. 6 rows inserted\" (ou similar)               ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝


╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║  🎉 PRONTO! AGORA TESTE (2 MINUTOS)                                           ║
║  ──────────────────────────────────────────────────────────────────────────  ║
║                                                                               ║
║  1. Vá para: http://localhost:3000/clinica/financeiro/cartoes-operadoras     ║
║     └─ F5 (reload se não carregar)                                           ║
║     └─ Deve aparecer: Página com operadoras!                                 ║
║                                                                               ║
║  2. Teste criando:                                                            ║
║     ├─ Nome: STONE                                                            ║
║     ├─ Dia: 1                                                                 ║
║     └─ Clique \"➕ Adicionar\"                                                 ║
║     └─ Deve aparecer na lista                                                ║
║                                                                               ║
║  3. Teste em Cartões:                                                        ║
║     ├─ Vá para: Financeiro > Estrutura > Cartões                             ║
║     ├─ Novo cartão (preencha campos normalmente)                             ║
║     ├─ Campo novo: \"Operadora de Processamento\" = STONE                     ║
║     ├─ Salve                                                                  ║
║     └─ Deve aparecer: \"🏢 Operadora: STONE (Crédito: 1º)\"                  ║
║                                                                               ║
║  ✅ FUNCIONANDO!                                                              ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝


╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║  ⏱️ CRONÔMETRO                                                                 ║
║  ──────────────────────────────────────────────────────────────────────────  ║
║                                                                               ║
║  PASSO 1 (CREATE TABLE)    ⏱️  30s  |  [████████████████] ████                ║
║  PASSO 2 (ADD COLUMN)      ⏱️  20s  |  [██████████] ████████                  ║
║  PASSO 3 (INSERT)          ⏱️  30s  |  [████████████████] ████                ║
║  TESTE                     ⏱️ 120s  |  [████████████████████████]             ║
║  ──────────────────────────────────────────────────────────────────────────  ║
║  TOTAL                     ⏱️ ~200s |  5 MINUTOS                               ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝


╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║  🆘 DÚVIDA DURANTE SQL?                                                       ║
║  ──────────────────────────────────────────────────────────────────────────  ║
║                                                                               ║
║  \"Qual é meu clinic_id?\"                                                    ║
║  → Execute: SELECT id FROM clinics LIMIT 1;                                  ║
║  → Copie o valor de \"id\"                                                    ║
║                                                                               ║
║  \"Erro: already exists\"                                                    ║
║  → Significa: Tabela já foi criada                                            ║
║  → Solução: Pule para PASSO 2                                                ║
║                                                                               ║
║  \"Erro: column already exists\"                                             ║
║  → Significa: Coluna já foi adicionada                                        ║
║  → Solução: Pule para PASSO 3 (INSERT)                                       ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝


╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║  ✨ PRÓXIMOS PASSOS                                                            ║
║  ──────────────────────────────────────────────────────────────────────────  ║
║                                                                               ║
║  Curto prazo (hoje):                                                          ║
║  ├─ ✅ Execute SQLs (está fazendo agora!)                                     ║
║  ├─ ✅ Teste operadoras                                                       ║
║  └─ ✅ Teste vincular em cartão                                               ║
║                                                                               ║
║  Médio prazo (próxima sessão):                                                ║
║  ├─ Integrar com agendamentos (calcular data de recebimento)                 ║
║  ├─ Criar relatórios por operadora                                           ║
║  └─ Dashboard de status de crédito                                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝


═══════════════════════════════════════════════════════════════════════════════════

👉 CLIQUE AQUI PARA LER MAIS:
   📄 ⚡_OPERADORAS_TESTE_RAPIDO_5MIN.md (após SQL)
   📄 ⚡_OPERADORAS_SUMARIO_EXECUTIVO.md (entender tudo)
   📄 📚_INDICE_DOCUMENTACAO_OPERADORAS.md (índice completo)

═══════════════════════════════════════════════════════════════════════════════════

🚀 BORA LÁ! Execute os 3 SQLs acima e teste!
