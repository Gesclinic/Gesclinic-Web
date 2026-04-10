# 🚀 PRÓXIMOS PASSOS - MÓDULO PACIENTES

## ✅ FASE 1 CONCLUÍDA

O módulo de Pacientes está pronto com:
- ✅ Rotas estruturadas com patientId obrigatório
- ✅ PatientContext global funcionando
- ✅ 8 páginas implementadas
- ✅ Menu dinâmico
- ✅ Cadastro em 2 etapas
- ✅ UX/Visual melhorada

---

## 📌 FASE 2: INTEGRAÇÕES CRÍTICAS

### 1. **Integrar com API de Pacientes** (⏱️ 1-2 horas)

**O que fazer:**
- Revisar `src/lib/patientsApi.js` para compatibilidade
- Verificar campos obrigatórios vs schema do Supabase
- Ajustar mapeamento de campos se necessário

**Checklist:**
```javascript
// Verificar se esses campos existem na tabela 'patients':
id, name, document_id, phone, birthdate, gender, email,
street, number, neighborhood, city, state, zip_code, 
cell_phone, address

// Se faltarem, ou tiverem nomes diferentes, atualizar:
const getPatientById = async (patientId) => {
  const { data } = await supabase
    .from("patients")
    .select(`
      id,
      name,
      document_id,
      phone,
      birthdate,
      gender,
      email,
      street,
      number,
      neighborhood,
      city,
      state,
      zip_code,
      cell_phone,
      address,
      clinic_id
    `)
    .eq("id", patientId)
    .single();
  return data;
};
```

### 2. **Upload de Documentos** (⏱️ 2-3 horas)

**Implementar em `PatientDocumentosPage.jsx`:**

```javascript
// 1. Criar tabela 'patient_documents' no Supabase:
/*
  id: UUID primary key
  patient_id: UUID (FK patients)
  clinic_id: UUID (FK clinics)
  document_type: TEXT (rg, cpf, medical_order, exam, etc)
  status: TEXT (pending, validated, invalid)
  file_path: TEXT (supabase storage path)
  file_name: TEXT
  uploaded_at: TIMESTAMP
  validated_at: TIMESTAMP (nullable)
  validated_by: UUID (FK profiles, nullable)
  linked_appointment_id: UUID (FK appointments, nullable)
  linked_insurance_id: UUID (FK insurances, nullable)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
*/

// 2. Implementar upload:
export const uploadPatientDocument = async (patientId, file, docType) => {
  const fileName = `${patientId}/${Date.now()}_${file.name}`;
  
  // Upload para Supabase Storage
  const { data, error } = await supabase.storage
    .from("patient-documents")
    .upload(fileName, file);

  if (error) throw error;

  // Registrar no BD
  const { data: doc } = await supabase
    .from("patient_documents")
    .insert([{
      patient_id: patientId,
      document_type: docType,
      status: "pending",
      file_path: data.path,
      file_name: file.name
    }])
    .select()
    .single();

  return doc;
};

// 3. Implementar listagem:
export const listPatientDocuments = async (patientId) => {
  const { data } = await supabase
    .from("patient_documents")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  return data;
};

// 4. Implementar download:
export const downloadDocument = async (filePath) => {
  const { data } = await supabase.storage
    .from("patient-documents")
    .getPublicUrl(filePath);
  
  window.open(data.publicUrl, "_blank");
};
```

### 3. **Convênios/Planos de Saúde** (⏱️ 2-3 horas)

**Implementar em `PatientConveniosPage.jsx`:**

