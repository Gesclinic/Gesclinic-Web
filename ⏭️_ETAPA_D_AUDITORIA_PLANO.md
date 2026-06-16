<!-- ============================================================================
     ⏭️ ETAPA D: HISTÓRICO E AUDITORIA - PLANO DE EXECUÇÃO
     ============================================================================ -->

# ⏭️ ETAPA D: Histórico e Auditoria - PRÓXIMAS AÇÕES

**Predecessor:** ETAPA C ✅ (Validações Robustas - CONCLUÍDO)  
**Status:** ⏳ **NÃO INICIADO - PRONTO PARA COMEÇAR**  
**Duração Estimada:** 2-3 horas  
**Complexidade:** Média

---

## 🎯 Objetivo

Implementar rastreamento completo de alterações de taxa de processamento com capacidade de revert, auditoria e relatórios.

---

## 📋 Tarefas - Ordem de Execução

### ✅ ETAPA D.1: Criar Tabela de Auditoria
**Tempo:** 15 minutos

**Arquivo:** `supabase/migrations/2026-05-25_create_fee_audit_log.sql`

```sql
-- ============================================================================
-- ETAPA D.1: Tabela de auditoria para histórico de taxas
-- ============================================================================

CREATE TABLE fee_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referências principais
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  fee_id UUID NOT NULL REFERENCES card_processor_fees(id) ON DELETE CASCADE,
  
  -- Informações de alteração
  action VARCHAR(20) NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP DEFAULT NOW(),
  
  -- Valores antes e depois
  old_values JSONB, -- NULL para 'create'
  new_values JSONB NOT NULL,
  
  -- Contexto
  change_reason VARCHAR(500), -- Opcional: por que foi alterado?
  ip_address VARCHAR(50),
  
  -- Constraints
  CONSTRAINT valid_action CHECK (action IN ('create', 'update', 'delete'))
);

-- Índices para performance
CREATE INDEX idx_fee_audit_log_clinic_id ON fee_audit_log(clinic_id);
CREATE INDEX idx_fee_audit_log_fee_id ON fee_audit_log(fee_id);
CREATE INDEX idx_fee_audit_log_changed_at ON fee_audit_log(changed_at DESC);
CREATE INDEX idx_fee_audit_log_action ON fee_audit_log(action);

-- Comentários
COMMENT ON TABLE fee_audit_log IS 'Histórico de auditoria para alterações de taxa de processamento';
COMMENT ON COLUMN fee_audit_log.old_values IS 'Valores anteriores (JSON)';
COMMENT ON COLUMN fee_audit_log.new_values IS 'Valores novos (JSON)';
COMMENT ON COLUMN fee_audit_log.change_reason IS 'Motivo da alteração (opcional)';

-- RLS: Usuários veem apenas auditoria de sua clínica
ALTER TABLE fee_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem auditoria de sua clínica"
  ON fee_audit_log
  FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Sistema grava auditoria"
  ON fee_audit_log
  FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM user_clinic_roles
      WHERE user_id = auth.uid()
    )
  );
```

**Checklist:**
- [ ] Arquivo criado em `supabase/migrations/`
- [ ] SQL testado em Supabase console
- [ ] RLS policies criadas
- [ ] Índices criados para performance

---

### ✅ ETAPA D.2: Integrar Logging em recordFeeChange()
**Tempo:** 20 minutos

**Arquivo:** `src/lib/processorFeeValidations.js`

**Modificação:** Expandir `recordFeeChange()` para usar nova tabela

