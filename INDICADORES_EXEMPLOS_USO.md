# 📸 EXEMPLOS DE USO - MÓDULO INDICADORES

## 🎨 LAYOUTS VISUAIS

### Desktop View (1200px+)

```
┌─────────────────────────────────────────────────────────────────────┐
│  📊 Indicadores da Agenda                    🔄 [Atualizar]          │
│  Data: 14/01/2026 • Atualizado: 10:30:45                            │
├─────────────────────────────────────────────────────────────────────┤
│                        ⚠️ ALERTAS                                    │
│ ┌────────────────────────────────────────────────────────────────┐  │
│ │ 🔴 Taxa de ocupação abaixo de 40%. Considere revisar...   [▼]  │  │
│ │ 🔴 Mais de 15% dos agendamentos resultaram em faltas.      [▼]  │  │
│ └────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                     ✅ STATUS GERAL: SAUDÁVEL                       │
├─────────────────────────────────────────────────────────────────────┤
│  GRID DE INDICADORES (4 colunas)                                    │
│ ┌──────────┬──────────┬──────────┬──────────┐                      │
│ │ 📅       │ ✅       │ ❌       │ ➕       │                      │
│ │ Taxa     │ Total    │ Faltas   │ Encaixes│                      │
│ │ Ocupação │ Agend.   │          │         │                      │
│ │          │          │          │         │                      │
│ │   35%    │    10    │    1     │    2    │                      │
│ │   🔴     │   🟡     │   🔴     │   🟢    │                      │
│ └──────────┴──────────┴──────────┴──────────┘                      │
│ ┌──────────┬──────────┬──────────┬──────────┐                      │
│ │ ✅       │ 👥       │ 📅       │ ⏱️       │                      │
│ │ Confirm. │ Profiss. │ Slots    │ Tempo    │                      │
│ │          │ Ativos   │ Livres   │ Checkin  │                      │
│ │          │          │          │          │                      │
│ │    9     │    2     │   15     │  12 min  │                      │
│ │   🟢     │   🟢     │   ⚫     │   🟡     │                      │
│ └──────────┴──────────┴──────────┴──────────┘                      │
├─────────────────────────────────────────────────────────────────────┤
│  💰 INDICADORES FINANCEIROS (4 colunas - Gestor/Admin)              │
│ ┌──────────┬──────────┬──────────┬──────────┐                      │
│ │ 💵       │ 💵       │ 🎯       │ 📊       │                      │
│ │ Receita  │ Receita  │ Meta     │ % Meta   │                      │
│ │ Dia      │ Hora     │ Dia      │ Atingida │                      │
│ │          │          │          │          │                      │
│ │ R$ 500   │ R$ 62.50 │ R$ 5000  │  10%     │                      │
│ │   🔴     │   🟡     │   🟢     │   🔴     │                      │
│ └──────────┴──────────┴──────────┴──────────┘                      │
├─────────────────────────────────────────────────────────────────────┤
│  📅 RESUMO DE SLOTS                                                  │
│  Ocupação: 5/20 slots utilizados                                    │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 25%                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Tablet View (768px)

```
┌─────────────────────────────────┐
│ 📊 Indicadores        🔄        │
│ Data: 14/01/2026               │
├─────────────────────────────────┤
│  ⚠️ ALERTAS                     │
│ ┌──────────────────────────────┐│
│ │ 🔴 Taxa ocupação... [▼]      ││
│ │ 🔴 Muitas faltas... [▼]      ││
│ └──────────────────────────────┘│
├─────────────────────────────────┤
│ ✅ STATUS: SAUDÁVEL             │
├─────────────────────────────────┤
│ GRID (3 colunas)               │
│ ┌────────┬────────┬────────┐   │
│ │ Taxa   │ Total  │ Faltas │   │
│ │ Ocupação│ Agend.│        │   │
│ │  35%   │  10   │   1    │   │
│ │  🔴    │  🟡   │  🔴    │   │
│ ├────────┼────────┼────────┤   │
│ │ Confirm│ Profis │ Slots  │   │
│ │   9    │  2     │  15    │   │
│ │  🟢    │  🟢    │  ⚫    │   │
│ └────────┴────────┴────────┘   │
│ ┌────────┐                      │
│ │ Tempo  │                      │
│ │Checkin │                      │
│ │ 12min  │                      │
│ │  🟡    │                      │
│ └────────┘                      │
├─────────────────────────────────┤
│ 💰 FINANCEIRO                   │
│ ┌────────┬────────────────────┐│
│ │ Receita│ R$ 500             ││
│ │ Dia    │                    ││
│ │        │ 🔴                 ││
│ ├────────┼────────────────────┤│
│ │ Meta   │ R$ 5000            ││
│ │ Dia    │                    ││
│ │        │ 🟢                 ││
│ ├────────┼────────────────────┤│
│ │ % Meta │ 10%                ││
│ │ Atingida│                    ││
│ │        │ 🔴                 ││
│ └────────┴────────────────────┘│
├─────────────────────────────────┤
│ 📅 SLOTS: 5/20                 │
│ ████████░░░░░░░░░░░░░░░░░░░░░  │
└─────────────────────────────────┘
```

---

### Mobile View (360px)

```
┌──────────────────┐
│ 📊 Indicadores   │
│ [Atualizar] 🔄   │
├──────────────────┤
│ ⚠️ 2 ALERTAS    │
│ [Ver mais]  [▼]  │
├──────────────────┤
│ ✅ SAUDÁVEL      │
├──────────────────┤
│ GRID (2 colunas) │
│ ┌──────┬──────┐  │
│ │ Taxa │ Total│  │
│ │Ocup. │Agend│  │
│ │      │     │  │
│ │ 35%  │ 10  │  │
│ │ 🔴   │ 🟡  │  │
│ ├──────┼──────┤  │
│ │Faltas│Confirm│ │
│ │      │      │  │
│ │  1   │  9   │  │
│ │ 🔴   │ 🟢   │  │
│ ├──────┼──────┤  │
│ │Profis│Slots │  │
│ │      │ Livr │  │
│ │  2   │  15  │  │
│ │ 🟢   │ ⚫   │  │
│ ├──────┼──────┤  │
│ │Tempo │      │  │
│ │Chck  │      │  │
│ │12min │      │  │
│ │ 🟡   │      │  │
│ └──────┴──────┘  │
├──────────────────┤
│ 💰 FINANCEIRO    │
│ ┌──────────────┐ │
│ │ Receita: R$  │ │
│ │ 500 🔴       │ │
│ ├──────────────┤ │
│ │ Meta: R$     │ │
│ │ 5000 🟢      │ │
│ ├──────────────┤ │
│ │ % Meta: 10%  │ │
│ │ 🔴           │ │
│ └──────────────┘ │
├──────────────────┤
│ SLOTS: 5/20      │
│ ████░░░░░░░░░░░  │
└──────────────────┘
```

---

## 💻 EXEMPLOS DE CÓDIGO

### Exemplo 1: Usar em Componente Existente

```jsx
// Em src/pages/clinica/agenda/AgendaPage.jsx