```javascript
// 1. Criar tabela 'patient_insurances' no Supabase:
/*
  id: UUID primary key
  patient_id: UUID (FK patients)
  insurance_id: UUID (FK insurances)
  matricula: TEXT (número da matrícula)
  dependence_relation: TEXT (titular, cônjuge, filho, etc)
  valid_from: DATE
  valid_until: DATE
  is_primary: BOOLEAN
  is_active: BOOLEAN
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
*/

// 2. Implementar CRUD:
export const addPatientInsurance = async (patientId, insuranceData) => {
  const { data } = await supabase
    .from("patient_insurances")
    .insert([{
      patient_id: patientId,
      ...insuranceData
    }])
    .select()
    .single();
  return data;
};

export const listPatientInsurances = async (patientId) => {
  const { data } = await supabase
    .from("patient_insurances")
    .select(`
      *,
      insurance:insurance_id(id, name, cnpj)
    `)
    .eq("patient_id", patientId)
    .order("is_primary", { ascending: false });
  return data;
};

// 3. Atualizar PatientContext para verificar convênio vencido:
const newAlerts = {
  expiredInsurance: data.insurances?.some(ins => 
    new Date(ins.valid_until) < new Date()
  ) ?? false,
  // ...
};
```

### 4. **Prontuário com Registros** (⏱️ 3-4 horas)

**Implementar em `PatientProntuarioPage.jsx`:**

```javascript
// 1. Criar tabela 'patient_records' no Supabase:
/*
  id: UUID primary key
  patient_id: UUID (FK patients)
  professional_id: UUID (FK professionals)
  appointment_id: UUID (FK appointments, nullable)
  record_type: TEXT (consultation, evolution, exam, note)
  title: TEXT
  content: TEXT
  created_at: TIMESTAMP
  updated_at: TIMESTAMP (para auditoria apenas)
*/

// 2. Implementar serviço:
export const createPatientRecord = async (patientId, recordData) => {
  const { data } = await supabase
    .from("patient_records")
    .insert([{
      patient_id: patientId,
      ...recordData
    }])
    .select()
    .single();
  return data;
};

export const listPatientRecords = async (patientId, filters = {}) => {
  let query = supabase
    .from("patient_records")
    .select(`
      *,
      professional:professional_id(id, name)
    `)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (filters.recordType && filters.recordType !== "all") {
    query = query.eq("record_type", filters.recordType);
  }

  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  const { data } = await query;
  return data;
};

// 3. Implementar imutabilidade (soft delete ou versionamento):
export const deletePatientRecord = async (recordId) => {
  // Nunca deletar! Apenas marcar como inativo
  const { data } = await supabase
    .from("patient_records")
    .update({ is_deleted: true })
    .eq("id", recordId)
    .select()
    .single();
  return data;
};
```

---

## 🔄 FASE 3: INTEGRAÇÕES COM OUTROS MÓDULOS

### Integração Agenda → Pacientes (⏱️ 1-2 horas)

**Em `src/pages/clinica/agenda/AgendaPage.jsx`:**

```javascript
import { usePatientContext } from "@/contexts/PatientContext";

export default function AgendaPage() {
  const { activePatientId, patientData, loadPatient } = usePatientContext();
  const [selectedPatientId, setSelectedPatientId] = useState(activePatientId);

  // Se clicar em um paciente na lista:
  const handleSelectPatient = async (patientId) => {
    await loadPatient(patientId);
    setSelectedPatientId(patientId);
  };

  // Botão para ir para prontuário do paciente:
  const goToPatientProntuario = () => {
    if (activePatientId) {
      navigate(`/clinica/pacientes/${activePatientId}/prontuario`);
    }
  };

  return (
    <div>
      {patientData && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <p>Paciente: <strong>{patientData.name}</strong></p>
          <button onClick={goToPatientProntuario}>
            Ver Prontuário Completo
          </button>
        </div>
      )}
      {/* resto da agenda */}
    </div>
  );
}
```

### Integração Faturamento → Pacientes (⏱️ 1-2 horas)

