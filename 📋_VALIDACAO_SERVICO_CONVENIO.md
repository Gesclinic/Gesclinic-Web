# ✅ Validação de Serviço x Convênio - Implementação Completa

## 🎯 Problema Identificado
O sistema permitia alterar um agendamento para um convênio que **não possui o serviço selecionado** cadastrado na tabela de preços.

**Exemplo do erro:**
- Agendamento: Eletroencefalograma Especial
- Convênio original: Particular
- Problema: Usuário altera para "Unimed Cascavél - PR" sem verificar se este convênio oferece este serviço

## 🔧 Solução Implementada

### 1. **API Function: `validateServicePayerAvailability()`**
**Arquivo:** `src/lib/appointmentsApi.js`

Função que consulta a tabela `service_prices` para verificar se um serviço está disponível para um convênio:

```javascript
export async function validateServicePayerAvailability(serviceId, payerId, clinicId) {
  // Retorna: { available: boolean, price?: number, coPayment?: number }
  // Consulta: SELECT * FROM service_prices 
  //           WHERE service_id = X AND payer_id = Y AND clinic_id = Z AND active = true
}
```

**Parâmetros:**
- `serviceId` (UUID): ID do serviço
- `payerId` (UUID): ID do convênio
- `clinicId` (UUID): ID da clínica

**Retorno:**
```json
{
  "available": true/false,
  "price": 150.00,
  "coPayment": 30.00
}
```

### 2. **Estado de Validação no Modal**
**Arquivo:** `src/pages/clinica/agenda/components/AppointmentUnitedModal.jsx` (linha ~410)

```javascript
const [servicePayerValidation, setServicePayerValidation] = useState({
  isValid: true,      // true = disponível | false = não disponível
  checking: false,    // em processo de validação
  price: null,        // preço do serviço para o convênio
  coPayment: null     // copagamento
});
```

### 3. **Validação ao Alterar Convênio**
**Local:** Select de Convênio (Tab "Pagamento")

Quando o usuário seleciona um novo convênio:
1. ✅ Verifica se já há um serviço selecionado
2. ✅ Se sim, valida se esse serviço existe no novo convênio
3. ✅ Atualiza `servicePayerValidation` com o resultado
4. ✅ Se não disponível, mostra aviso visual

```javascript
onValueChange={(value) => {
  // ... código existente ...
  
  // ✅ VALIDAR SE SERVIÇO ESTÁ DISPONÍVEL NESTE CONVÊNIO
  if (agendamentoData.serviceId && value && clinicId) {
    const result = await validateServicePayerAvailability(
      agendamentoData.serviceId,
      value,
      clinicId
    );
    setServicePayerValidation({ isValid: result.available, ... });
  }
}}
```

### 4. **Validação ao Alterar Serviço**
**Local:** Select de Serviço (Tab "Dados do Agendamento")

Quando o usuário seleciona um novo serviço:
1. ✅ Verifica se já há um convênio selecionado
2. ✅ Se sim, valida se esse novo serviço existe naquele convênio
3. ✅ Atualiza `servicePayerValidation` com o resultado
4. ✅ Se não disponível, mostra aviso visual

### 5. **Aviso Visual (Alert Box)**
**Local:** Abaixo do Select de Convênio

```jsx
{agendamentoData.payerId && agendamentoData.serviceId && !servicePayerValidation.isValid && (
  <div className="mt-2 p-2 bg-red-50 border border-red-300 rounded flex items-start gap-2">
    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
    <div className="text-sm text-red-700">
      <strong>⚠️ Atenção:</strong> Este serviço não está cadastrado na tabela de preços 
      para o convênio "{payers.find(p => p.id === agendamentoData.payerId)?.name}". 
      <br />
      <span className="text-xs">Você pode prosseguir, mas deverá informar o valor manualmente.</span>
    </div>
  </div>
)}
```

**Exibição:**
- ✅ Mostra quando: serviço selecionado + convênio selecionado + não disponível
- ✅ Esconde quando: serviço ou convênio vazios, ou serviço disponível
- ✅ Cor: Vermelho/Laranja para alertar o usuário
- ✅ Permite continuar: Usuário pode salvar, mas precisa informar valor manualmente

## 📊 Fluxo de Validação

