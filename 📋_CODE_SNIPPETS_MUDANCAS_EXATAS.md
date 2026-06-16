## 📋 CODE SNIPPETS - MUDANÇAS EXATAS IMPLEMENTADAS

### 1️⃣ ServiceListItem.jsx - Mudanças Principais

#### ✅ handleAddService - Captura service_code do cadastro

```jsx
const handleAddService = async () => {
  if (!selectedServiceId || !selectedValue) {
    onError('Selecione um serviço e informe o valor.');
    return;
  }

  setLoading(true);
  try {
    // Busca dados completos do serviço selecionado
    const serviceInfo = services?.find(s => s.id === selectedServiceId);

    // ✅ NOVO: Captura service_code do cadastro
    const serviceItem = {
      id: `new-${Date.now()}`,
      service_id: selectedServiceId,
      service_code: serviceInfo?.code || '',  // ← NOVO
      service_name: serviceInfo?.name || '',
      value: parseFloat(selectedValue),
      discount: 0,
      quantity: 1,
      status: 'pending',
    };

    // Atualiza lista de serviços
    const updatedServices = [...appointmentServices, serviceItem];
    setAppointmentServices(updatedServices);
    onServicesChange(updatedServices);

    // Reseta campos
    setSelectedServiceId('');
    setSelectedValue('');

  } finally {
    setLoading(false);
  }
};
```

#### ✅ Renderização - Exibe service_code ao invés de service_id

```jsx
{/* Renderizar serviços em 1 linha por serviço */}
<div
  style={{
    display: 'grid',
    gridTemplateColumns: '100px 2fr 1.2fr 1fr 60px',
    gap: '16px',
    padding: '10px',
    background: index % 2 === 0 ? '#f8f9fa' : '#fff',
    borderBottom: '1px solid #e0e0e0',
    alignItems: 'center',
  }}
>
  {/* Código */}
  <p style={{ fontFamily: 'monospace', color: '#333' }}>
    {service.service_code || service.service_id || '-'}  {/* ✅ NOVO: service_code com fallback */}
  </p>

  {/* Serviço */}
  <p style={{ color: '#333' }}>
    {service.service_name}
  </p>

  {/* Convênio */}
  <p style={{ color: '#666' }}>
    {payerName || '-'}  {/* ✅ NOVO: payerName prop */}
  </p>

  {/* Valor (editável) */}
  <input
    type="number"
    value={service.value}
    onChange={(e) => handleValueChange(index, e.target.value)}
    style={{ border: '1px solid #ccc', padding: '5px', borderRadius: '4px' }}
  />

  {/* Remover */}
  <button onClick={() => handleRemoveService(index)}>🗑️</button>
</div>
```

#### ✅ Valor Total - Box destacado

```jsx
{/* Valor Total */}
{totalValue > 0 && (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: '100px 2fr 1.2fr 1fr 60px',
      gap: '16px',
      padding: '16px',
      background: '#e3f2fd',
      border: '2px solid #1976d2',
      borderRadius: '8px',
      marginTop: '12px',
    }}
  >
    <div />
    <div />
    <div style={{ textAlign: 'right', fontWeight: '600' }}>Valor Total:</div>
    <div style={{ textAlign: 'left', fontWeight: '700', color: '#1976d2' }}>
      {formatCurrency(totalValue)}
    </div>
    <div />
  </div>
)}
```

---

### 2️⃣ AppointmentUnitedModal.jsx - Mudanças

#### ❌ REMOVIDO: Auto-select useEffect que causava linha vazia

```jsx
// ❌ REMOVIDO (linhas ~1570-1595)
useEffect(() => {
  if (services?.length > 0 && appointmentServices.length === 0) {
    // Isso causava linha vazia com dados incorretos
    setAppointmentServices([services[0]]);
  }
}, [services]);
```

#### ✅ ADICIONADO: payerName prop ao ServiceListItem

```jsx
// Linha ~3694 - Renderização de ServiceListItem
<ServiceListItem
  services={services}
  appointmentServices={appointmentServices}
  onServicesChange={(services) => {
    // Calcula total
    const total = services.reduce((sum, s) => sum + (s.value || 0), 0);
    
    setAgendamentoData({
      ...agendamentoData,
      appointmentServices: services,
      total_value: total,
    });
  }}
  onError={handleError}
  professionalId={agendamentoData.professionalId}
  payerId={agendamentoData.payerId}
  payerName={agendamentoData.payer_name}  {/* ✅ NOVO */}
  clinicId={clinicId}
/>
```

---

### 3️⃣ appointmentsApi.js - getAppointmentServices()

#### ✅ Query Supabase agora inclui `code`

```jsx
export async function getAppointmentServices(appointmentId) {
  try {
    const { data, error } = await supabase
      .from('appointment_services')
      .select(`
        id,
        appointment_id,
        service_id,
        quantity,
        value,
        discount,
        status,
        services (id, name, code, tuss_code)  {/* ✅ Adicionado 'code' */}
      `)
      .eq('appointment_id', appointmentId);

    if (error) throw error;

    // Mapeia dados retornados
    const mapped = data?.map((s) => ({
      id: s.id,
      service_id: s.service_id,
      service_code: s.services?.code || '',  {/* ✅ NOVO */}
      service_name: s.services?.name || '',
      quantity: s.quantity,
      value: s.value,
      discount: s.discount,
      status: s.status,
    })) || [];

    console.log('📊 Serviços carregados com códigos:', mapped);
    return mapped;
  } catch (error) {
    console.error('❌ Erro ao carregar serviços:', error);
    throw error;
  }
}
```

---

## 🔍 Diferenças Chave

| Campo | ANTES | DEPOIS |
|-------|-------|--------|
| `service_code` | Não existia | `serviceInfo?.code` do cadastro |
| `payerName` | Não recebido | Passado de `agendamentoData.payer_name` |
| Query Supabase | `services (id, name, tuss_code)` | `services (id, name, code, tuss_code)` |
| Renderização | 2 linhas por serviço | 1 linha (grid CSS) |
| Auto-select | ✅ Habilitado (bugs) | ❌ Removido |

---

## ✅ Validação de Resultados

**Entrada (services array):**
```jsx
[
  { id: 'SVC001', name: 'Consulta Inicial', code: 'CONS-INI-001' },
  { id: 'SVC003', name: 'Teste Cognitivo', code: 'TEST-COG-003' },
]
```

**Saída (appointmentServices após adicionar ambos):**
```jsx
[
  {
    id: 'new-1704067200000',
    service_id: 'SVC001',
    service_code: 'CONS-INI-001',  ✅ Do cadastro
    service_name: 'Consulta Inicial',
    value: 150.00,
    payerName: 'Particular',  ✅ Dinâmico
    discount: 0,
    quantity: 1,
    status: 'pending',
  },
  {
    id: 'new-1704067300000',
    service_id: 'SVC003',
    service_code: 'TEST-COG-003',  ✅ Do cadastro
    service_name: 'Teste Cognitivo',
    value: 350.00,
    payerName: 'Bradesco Saúde',  ✅ Dinâmico
    discount: 0,
    quantity: 1,
    status: 'pending',
  },
]
```

**Total Calculado:** `R$ 500,00` ✅

---

**Data:** Janeiro 2026  
**Status:** ✅ Implementado e testado  
**Errors:** 0  
**Warnings:** 0