import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import AgendaIndicators from './components/AgendaIndicators';

export default function AgendaPage() {
  const { user, currentRole } = useAuth();
  const { clinicId } = useClinicContext();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  return (
    <div>
      {/* Seus filtros e componentes existentes */}
      
      {/* Adicione indicadores aqui */}
      {clinicId && (
        <AgendaIndicators 
          clinicId={clinicId}
          date={selectedDate}
          currentRole={currentRole}
          onAlertsChange={(alerts) => {
            console.log('Novos alertas:', alerts);
            // Você pode fazer algo com os alertas
          }}
        />
      )}
      
      {/* Resto do conteúdo */}
    </div>
  );
}
```

---

### Exemplo 2: Chamar API Manualmente

```javascript
// Em qualquer componente ou função
import { 
  getAgendaIndicators, 
  generateAlerts, 
  getHealthStatus 
} from '@/lib/indicatorsApi';

// Buscar indicadores de uma clínica e data
const fetchMyIndicators = async () => {
  try {
    const indicators = await getAgendaIndicators(
      'abc123-clinic-id',
      '2026-01-14',
      'prof456' // opcional - para filtrar por profissional
    );
    
    console.log('📊 Indicadores carregados:', indicators);
    
    // Gerar alertas
    const alerts = generateAlerts(indicators);
    console.log('🚨 Alertas:', alerts);
    
    // Obter status de saúde
    const health = getHealthStatus(indicators);
    console.log('❤️ Status de saúde:', health); // 'healthy', 'warning', 'critical'
    
    // Usar dados
    return { indicators, alerts, health };
  } catch (error) {
    console.error('❌ Erro:', error);
  }
};