```javascript
export async function recordFeeChange({
  clinicId,
  userId,
  feeId,
  action, // 'create', 'update', 'delete'
  oldValues,
  newValues,
  changeReason = null,
}) {
  // ✅ Agora insere na tabela fee_audit_log
  const { data, error } = await supabase
    .from('fee_audit_log')
    .insert([{
      clinic_id: clinicId,
      fee_id: feeId,
      action,
      changed_by: userId,
      old_values: oldValues ? JSON.stringify(oldValues) : null,
      new_values: JSON.stringify(newValues),
      change_reason: changeReason,
      ip_address: null, // Poderia capturar do contexto HTTP
    }]);

  if (error) {
    console.error('❌ [recordFeeChange] Error:', error);
    throw new Error('Falha ao registrar alteração');
  }

  return data?.[0];
}

// ✅ Nova função: Obter histórico completo
export async function getFeeAuditHistory(feeId, limit = 20) {
  const { data, error } = await supabase
    .from('fee_audit_log')
    .select('*')
    .eq('fee_id', feeId)
    .order('changed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ [getFeeAuditHistory] Error:', error);
    return [];
  }

  return data || [];
}

// ✅ Nova função: Obter mudanças específicas
export async function getFeeChangesByClinic(clinicId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('fee_audit_log')
    .select('*')
    .eq('clinic_id', clinicId)
    .gte('changed_at', startDate.toISOString())
    .order('changed_at', { ascending: false });

  if (error) {
    console.error('❌ [getFeeChangesByClinic] Error:', error);
    return [];
  }

  return data || [];
}

// ✅ Nova função: Revert para versão anterior
export async function revertFeeToVersion(feeId, auditLogId, clinicId, userId) {
  // 1. Buscar o registro de auditoria
  const { data: auditRecord, error: auditError } = await supabase
    .from('fee_audit_log')
    .select('*')
    .eq('id', auditLogId)
    .eq('fee_id', feeId)
    .single();

  if (auditError || !auditRecord.old_values) {
    throw new Error('Versão anterior não encontrada');
  }

  const previousValues = JSON.parse(auditRecord.old_values);

  // 2. Atualizar fee com valores anteriores
  const { data: updated, error: updateError } = await supabase
    .from('card_processor_fees')
    .update(previousValues)
    .eq('id', feeId)
    .eq('clinic_id', clinicId);

  if (updateError) {
    throw new Error('Falha ao reverter: ' + updateError.message);
  }

  // 3. Registrar revertion na auditoria
  await recordFeeChange({
    clinicId,
    userId,
    feeId,
    action: 'update',
    oldValues: { /* valores atuais antes da revertion */ },
    newValues: previousValues,
    changeReason: `Revert para versão anterior (audit log: ${auditLogId})`,
  });

  return updated?.[0];
}
```

**Checklist:**
- [ ] Função `getFeeAuditHistory()` adicionada
- [ ] Função `getFeeChangesByClinic()` adicionada
- [ ] Função `revertFeeToVersion()` adicionada
- [ ] Integração com `recordFeeChange()` completa
- [ ] Build passa sem erros

---

### ✅ ETAPA D.3: Criar Componente FeeAuditTrail
**Tempo:** 45 minutos

**Arquivo:** `src/pages/clinica/financeiro/components/FeeAuditTrail.jsx`

```jsx
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, ChevronDown, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  getFeeAuditHistory, 
  revertFeeToVersion,
  formatValidationMessage 
} from '@/lib/processorFeeValidations';

export default function FeeAuditTrail({ feeId, clinicId, onRevert }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [reverting, setReverting] = useState(null);

  useEffect(() => {
    loadHistory();
  }, [feeId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const records = await getFeeAuditHistory(feeId, 50);
      setHistory(records);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async (auditLogId) => {
    if (!confirm('Deseja reverter para esta versão?')) return;

    setReverting(auditLogId);
    try {
      await revertFeeToVersion(feeId, auditLogId, clinicId, null);
      await loadHistory();
      onRevert?.();
      alert('✅ Taxa revertida com sucesso');
    } catch (error) {
      alert('❌ Erro ao reverter: ' + error.message);
    } finally {
      setReverting(null);
    }
  };

  const getActionLabel = (action) => {
    const labels = {
      create: '➕ Criada',
      update: '✏️ Alterada',
      delete: '🗑️ Deletada',
    };
    return labels[action] || action;
  };

  if (loading) return <p className="text-gray-500">Carregando histórico...</p>;
  if (history.length === 0) return <p className="text-gray-500">Sem histórico</p>;

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm text-gray-900">📋 Histórico de Alterações</h3>
      {history.map((record) => (
        <div key={record.id} className="border border-gray-200 rounded">
          <button
            onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
            className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center gap-2 flex-1 text-left">
              <ChevronDown
                className={`w-4 h-4 transition ${
                  expandedId === record.id ? 'rotate-180' : ''
                }`}
              />
              <span className="text-sm font-medium">{getActionLabel(record.action)}</span>
              <span className="text-xs text-gray-500">
                {format(new Date(record.changed_at), 'dd/MMM/yyyy HH:mm', { locale: ptBR })}
              </span>
            </div>
            {record.action !== 'delete' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRevert(record.id);
                }}
                disabled={reverting === record.id}
              >
                <Undo2 className="w-4 h-4" />
              </Button>
            )}
          </button>

          {expandedId === record.id && (
            <div className="px-3 py-2 bg-gray-50 border-t space-y-2">
              {record.change_reason && (
                <div className="text-sm">
                  <p className="text-gray-600">
                    <strong>Motivo:</strong> {record.change_reason}
                  </p>
                </div>
              )}

              {record.old_values && (
                <div className="text-sm bg-red-50 p-2 rounded border border-red-200">
                  <p className="font-semibold text-red-900">❌ Antes:</p>
                  <pre className="text-xs text-red-800 overflow-auto">
                    {JSON.stringify(JSON.parse(record.old_values), null, 2)}
                  </pre>
                </div>
              )}

              {record.new_values && (
                <div className="text-sm bg-green-50 p-2 rounded border border-green-200">
                  <p className="font-semibold text-green-900">✅ Depois:</p>
                  <pre className="text-xs text-green-800 overflow-auto">
                    {JSON.stringify(JSON.parse(record.new_values), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Checklist:**
- [ ] Componente criado com interface limpa
- [ ] Carregamento de histórico funcionando
- [ ] Expansão/colapso de detalhes funcionando
- [ ] Botão revert com confirmação
- [ ] Formatação de datas em português
- [ ] Integração com recordFeeChange()

---

### ✅ ETAPA D.4: Integrar FeeAuditTrail em CartasProcessadorTaxasPage
**Tempo:** 15 minutos

**Arquivo:** `src/pages/clinica/financeiro/CartasProcessadorTaxasPage.jsx`

```jsx
import FeeAuditTrail from './components/FeeAuditTrail';