```javascript
import { usePatientContext } from "@/contexts/PatientContext";
import { financeApi } from "@/lib/financeApi";

export function PatientFinanceTab({ patientId }) {
  const [receivables, setReceivables] = useState([]);
  const [payables, setPayables] = useState([]);

  useEffect(() => {
    // Contas a receber do paciente
    financeApi.listReceivables({ 
      patientId 
    }).then(setReceivables);
  }, [patientId]);

  return (
    <div>
      <h3>Faturamento do Paciente</h3>
      <p>Contas em aberto: {receivables.length}</p>
      {receivables.length > 0 && (
        <div className="bg-red-50 p-4 rounded-lg">
          <h4>Contas Pendentes</h4>
          {receivables.map(r => (
            <div key={r.id} className="flex justify-between">
              <span>{r.description}</span>
              <span>R$ {r.amount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 🧪 FASE 4: TESTES E VALIDAÇÃO

### 1. Testes Unitários
```bash
npm test -- --testPathPattern=PatientContext
npm test -- --testPathPattern=patientsApi
npm test -- --testPathPattern=PatientListPage
```

### 2. Testes E2E
```bash
# Usar Cypress ou Playwright para testar:
cy.visit("/clinica/pacientes");
cy.get("[data-testid=new-patient-btn]").click();
cy.get("[data-testid=patient-name]").type("João Silva");
// ... etc
```

### 3. Performance
```javascript
// Medir tempo de carregamento
const start = performance.now();
await loadPatient(patientId);
const duration = performance.now() - start;
console.log(`Carregamento levou ${duration}ms`);
```

---

## 📱 FASE 5: MELHORIAS OPCIONAIS

### 1. **Busca Avançada com Filtros**
- Filtrar por data de cadastro
- Filtrar por status (Completo/Incompleto)
- Filtrar por convênio principal
- Ordenar por nome/data/idade

### 2. **Exportar Dados**
- Exportar lista em CSV
- Exportar prontuário em PDF
- Gerar relatório de pacientes

### 3. **Importação em Lote**
- Upload CSV com múltiplos pacientes
- Validação e preview antes de importar

### 4. **Notificações**
- Alertar quando documentos estão vencidos
- Alertar quando convênios vençam
- Lembretes de acompanhamento

### 5. **Dashboard Analytics**
- Pacientes cadastrados por mês
- Taxa de cadastro completo
- Distribuição por convênio
- Inadimplência por período

---

## 🔐 CHECKLIST DE SEGURANÇA

- [ ] Validar permissões de acesso ao paciente
- [ ] Usar RLS (Row Level Security) no Supabase
- [ ] Encriptar dados sensíveis (CPF, etc)
- [ ] Auditar acessos ao prontuário
- [ ] Limpar dados ao deslogar
- [ ] Validar uploads de arquivos (tipo, tamanho)
- [ ] Rate limiting para busca de pacientes

---

## 📈 MÉTRICAS DE SUCESSO

- ✅ Zero erros 404 em rotas de paciente
- ✅ Tempo de carregamento < 2s
- ✅ 95%+ taxa de sucesso em validação
- ✅ 100% compatibilidade mobile
- ✅ < 5% taxa de erro em submissões

---

## 🎯 TIMELINE RECOMENDADA

| Fase | Duração | Status |
|------|---------|--------|
| 1. Implementação | ✅ Completo | ✅ |
| 2. API + Documentos | 3-5 dias | ⏳ Próximo |
| 3. Integrações | 2-3 dias | ⏳ |
| 4. Testes | 2 dias | ⏳ |
| 5. Deploy Beta | 1 dia | ⏳ |
| 6. Feedback + Ajustes | 3-5 dias | ⏳ |
| 7. Deploy Produção | 1 dia | ⏳ |

---

## 👥 ATRIBUIÇÕES

| Tarefa | Responsável | Data |
|--------|-------------|------|
| API de Pacientes | Dev 1 | - |
| Upload de Documentos | Dev 2 | - |
| Convênios | Dev 3 | - |
| Prontuário | Dev 4 | - |
| Integrações | Dev 1 + 2 | - |
| Testes | QA | - |

---

## 📞 SUPORTE

Dúvidas sobre implementação? Verifique:
1. `MODULO_PACIENTES_REFACTORING_COMPLETO.md` - Visão geral
2. `EXEMPLOS_INTEGRACAO_PACIENTES.js` - Padrões de código
3. `TESTE_COMPLETO_PACIENTES.md` - Como testar

---

**Versão:** 1.0
**Data:** 14/01/2026
**Status:** PRONTO PARA DESENVOLVIMENTO

