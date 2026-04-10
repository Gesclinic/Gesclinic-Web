# ETAPA 6 ✅ - Validações e Regras UX

## 🎯 Objetivo
Implementar validações avançadas, selects dinâmicos, health checks e alertas inteligentes para melhorar a experiência do usuário e prevenir erros.

## 📦 Componentes Criados

### 1. **useFormValidation** - Hook de Validação Avançada
**Localização:** `src/hooks/useFormValidation.js`
**Linhas:** ~150
**Funcionalidades:**
- Validação síncrona e assincronas em tempo real
- Rastreamento de campos tocados (touched)
- Estado de validação por campo
- Validadores pré-built (required, email, phone, CPF, etc)
- Composição de validadores

**Exemplo de Uso:**
```javascript
const formik = useFormValidation(
  { email: '', password: '' },
  async (fieldName, value, allValues) => {
    if (fieldName === 'email') {
      const result = validators.email(value);
      if (result.error) return result;
      // Validação assincróna
      const exists = await checkEmailExists(value);
      return { error: exists ? 'Email já cadastrado' : null };
    }
    return { error: null };
  }
);
```

### 2. **ValidatedFormField** - Campo com Feedback Visual
**Localização:** `src/components/ValidatedFormField.jsx`
**Tipo:** Componente React
**Funcionalidades:**
- Input, Select, Textarea com validação
- Ícones de status (✓ válido, ✗ erro, ⏳ validando)
- Mensagens de erro e ajuda
- Suporte a ícones no label
- Versões: Normal, Compact, Group
- Classes Tailwind dinâmicas

**Exemplo:**
```javascript
<ValidatedFormField
  label="Email"
  name="email"
  type="email"
  value={formik.values.email}
  error={formik.errors.email}
  touched={formik.touched.email}
  validating={formik.validating.email}
  onChange={formik.setFieldValue}
  onBlur={formik.setFieldTouched}
  required
/>
```

### 3. **HealthCheckMonitor** - Monitor de Saúde do Sistema
**Localização:** `src/components/HealthCheckMonitor.jsx`
**Linhas:** ~230
**Verifica:**
- ✅ Profissionais cadastrados
- ✅ Serviços disponíveis
- ✅ Salas configuradas
- ✅ Convênios cadastrados
- ✅ Regras de agenda
- ✅ Conexão com database
- ✅ Status geral da clínica

**Comportamento:**
- Mostra badges com contagem de itens
- Alerta crítico se base incompleta
- Aviso se faltam configurações
- Dicas para resolver problemas

**Integração:** Automaticamente na `AgendaPage`

### 4. **RulesAlert** - Alerta de Regras Incompletas
**Localização:** `src/components/RulesAlert.jsx`
**Linhas:** ~200
**Funcionalidades:**
- Verifica status de agenda_rules, revenue_rules, checkin_rules
- Mostra resumo de regras ativas
- Alerta progressivo (info → warning → error)
- Link direto para gerenciar regras
- RulesSummaryCard para dashboards

**Integração:** Na página `RepasseMedico`

### 5. **useDynamicSelect** - Hook para Selects Dinâmicos
**Localização:** `src/hooks/useDynamicSelect.js`
**Linhas:** ~150
**Hooks Inclusos:**
- **useDynamicSelect** - Carregamento simples de opções
- **useDependentSelect** - Cascata de selects (profissional → serviços)
- **useSearchableSelect** - Search/filtro em opções
- **useMultiSelect** - Múltiplas seleções com validação
- **useCachedSelect** - Cache com TTL (5min padrão)

**Exemplo de Cascata:**
```javascript
const { cascade, loadCascade, getCascadeOptions } = useDependentSelect(values);

useEffect(() => {
  if (values.professionalId) {
    loadCascade('services', 'professionalId', () =>
      fetchServicesByProfessional(values.professionalId)
    );
  }
}, [values.professionalId]);

const serviceOptions = getCascadeOptions('services');
```

### 6. **AppointmentFormWithValidation** - Formulário Completo
**Localização:** `src/components/AppointmentFormWithValidation.jsx`
**Linhas:** ~350
**Recursos:**
- Integra useFormValidation + ValidatedFormField + useDependentSelect
- Selects dinâmicos para serviços (baseado em profissional)
- Selects dinâmicos para planos (baseado em convênio)
- Validação completa de todos os campos
- Feedback visual de status do formulário
- Tratamento de erros de submissão
- Toast de sucesso

### 7. **SmartTips** - Dicas Inteligentes Contextuais
**Localização:** `src/components/SmartTips.jsx`
**Linhas:** ~250
**Componentes:**
- **SmartTips** - Exibe dicas baseadas no estado do formulário
- **SmartTipsDrawer** - Painel lateral com dicas por seção
- **PreAppointmentChecklist** - Checklist visual pré-agendamento

**Comportamento:**
- Dica sobre data vazia
- Dica sobre serviço não selecionado
- Aviso sobre conflitos
- Checklist com barra de progresso

## 🔗 Integrações

### AgendaPage
```javascript
import { HealthCheckMonitor } from '@/components/HealthCheckMonitor';

// No JSX:
<div className="max-w-7xl mx-auto px-4 py-4">
  <HealthCheckMonitor />
</div>
```