// No componente, adicionar:
export default function CartasProcessadorTaxasPage() {
  const [auditTrailFeeId, setAuditTrailFeeId] = useState(null);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  const handleViewAudit = (feeId) => {
    setAuditTrailFeeId(feeId);
    setShowAuditTrail(true);
  };

  // Na tabela de fees, adicionar coluna:
  return (
    <table className="...">
      <tbody>
        {fees.map(fee => (
          <tr key={fee.id}>
            {/* ... outras colunas ... */}
            <td>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleViewAudit(fee.id)}
              >
                📋 Histórico
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // Modal com histórico:
  if (showAuditTrail) {
    return (
      <Dialog open={showAuditTrail} onOpenChange={setShowAuditTrail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>📋 Histórico de Alterações</DialogTitle>
          </DialogHeader>
          <FeeAuditTrail 
            feeId={auditTrailFeeId}
            clinicId={clinicId}
            onRevert={() => {
              // Recarregar fees
              loadFees();
            }}
          />
        </DialogContent>
      </Dialog>
    );
  }
}
```

**Checklist:**
- [ ] Import de FeeAuditTrail adicionado
- [ ] Estado para mostrar/ocultar trail
- [ ] Botão "Histórico" adicionada à tabela
- [ ] Modal com FeeAuditTrail funcionando
- [ ] Revert funcionando e recarregando dados

---

### ✅ ETAPA D.5: Criar Relatório de Auditoria
**Tempo:** 30 minutos

**Arquivo:** `src/pages/clinica/financeiro/AuditReportPage.jsx`

```jsx
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useClinicContext } from '@/contexts/ClinicContext';
import { getFeeChangesByClinic } from '@/lib/processorFeeValidations';

export default function AuditReportPage() {
  const { clinicId } = useClinicContext();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterDays, setFilterDays] = useState(30);
  const [filterAction, setFilterAction] = useState('all');

  useEffect(() => {
    loadRecords();
  }, [filterDays, filterAction]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await getFeeChangesByClinic(clinicId, filterDays);
      
      // Filtrar por ação se necessário
      const filtered = filterAction === 'all'
        ? data
        : data.filter(r => r.action === filterAction);
      
      setRecords(filtered);
    } catch (error) {
      console.error('Erro ao carregar:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csv = [
      ['Data', 'Ação', 'Taxa ID', 'Motivo', 'Usuário'].join(','),
      ...records.map(r => [
        format(new Date(r.changed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        r.action,
        r.fee_id,
        r.change_reason || '-',
        r.changed_by || '-',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_report_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📊 Relatório de Auditoria</h1>
        <Button onClick={exportToCSV} size="sm">
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <div className="flex gap-4">
        <Select value={filterDays} onChange={(e) => setFilterDays(parseInt(e.target.value))}>
          <option value={7}>Últimos 7 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={90}>Últimos 90 dias</option>
          <option value={365}>Último ano</option>
        </Select>

        <Select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
          <option value="all">Todas as ações</option>
          <option value="create">Criadas</option>
          <option value="update">Alteradas</option>
          <option value="delete">Deletadas</option>
        </Select>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Data</th>
              <th className="border p-2 text-left">Ação</th>
              <th className="border p-2 text-left">Taxa ID</th>
              <th className="border p-2 text-left">Motivo</th>
              <th className="border p-2 text-right">Total: {records.length}</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="border p-2">
                  {format(new Date(record.changed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </td>
                <td className="border p-2">{record.action}</td>
                <td className="border p-2 font-mono text-sm">{record.fee_id.slice(0, 8)}...</td>
                <td className="border p-2">{record.change_reason || '-'}</td>
                <td className="border p-2"></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

**Checklist:**
- [ ] Componente criado
- [ ] Filtros por período e ação funcionando
- [ ] Exportação CSV funcionando
- [ ] Tabela mostrando registros corretamente

---

### ✅ ETAPA D.6: Adicionar Rota de Relatório
**Tempo:** 5 minutos

**Arquivo:** `src/AppRoutes.jsx`

```jsx
import AuditReportPage from '@/pages/clinica/financeiro/AuditReportPage';

// Dentro de `/clinica/financeiro`:
<Route path="auditoria" element={<AuditReportPage />} />

// Também atualizar menu em src/components/layout/SidebarNavigation.jsx:
{
  icon: <BarChart3 className="w-5 h-5" />,
  label: '📊 Auditoria',
  href: '/clinica/financeiro/auditoria',
  section: 'Financeiro',
}
```

**Checklist:**
- [ ] Rota adicionada
- [ ] Menu atualizado
- [ ] Navegação funcionando

---

### ✅ ETAPA D.7: Testes de Auditoria
**Tempo:** 20 minutos

**Arquivo:** `src/lib/__tests__/testAuditEtapaD.js`

```javascript
import {
  recordFeeChange,
  getFeeAuditHistory,
  getFeeChangesByClinic,
  revertFeeToVersion,
} from '@/lib/processorFeeValidations';

export async function testAuditRecording() {
  console.log('✅ Teste 1: Registro de Auditoria');
  
  // Criar mudança
  const changeId = await recordFeeChange({
    clinicId: 'clinic-123',
    userId: 'user-456',
    feeId: 'fee-789',
    action: 'update',
    oldValues: { fee_percent: 2.5 },
    newValues: { fee_percent: 3.0 },
    changeReason: 'Ajuste mensal',
  });
  
  console.log('  ID do registro:', changeId);
}

export async function testHistoryRetrieval() {
  console.log('✅ Teste 2: Recuperação de Histórico');
  
  const history = await getFeeAuditHistory('fee-789', 10);
  console.log('  Registros encontrados:', history.length);
  history.forEach(h => {
    console.log(`    - ${h.action} em ${h.changed_at}`);
  });
}

export async function testRevert() {
  console.log('✅ Teste 3: Revert de Versão');
  
  // Teste de revert (precisa de dados reais)
  console.log('  ℹ️ Teste de revert requer dados reais no banco');
}
```

**Checklist:**
- [ ] Testes criados
- [ ] Testes executáveis manualmente

---

## 🏁 Checklist de Conclusão da ETAPA D

- [ ] D.1: Tabela de auditoria criada e migrada
- [ ] D.2: Logging em recordFeeChange() funcionando
- [ ] D.3: Componente FeeAuditTrail criado
- [ ] D.4: Integração em CartasProcessadorTaxasPage
- [ ] D.5: Relatório de auditoria criado
- [ ] D.6: Rotas adicionadas
- [ ] D.7: Testes criados
- [ ] Build passes: `npm run build` ✅
- [ ] Documentação criada

---

## 📊 Progresso Geral do Projeto

| Etapa | Status | Duração |
|-------|--------|---------|
| ETAPA 1-6 | ✅ Concluída | N/A |
| ETAPA A | ✅ Concluída | 1h |
| ETAPA B | ✅ Concluída | 2h |
| ETAPA C | ✅ Concluída | 1.5h |
| **ETAPA D** | ⏳ **Pronto** | **2-3h** |

---

## 🚀 Como Iniciar ETAPA D

### Opção 1: Automática (Recomendado)
```
Comando: "Executar ETAPA D"
Resultado: Agent executa todos os passos automaticamente
Tempo: ~2-3 horas
```

### Opção 2: Passo a Passo
```
Comando: "ETAPA D.1: Criar tabela de auditoria"
Resultado: Agent executa apenas D.1, após usar "ETAPA D.2", etc.
Tempo: ~2-3 horas (com paradas entre etapas)
```

### Opção 3: Manual
```
Copiar SQL de D.1 e executar manualmente em Supabase
Implementar código de D.2-D.5
Testar com browser e scripts
Tempo: ~3-4 horas
```

---

## 💾 Arquivos a Serem Criados

```
supabase/migrations/
├── 2026-05-25_create_fee_audit_log.sql

src/pages/clinica/financeiro/
├── components/
│   └── FeeAuditTrail.jsx
└── AuditReportPage.jsx

src/lib/__tests__/
└── testAuditEtapaD.js
```

---

## ✨ Resultado Final de ETAPA D

✅ Sistema completo de auditoria:
- Rastreamento de todas as alterações
- Visualização de histórico com antes/depois
- Capacidade de revert com rollback completo
- Relatórios exportáveis em CSV
- Integração com interface de gerenciamento de taxas

**Status Final Esperado:** ✅ **Produção-Pronto**

---

**Próxima Ação:** Digite "Executar ETAPA D" para começar!