// Chamar
await fetchMyIndicators();
```

---

### Exemplo 3: Usar com Refresh Automático

```jsx
import AgendaIndicators from './components/AgendaIndicators';
import { useState, useEffect } from 'react';

function MyAgendaDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const clinicId = 'seu-clinic-id';
  const date = '2026-01-14';
  
  // Refresh a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(k => k + 1);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <AgendaIndicators 
      key={refreshKey} // Força re-render a cada 30s
      clinicId={clinicId}
      date={date}
      currentRole="gestor"
    />
  );
}
```

---

### Exemplo 4: Filtrar por Profissional

```jsx
import AgendaIndicators from './components/AgendaIndicators';

function ProfessionalDashboard() {
  const userProfessionalId = 'prof-123'; // ID do profissional logado
  
  return (
    <AgendaIndicators 
      clinicId="clinic-123"
      date="2026-01-14"
      professionalId={userProfessionalId} // Ver apenas seus indicadores
      currentRole="profissional"
      onAlertsChange={(alerts) => {
        // Apenas este profissional vê seus alertas
        alerts.forEach(alert => {
          console.log(`⚠️ ${alert.message}`);
        });
      }}
    />
  );
}
```

---

### Exemplo 5: Exportar para CSV

```javascript
import { getAgendaIndicators, exportIndicatorsToCSV } from '@/lib/indicatorsApi';

async function downloadIndicatorsReport() {
  try {
    // Buscar indicadores
    const indicators = await getAgendaIndicators('clinic-123', '2026-01-14');
    
    // Exportar para CSV
    const csv = exportIndicatorsToCSV([indicators]); // Array com um objeto
    
    // Fazer download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `indicadores_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  } catch (error) {
    console.error('Erro ao exportar:', error);
  }
}

// Usar em botão
<button onClick={downloadIndicatorsReport}>
  📥 Exportar CSV
</button>
```

---

## 🎭 CENÁRIOS REAIS

### Cenário 1: Gestor Checando Clínica Pela Manhã

```javascript
// 8:00 AM - Gerente chega e abre dashboard
const indicators = await getAgendaIndicators(clinicId, today);

// Sistema avisa:
// 🔴 "Taxa de ocupação abaixo de 40%. Considere revisar horários."
// 🟡 "Tempo médio de check-in acima de 15 minutos."

// Gestor vê que:
// - 35% ocupação (TARGET: 70%)
// - R$ 500 arrecadados (META: R$ 5000)
// - 2 profissionais ativos
// - 12 min tempo médio de checkin

// Ações:
// 1. Revisar capacidade (talvez fechar período)
// 2. Treinar recepção (checkin lento)
// 3. Promover agendamentos para aumentar receita
```

---

### Cenário 2: Profissional Vendo Seu Desempenho

```javascript
// Dr. Silva (profissional) abre agenda
const myIndicators = await getProfessionalIndicators(
  clinicId, 
  'prof-silva-id', 
  today
);

// Vê seus próprios indicadores:
// ✅ 5 agendamentos confirmados
// ❌ 1 falta (20% taxa)
// ⏱️ Tempo médio: 45 min por paciente

