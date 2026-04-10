🚀 REFERÊNCIA RÁPIDA - IMPORTS E FUNÇÕES MAIS USADAS
=================================================

## 🎯 Principais Imports

```javascript
// Repasse Core
import { 
  calcularRepasse,
  dashboardRepasseMedico,
  registrarProducao 
} from '@/lib/medicalRepasseApi';

// Banco
import { 
  salvarDadosBancarios,
  processarTransferenciasLote 
} from '@/lib/repasseBancariaApi';

// Email
import { 
  enviarNotificacaoRepasse,
  enviarNotificacoesEmLote 
} from '@/lib/repasseEmailApi';

// Automatização Completa
import { 
  pipelineProcessamentoManual,
  setupAutomatizacaoEmTempoReal 
} from '@/lib/repasseAutomatizacaoCompleta';

// Referência Rápida (RECOMENDADO)
import {
  obterDashboard,
  processarPeriodo,
  transferirTodas,
  notificarTodos,
  processarTudo,
  formatarMoeda
} from '@/lib/repasseApiReference';
```

---

## 📋 Funções Mais Usadas

### 1. Obter Dashboard
```javascript
const dados = await obterDashboard(clinicId);
// Retorna: valor_bruto, valor_desconto, repasse_total, etc
```

### 2. Processar Período
```javascript
const repassos = await processarPeriodo(
  clinicId,
  '2025-03-01',
  '2025-03-31'
);
// Retorna: Array de repassos calculados
```

### 3. Transferir (PIX)
```javascript
const resultado = await transferirTodas(repassos);
// Retorna: { sucesso: 5, erro: 0, detalhes: [...] }
```

### 4. Notificar
```javascript
const resultado = await notificarTodos(repassos, clinic);
// Retorna: { enviados: 5, erros: 0, detalhes: [...] }
```

### 5. Fazer Tudo de Uma Vez
```javascript
const resultado = await processarTudo(clinicId, inicio, fim);
// Retorna: { processados: 15, transferências: 15, emails: 15 }
```

---

## 🔗 URLs das Páginas

| Página | URL |
|--------|-----|
| Dashboard | `/clinica/financeiro/repasse-medico` |
| Configuração | `/clinica/financeiro/repasse-config` |
| Ajustes | `/clinica/financeiro/repasse-ajuste` |
| Analytics | `/clinica/financeiro/repasse-dashboard` |
| Banco & Email | `/clinica/financeiro/repasse-transferencia` |

---

## 🧪 Testar no Console

Abra DevTools (F12) e cole:

```javascript
// 1. Testar tudo
import { testarSistema } from '@/lib/repasseApiReference';
await testarSistema('seu-clinic-id');

// 2. Ver dashboard
import { obterDashboard } from '@/lib/repasseApiReference';
const dash = await obterDashboard('clinic-id');
console.table(dash);

// 3. Processar período
import { processarPeriodo } from '@/lib/repasseApiReference';
const repassos = await processarPeriodo('clinic-id', '2025-03-01', '2025-03-31');
console.table(repassos);
```

---

## 💡 Padrões de Uso em React

### Com useState + useEffect
```jsx
const [dados, setDados] = useState(null);
const [carregando, setCarregando] = useState(false);

useEffect(() => {
  const carregar = async () => {
    setCarregando(true);
    const result = await obterDashboard(clinicId);
    setDados(result);
    setCarregando(false);
  };
  carregar();
}, [clinicId]);

return <div>{formatarMoeda(dados?.repasse_total)}</div>;
```

### Botão com Loader
```jsx
const [processando, setProcessando] = useState(false);

const handleProcessar = async () => {
  setProcessando(true);
  try {
    const res = await processarTudo(clinicId, inicio, fim);
    alert(`✅ Processados: ${res.processados}`);
  } catch (err) {
    alert(`❌ Erro: ${err.message}`);
  } finally {
    setProcessando(false);
  }
};

return (
  <button disabled={processando} onClick={handleProcessar}>
    {processando ? '⏳ Processando...' : '🚀 Processar'}
  </button>
);
```

---

## 🎨 Componentes Pré-prontos

### Dashboard Card
```jsx
import { ExemploDashboardCard } from '@/lib/repasseApiReference';

<ExemploDashboardCard clinicId={clinicId} />
```

### Botão Processar Tudo
```jsx
import { ExemploProcessarTudo } from '@/lib/repasseApiReference';

<ExemploProcessarTudo clinicId={clinicId} />
```

---

## 🛠️ Helpers Úteis

```javascript
import {
  formatarMoeda,      // R$ 1.234,56
  formatarData,       // 19/03/2025
  obterPeriodoMes,    // { inicio: '2025-03-01', fim: '2025-03-31' }
  getStatusColor      // 'bg-green-100 text-green-800'
} from '@/lib/repasseApiReference';

formatarMoeda(1234.56);          // 'R$ 1.234,56'
formatarData('2025-03-19');      // '19/03/2025'
obterPeriodoMes(2, 2025);        // { inicio: '2025-03-01', fim: '2025-03-31' }
getStatusColor('concluido');     // 'bg-green-100 text-green-800'
```

---

## 📊 Constantes

```javascript
import {
  MESES,
  STATUS_TRANSFERENCIA,
  METODOS_TRANSFERENCIA,
  PROVEDORES_EMAIL
} from '@/lib/repasseApiReference';

MESES[2]                           // 'Março'
STATUS_TRANSFERENCIA.concluido     // '✅ Concluído'
METODOS_TRANSFERENCIA.pix          // '💰 PIX'
PROVEDORES_EMAIL.sendgrid          // 'SendGrid'
```

---

## ⚠️ Checklist de Setup

```
✅ Migrations SQL executadas?
   - 20260318_create_medical_repasse_module.sql
   - 20260319_create_bancaria_email_tables.sql

✅ Pacotes instalados?
   - npm install html2pdf jspdf nodemailer

✅ Routes adicionadas em AppRoutes.jsx?
   - repasse-medico
   - repasse-config
   - repasse-ajuste
   - repasse-dashboard
   - repasse-transferencia

✅ Automatização ativada em App.jsx?
   - setupAutomatizacaoEmTempoReal(clinicId)

✅ Dados configurados?
   - Dados bancários dos profissionais
   - Email (SendGrid/Mailgun)
   - Percentuais de comissão

✅ Testado?
   - testarSistema(clinicId) no console
```

---

## 🆘 Problemas Comuns

| Erro | Solução |
|------|---------|
| "Professional não possui dados bancários" | Configure em `/clinica/financeiro/repasse-transferencia` |
| "Email não configurado" | Configure SendGrid/Mailgun em `/clinica/financeiro/repasse-transferencia` |
| "RLS Error" | Adicione user a `user_roles` table no Supabase |
| "Module not found" | Verifique import path, deve ser `@/lib/...` |
| Dados não atualizam | Limpe cache, F5 no navegador |

---

## 📞 Links Úteis

- 🎯 QUICK START: `REPASSE_QUICK_START.md`
- 📖 Documentação: `REPASSE_MODULO_DOCUMENTACAO.md`
- ✅ Checklist: `✅_REPASSE_MODULO_CHECKLIST.md`
- 📋 Este arquivo: `REPASSE_REFERENCIA_RAPIDA.md`

---

**Pronto para usar! 🚀**