### RepasseMedico
```javascript
import { RulesAlert, RulesSummaryCard } from '@/components/RulesAlert';

// No JSX:
<div className="p-6 space-y-4">
  <RulesAlert />
  {/* Resto do conteúdo */}
</div>
```

## 📊 Validadores Disponíveis

```javascript
import { validators, composeValidators } from '@/hooks/useFormValidation';

// Simples
validators.required('Campo')
validators.email(value)
validators.phone(value)
validators.cpf(value)
validators.date(value)

// Com parâmetros
validators.minLength(5, 'Nome')
validators.maxLength(100, 'Descrição')
validators.min(0, 'Preço')
validators.max(1000, 'Limite')

// Composto
const validateName = composeValidators(
  validators.required('Nome'),
  validators.minLength(3, 'Nome'),
  validators.maxLength(100, 'Nome')
);
```

## 🎨 Estilos Aplicados

### ValidatedFormField
- **Válido:** Borda verde, ícone ✓, mensagem de sucesso
- **Erro:** Borda vermelha, ícone ✗, mensagem de erro
- **Validando:** Spinner, mensagem "Validando..."
- **Vazio:** Borda cinza, placeholder visível

### HealthCheckMonitor
- **Erro:** Borde e fundo vermelho (critical)
- **Aviso:** Borde e fundo amarelo (warning)
- **Info:** Borde e fundo azul (info)
- **Sucesso:** Ícone verde com check

### RulesAlert
- **Expandível:** Clique para ver detalhes
- **Contadores:** X/Y regras ativas
- **Links:** Direto para configurar

## 🧪 Casos de Uso Cobertos

### ✅ Agendamento
1. Validação de data (obrigatória, não no passado)
2. Validação de horário (fim > início)
3. Validação de paciente (obrigatório)
4. Validação de profissional (obrigatório)
5. Select dinâmico de serviços (por profissional)
6. Select dinâmico de planos (por convênio)
7. Validação de convênio (obrigatório)
8. Feedback de validação em tempo real

### ⚕️ Check-in
1. Validação de dados do paciente
2. Check de autorização de convênio
3. Checklist de pré-agendamento
4. Dicas contextuais

### 💰 Financeiro
1. Alerta de regras de repasse incompletas
2. Resumo de regras ativas
3. Link para configuração

## 🔄 Fluxo de Validação

```
Usuário digita → Campo validado → Mensagem exibida → Submit bloqueado/liberado
     ↓
Campo tocado?
   ↓ Sim
Validar campo
   ↓
Tem erro?
   ↓ Sim
Exibir ✗ + mensagem
   ↓ Não
Exibir ✓
```

## 📈 Benefícios

✅ **Melhor UX:** Feedback imediato ao usuário
✅ **Menos Erros:** Validações antes de enviar ao servidor
✅ **Prevenção:** Health check identifica configs incompletas
✅ **Aprendizado:** Dicas inteligentes guiam o usuário
✅ **Produtividade:** Selects dinâmicos reduzem cliques
✅ **Confiabilidade:** Cascatas impedem dados inconsistentes

## 📝 Exemplo Completo

```javascript
import { useFormValidation, validators, composeValidators } from '@/hooks/useFormValidation';
import { ValidatedFormField } from '@/components/ValidatedFormField';
import { useDependentSelect } from '@/hooks/useDynamicSelect';

function MyForm() {
  const formik = useFormValidation(
    { email: '', password: '' },
    async (fieldName, value) => {
      if (fieldName === 'email') {
        return validators.email(value);
      }
      if (fieldName === 'password') {
        return composeValidators(
          validators.required('Senha'),
          validators.minLength(8, 'Senha')
        )(value);
      }
      return { error: null };
    }
  );

  return (
    <form>
      <ValidatedFormField
        label="Email"
        name="email"
        type="email"
        value={formik.values.email}
        error={formik.errors.email}
        touched={formik.touched.email}
        onChange={formik.setFieldValue}
        onBlur={formik.setFieldTouched}
        required
      />
      <ValidatedFormField
        label="Senha"
        name="password"
        type="password"
        value={formik.values.password}
        error={formik.errors.password}
        touched={formik.touched.password}
        onChange={formik.setFieldValue}
        onBlur={formik.setFieldTouched}
        required
      />
      <button disabled={!formik.isValid}>
        Enviar
      </button>
    </form>
  );
}
```

## 🚀 Próximas Melhorias (ETAPA 7)

- [ ] Validações assincrónas mais complexas
- [ ] Máscaras de input (CPF, telefone, etc)
- [ ] Validação de conflitos de agenda em tempo real
- [ ] Sugestões de horários livres
- [ ] Auto-complete com busca em servidor
- [ ] Validação condicional avançada

## 📊 Status

✅ **ETAPA 6 - COMPLETA**
- Validações: ✅
- Selects dinâmicos: ✅
- Health check: ✅
- Rules alert: ✅
- Smart tips: ✅
- Componentes: ✅

**Total de código criado:** ~1.330 linhas
**Arquivos criados:** 7
**Componentes reutilizáveis:** 9
**Hooks customizados:** 6

---

**Pronto para ETAPA 7** ➜ Formulários Avançados e Testes