```
┌─────────────────────────────────────────┐
│ MODAL ABERTO                            │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────▼──────────┐
        │ Usuário seleciona   │
        │ Serviço?            │
        └──────────┬──────────┘
                   │
      ┌────────────▼────────────┐
      │ Já há Convênio?         │
      └────────────┬────────────┘
                   │
        ┌──────────▼──────────┐
        │ Validar no BD:      │
        │ service_prices      │
        │ (async query)       │
        └──────────┬──────────┘
                   │
     ┌─────────────▼─────────────┐
     │ Disponível?               │
     └─────────────┬─────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
     SIM│                    │NÃO
        │                     │
        ▼                     ▼
   ✅ Esconde          ⚠️ Mostra
   aviso               aviso

┌──────────────────────────────────────┐
│ MESMO FLUXO AO ALTERAR CONVÊNIO      │
│ (verifica se serviço existe no novo)  │
└──────────────────────────────────────┘
```

## 🗄️ Tabela de Referência: `service_prices`

```sql
CREATE TABLE service_prices (
  id UUID PRIMARY KEY,
  clinic_id UUID,           -- Clínica
  service_id UUID,          -- FK → services
  payer_id UUID,            -- FK → health_insurances (convênios)
  price DECIMAL(12, 2),     -- Preço negociado
  base_price DECIMAL(12, 2),-- Preço base
  co_pay DECIMAL(12, 2),    -- Copagamento
  active BOOLEAN,           -- Status
  created_at, updated_at
);
```

**Índices:**
- `service_id` (buscar serviços de um payer)
- `payer_id` (buscar payers de um serviço)
- `(service_id, payer_id, clinic_id)` composto

## 💡 Casos de Uso

### Caso 1: Serviço NÃO disponível no convênio
```
1. Usuário cria agendamento com serviço "Ecografia" (Particular)
2. Muda convênio para "Unimed"
3. Sistema valida: Ecografia NÃO cadastrada para Unimed
4. Mostra aviso: "Este serviço não está cadastrado..."
5. Usuário pode:
   a) Voltar a "Particular" (sem aviso)
   b) Prosseguir em "Unimed" (informa preço manualmente)
   c) Mudar para outro serviço (que esteja disponível)
```

### Caso 2: Validação ao mudar serviço
```
1. Agendamento com convênio "Bradesco Saúde" pré-selecionado
2. Usuário muda serviço para "Ressonância Magnética"
3. Sistema valida: Ressonância NÃO tem preço para Bradesco
4. Mostra aviso indicando que precisa de preço manual
```

### Caso 3: Tudo disponível (sem aviso)
```
1. Agendamento com "Consulta" + "Unimed"
2. Ambos existem em service_prices
3. Aviso NÃO é exibido
4. Sistema pode pré-preencher preço automático (futuro)
```

## 🚀 Próximos Passos Sugeridos

1. **Auto-preenchimento de preço**: Se serviço está disponível, preencher automaticamente o campo de valor com `service_prices.price`

2. **Validação ao salvar**: Bloquear save se serviço não está disponível (em vez de apenas avisar)

3. **Buscar serviços por convênio**: Filtrar lista de serviços para mostrar apenas os que estão disponíveis para o convênio selecionado

4. **Sincronização do copagamento**: Preencher automaticamente campo de copagamento (`co_pay`) quando disponível

## 📝 Teste Manual

1. Abra um agendamento existente
2. Mude o serviço para algo que existe em service_prices
3. Mude o convênio para um que **não** possui esse serviço
4. Observe: Aviso vermelho deve aparecer abaixo do convênio
5. Mude novamente para um convênio que **possui** o serviço
6. Observe: Aviso deve desaparecer

## ✅ Status de Implementação

| Funcionalidade | Status | Arquivo |
|---|---|---|
| API de validação | ✅ Implementado | `appointmentsApi.js` |
| Estado de validação | ✅ Implementado | `AppointmentUnitedModal.jsx` |
| Validação ao mudar convênio | ✅ Implementado | `AppointmentUnitedModal.jsx` |
| Validação ao mudar serviço | ✅ Implementado | `AppointmentUnitedModal.jsx` |
| Aviso visual | ✅ Implementado | `AppointmentUnitedModal.jsx` |
| Build sem erros | ✅ Validado | npm run build |

## 📌 Notas Importantes

- ✅ A validação não bloqueia o save (apenas avisa)
- ✅ O usuário pode forçar o agendamento sem o serviço em service_prices
- ✅ Nenhum dado é alterado no banco, apenas validação local
- ✅ Funciona para ambas as situações: mudar serviço ou mudar convênio
