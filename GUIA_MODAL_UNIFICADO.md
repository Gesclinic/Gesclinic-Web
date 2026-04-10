# 🎯 Guia de Integração - Modal Unificado de Agendamento + Recepção

## 📌 Visão Geral

Criamos um **novo componente unificado e moderno** que funciona tanto para **Agendamento** quanto para **Atendimento/Recepção**, mantendo o design elegante com abas inteligentes.

### Arquivo Principal
```
src/pages/clinica/recepcao/components/AppointmentUnitedModal.jsx
```

## 🚀 Como Usar

### 1️⃣ Modo: Novo Agendamento (`mode="new"`)

**Abas mostradas:**
- 📅 **Dados do Agendamento** - Data, hora, profissional, serviço, paciente, etc
- 👤 **Dados Cadastrais** - Nome, CPF, telefone, endereço (TISS)
- 💳 **Pagamento** (apenas se particular) - Forma de pagamento, valores
- ✓ **Liberação** (apenas se convênio faturado) - Carteira, autorização
- 💰 **Faturamento** (apenas se convênio faturado) - Guia TISS, valores

**Exemplo de uso:**

```jsx
import AppointmentUnitedModal from '@/pages/clinica/recepcao/components/AppointmentUnitedModal';

export default function AgendaView() {
  const [modalOpen, setModalOpen] = useState(false);
  const [professionals, setProfessionals] = useState([]);
  const [services, setServices] = useState([]);
  const [payers, setPayers] = useState([]);
  const [rooms, setRooms] = useState([]);

  return (
    <>
      <button onClick={() => setModalOpen(true)}>
        📅 Novo Agendamento
      </button>

      <AppointmentUnitedModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode="new"
        professionals={professionals}
        services={services}
        payers={payers}
        rooms={rooms}
        onSuccess={() => {
          // Recarregar agenda
          console.log('✅ Agendamento criado!');
        }}
      />
    </>
  );
}
```

### 2️⃣ Modo: Editar Agendamento (`mode="edit"`)

**Abas mostradas:**
- 📅 **Dados do Agendamento** - Data, hora, profissional, serviço, etc (com valores preenchidos)
- 👤 **Dados Cadastrais** - Dados do paciente
- 💳 **Pagamento** / **Liberação** / **Faturamento** (conforme tipo de convênio)

**Exemplo de uso:**

```jsx
<AppointmentUnitedModal
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  mode="edit"
  appointment={appointmentToEdit}
  professionals={professionals}
  services={services}
  payers={payers}
  rooms={rooms}
  onSuccess={() => {
    console.log('✅ Agendamento atualizado!');
  }}
/>
```

### 3️⃣ Modo: Atendimento/Recepção (`mode="reception"`)

**Abas mostradas:**
- 👤 **Dados Cadastrais** - Editar dados do paciente se necessário
- ✓ **Liberação** (apenas se convênio faturado)
- 💰 **Faturamento** (apenas se convênio faturado)
- 💳 **Pagamento** (apenas se particular)
- ✅ **Resumo Final** - Revisão antes de liberar para atendimento

**Exemplo de uso (em RecepcaoDrawer):**

```jsx
<AppointmentUnitedModal
  isOpen={atendimentoOpen}
  onClose={() => setAtendimentoOpen(false)}
  mode="reception"
  appointment={selectedAppointment}
  arrivals={arrivals}
  onArrivalsUpdate={(newArrivals) => setArrivals(newArrivals)}
  onSuccess={() => {
    // Recarregar agendamentos
    loadAppointmentsForToday();
  }}
/>
```

## 📋 Props Disponíveis

| Prop | Tipo | Descrição |
|------|------|-----------|
| `isOpen` | `boolean` | Controla se modal está aberto |
| `onClose` | `function` | Callback ao fechar modal |
| `mode` | `'new' \| 'edit' \| 'reception'` | Modo de operação |
| `appointment` | `object` | Agendamento (necessário para edit/reception) |
| `arrivals` | `object` | Objeto com chegadas (para reception) |
| `onArrivalsUpdate` | `function` | Callback ao atualizar chegadas |
| `onSuccess` | `function` | Callback ao sucesso |
| `professionals` | `array` | Lista de profissionais |
| `services` | `array` | Lista de serviços |
| `payers` | `array` | Lista de convênios/pagadores |
| `rooms` | `array` | Lista de salas |

## 🎨 Características Principais

✅ **Moderno:** Design elegante com Tailwind CSS, inspirado no Anexo 2
✅ **Responsivo:** Funciona bem em diferentes tamanhos de tela
✅ **Inteligente:** Abas aparecem dinamicamente conforme o tipo de convênio
✅ **Validação:** Campos obrigatórios validados em tempo real
✅ **Integrado:** Com dados TISS (Padrão de faturamento em saúde)
✅ **Unificado:** Mesma interface para agenda, recepção e atendimento

## 🔧 Integração com Agenda

Para integrar com a Agenda existente, substitua o `ModalCriarAgendamento` por:

```jsx
// ❌ Antigo:
import ModalCriarAgendamento from '@/pages/clinica/agenda/components/ModalCriarAgendamento';

// ✅ Novo:
import ModalCriarAgendamentoUnificado from '@/pages/clinica/agenda/components/ModalCriarAgendamentoUnificado';
```

## 📝 Estados Internos

O modal gerencia automaticamente os seguintes estados:

### Agendamento (`agendamentoData`)
- Data, hora, duração
- Profissional, serviço, sala
- Paciente, telefone, prontuário
- Convênio, plano, valor
- Observações, status

### Cadastral (`cadastralData`)
- Nome, CPF/RG, data de nascimento
- Telefone, celular, email
- Endereço completo (TISS)

### Liberação (`liberacaoData`)
- Nº carteira/matrícula
- Nº autorização e validade
- Status da autorização
- Flag de autorizado

### Faturamento (`faturamentoData`)
- Nº guia TISS
- Código procedimento
- Tipo de código (TUSS/CPT)
- Valores estimado/autorizado

### Pagamento (`pagamentoData`)
- Forma de pagamento
- Valores de pagamento/recebido
- Troco
- Parcelamento (cartão)

## 🎯 Próximos Passos

1. ✅ **Criar novo modal unificado** (DONE)
2. ✅ **Integrar com RecepcaoDrawer** (DONE)
3. ⏳ **Integrar com AgendaLayout** - Substituir ModalCriarAgendamento
4. ⏳ **Integrar com AgendaDayView** - Substituir ModalCriarAgendamento
5. ⏳ **Adicionar suporte a salvamento de agendamentos**
6. ⏳ **Testes e validação completa**

## 💡 Dicas de Implementação

### Para Agenda (Novo Agendamento)
- Use `mode="new"` para criar novos agendamentos
- O modal voltará automaticamente para a aba "Dados" ao abrir
- O estado `onSuccess` callback deve recarregar a agenda

### Para Recepção (Atendimento)
- Use `mode="reception"` para atender pacientes
- O modal começa na aba "Cadastrais"
- Finalize na aba "Resumo Final" e clique em "Liberar para Atendimento"

### Para Editar Agendamento
- Use `mode="edit"` para editar agendamentos existentes
- Passe o agendamento via prop `appointment`
- Os dados são pré-carregados automaticamente

## 📞 Suporte

Para dúvidas ou problemas com a integração, verifique o arquivo:
`src/pages/clinica/recepcao/components/AppointmentUnitedModal.jsx`