// Não vê (permissão denegada):
// ❌ Receita
// ❌ Ocupação geral
// ❌ Indicadores de outros
```

---

### Cenário 3: Recepcionista Monitorando Slots

```javascript
// Recepcionista monitora disponibilidade
const indicators = await getAgendaIndicators(clinicId, today);

// Vê:
// ✅ 15 slots livres
// ✅ 10 agendamentos totais
// ✅ 9 confirmados

// Ações:
// 1. Se slots < 5: "Aviso gestor"
// 2. Se faltas > 15%: "Conferir com pacientes"
// 3. Se 0 profissionais: "Impedir novos agendamentos"
```

---

## 🧪 DADOS DE TESTE

### Teste 1: Ocupação Baixa

```sql
-- Criar cenário: ocupação 25% (3/12 slots)
INSERT INTO appointments VALUES
  (UUID(), clinic_id, prof_id, '2026-01-14', 'confirmed'),
  (UUID(), clinic_id, prof_id, '2026-01-14', 'confirmed'),
  (UUID(), clinic_id, prof_id, '2026-01-14', 'confirmed');

-- Resultado esperado:
-- Taxa ocupação: 25% 🔴 (< 40%)
-- Alerta: "Taxa de ocupação abaixo de 40%"
-- Status: CRÍTICO 🚨
```

---

### Teste 2: Muitas Faltas

```sql
-- Criar cenário: 20% de faltas (2/10)
INSERT INTO appointments VALUES
  (UUID(), clinic_id, prof_id, '2026-01-14', 'no_show'),
  (UUID(), clinic_id, prof_id, '2026-01-14', 'no_show'),
  -- ... 8 mais confirmados
;

-- Resultado esperado:
-- Taxa de faltas: 20% 🔴 (> 15%)
-- Alerta: "Mais de 15% dos agendamentos resultaram em faltas"
// Status: ALERTA 🟡
```

---

### Teste 3: Meta Não Atingida

```sql
-- Criar cenário: receita R$ 500 vs meta R$ 5000
-- Services com baixo valor
INSERT INTO services VALUES
  (UUID(), clinic_id, 'Consulta', 50.00),
  (UUID(), clinic_id, 'Renovação', 100.00);

-- Resultado esperado:
-- Receita: R$ 500 (5 consultas)
// Meta: R$ 5000
// % Meta: 10% 🔴 (< 70%)
// Alerta: "Receita está abaixo de 70% da meta diária"
```

---

## 📱 RESPONSIVIDADE

### Breakpoints Suportados

| Tamanho | Colunas | Exemplo |
|---------|---------|---------|
| 📱 < 640px | 2 cols | iPhone 12/13 |
| 📱 640px-768px | 2 cols | iPad Mini |
| 🖥️ 768px-1024px | 3 cols | iPad / Tablet |
| 🖥️ 1024px-1280px | 4 cols | Laptop |
| 🖥️ > 1280px | 4 cols | Desktop |

---

## 🎨 CORES E SIGNIFICADOS

```javascript
// Operacional (Todos veem)
🟢 Verde   = Bom (ocupação > 70%, agendamentos > 10)
🟡 Amarelo = Atenção (ocupação 40-70%, tempo > 15min)
🔴 Vermelho= Crítico (ocupação < 40%, faltas > 15%)

// Financeiro (Gestor/Admin)
🟢 Verde   = Meta atingida (> 80%)
🟡 Amarelo = Atenção (70-80% meta)
🔴 Vermelho= Crítico (< 70% meta)

// Status Geral
✅ Saudável   = Todos os KPIs verdes
⚠️  Atenção   = Alguns amarelos
🚨 Crítico   = Um ou mais vermelhos
```

---

## ✨ CONCLUSÃO

O módulo de indicadores oferece:

✅ **Visualização clara** de KPIs operacionais e financeiros
✅ **Alertas inteligentes** que ajudam a tomar decisões
✅ **Permissões por papel** para segurança
✅ **UI responsiva** para qualquer dispositivo
✅ **Fácil integração** em componentes existentes

Pronto para usar e evoluir!

---

Desenvolvido para **Gesclinic Web** ❤️
