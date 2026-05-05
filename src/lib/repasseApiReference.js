// src/lib/repasseApiReference.js
/**
 * REFERÊNCIA RÁPIDA DAS FUNÇÕES DO MÓDULO DE REPASSE
 * Cole e use diretamente nos seus componentes React
 */

import {
  calcularRepasseEmLote,
  dashboardRepasseMedico,
  obterRepassePeriodo,
} from './medicalRepasseApi';

import { processarTransferenciasLote } from './repasseBancariaApi';

import { enviarNotificacoesEmLote } from './repasseEmailApi';

import { pipelineProcessamentoManual, testePipelineCompleto } from './repasseAutomatizacaoCompleta';

// ============================================
// USO NOS COMPONENTES REACT
// ============================================

/**
 * 1. OBTER DASHBOARD COM TODAS AS METRICS
 *
 * Uso:
 * const dados = await obterDashboard(clinicId);
 *
 * Retorna:
 * {
 *   mes_atual: "2025-03-19",
 *   valor_bruto: 15000.00,
 *   valor_desconto: 2000.00,
 *   repasse_total: 10500.00,
 *   profissionais_processados: 5,
 *   percentual_medio: 70,
 *   ticket_medio: 3000.00
 * }
 */
export const obterDashboard = async (clinicId) => {
  try {
    return await dashboardRepasseMedico(clinicId);
  } catch (err) {
    console.error('Erro ao obter dashboard:', err);
    throw err;
  }
};

/**
 * 2. PROCESSAR REPASSOS DE UM PERÍODO
 *
 * Uso:
 * const repassos = await processarPeriodo(
 *   clinicId,
 *   '2025-03-01',
 *   '2025-03-31'
 * );
 *
 * Retorna: Array de repassos calculados
 */
export const processarPeriodo = async (clinicId, dataInicio, dataFim) => {
  try {
    const repassos = await calcularRepasseEmLote(clinicId, dataInicio, dataFim);
    return repassos;
  } catch (err) {
    console.error('Erro ao processar período:', err);
    throw err;
  }
};

/**
 * 3. TRANSFERIR TODAS AS COMISSÕES (PIX)
 *
 * Uso:
 * const resultado = await transferirTodas(repassos);
 *
 * console.log(resultado);
 * // { sucesso: 5, erro: 0, detalhes: [...] }
 */
export const transferirTodas = async (repassos) => {
  try {
    const resultado = await processarTransferenciasLote(repassos, 'pix');
    return {
      sucesso: resultado.filter((r) => r.status === 'sucesso').length,
      erro: resultado.filter((r) => r.status === 'erro').length,
      detalhes: resultado,
    };
  } catch (err) {
    console.error('Erro ao transferir:', err);
    throw err;
  }
};

/**
 * 4. NOTIFICAR TODOS OS PROFISSIONAIS
 *
 * Uso:
 * const resultado = await notificarTodos(repassos, clinic);
 *
 * console.log(resultado);
 * // { enviados: 5, erros: 0, detalhes: [...] }
 */
export const notificarTodos = async (repassos, clinic) => {
  try {
    const resultado = await enviarNotificacoesEmLote(repassos, clinic);
    return {
      enviados: resultado.filter((r) => r.status === 'enviado').length,
      erros: resultado.filter((r) => r.status === 'erro').length,
      detalhes: resultado,
    };
  } catch (err) {
    console.error('Erro ao notificar:', err);
    throw err;
  }
};

/**
 * 5. PROCESSAR TUDO DE UMA VEZ (Cálculo + Transferência + Email)
 *
 * Uso:
 * const resultado = await processarTudo(
 *   clinicId,
 *   '2025-03-01',
 *   '2025-03-31'
 * );
 *
 * console.log(resultado);
 * // {
 * //   processados: 15,
 * //   transferências: 15,
 * //   emails: 15,
 * //   resultado: 'sucesso'
 * // }
 */
export const processarTudo = async (clinicId, dataInicio, dataFim) => {
  try {
    return await pipelineProcessamentoManual(clinicId, dataInicio, dataFim);
  } catch (err) {
    console.error('Erro ao processar tudo:', err);
    throw err;
  }
};

/**
 * 6. TESTAR TODO O SISTEMA
 *
 * Uso (no console do navegador):
 * testarSistema('clinic-uuid-aqui');
 *
 * Simula todo o pipeline e mostra resultado
 */
export const testarSistema = async (clinicId) => {
  try {
    return await testePipelineCompleto(clinicId);
  } catch (err) {
    console.error('Erro ao testar:', err);
    throw err;
  }
};

// ============================================
// EXEMPLOS DE USO EM COMPONENTES REACT
// ============================================

/**
 * EXEMPLO 1: Mostrar dashboard em um card
 */
export const ExemploDashboardCard = ({ clinicId }) => {
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

  if (carregando) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="p-4 bg-white rounded-lg">
      <h2 className="text-lg font-bold mb-4">Resumo de Repassos</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-600">Valor Bruto</p>
          <p className="text-2xl font-bold">R$ {dados?.valor_bruto?.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-600">Repasse Total</p>
          <p className="text-2xl font-bold text-green-600">R$ {dados?.repasse_total?.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * EXEMPLO 2: Botão para processar tudo
 */
export const ExemploProcessarTudo = ({ clinicId }) => {
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const handleProcessar = async () => {
    setProcessando(true);
    try {
      const hoje = new Date();
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fim = hoje;

      const result = await processarTudo(
        clinicId,
        inicio.toISOString().split('T')[0],
        fim.toISOString().split('T')[0],
      );

      setResultado(result);
      alert(
        `✅ Processados: ${result.processados}\n💳 Transferências: ${result.transferências}\n📧 Emails: ${result.emails}`,
      );
    } catch (err) {
      alert('❌ Erro: ' + err.message);
    } finally {
      setProcessando(false);
    }
  };

  return (
    <button
      onClick={handleProcessar}
      disabled={processando}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
    >
      {processando ? '⏳ Processando...' : '🚀 Processar Tudo'}
    </button>
  );
};

/**
 * EXEMPLO 3: No console do navegador
 *
 * Colar e executar:
 */
export const ExemploConsole = () => {
  const scriptConsole = `
// 1. Testar sistema
import { testarSistema } from '@/lib/repasseApiReference';
await testarSistema('seu-clinic-id');

// 2. Obter dashboard
import { obterDashboard } from '@/lib/repasseApiReference';
const dash = await obterDashboard('clinic-id');
console.table(dash);

// 3. Processar período
import { processarPeriodo } from '@/lib/repasseApiReference';
const repassos = await processarPeriodo('clinic-id', '2025-03-01', '2025-03-31');
console.table(repassos);

// 4. Transferir tudo
import { transferirTodas } from '@/lib/repasseApiReference';
const transfer = await transferirTodas(repassos);
console.log(transfer);

// 5. Notificar tudo
import { notificarTodos } from '@/lib/repasseApiReference';
const notif = await notificarTodos(repassos, { id: 'clinic-id', name: 'Minha Clínica' });
console.log(notif);
  `;

  return (
    <div className="p-4 bg-gray-900 text-white rounded font-mono text-xs">
      <pre>{scriptConsole}</pre>
    </div>
  );
};

// ============================================
// CONSTANTES ÚTEIS
// ============================================

export const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const STATUS_TRANSFERENCIA = {
  pendente: '⏳ Pendente',
  processando: '🔄 Processando',
  concluido: '✅ Concluído',
  erro: '❌ Erro',
  cancelado: '⛔ Cancelado',
};

export const METODOS_TRANSFERENCIA = {
  pix: '💰 PIX',
  ted: '🏦 TED',
  paypal: '📱 PayPal',
  stripe: '💳 Stripe',
  manual: '✍️ Manual',
};

export const PROVEDORES_EMAIL = {
  sendgrid: 'SendGrid',
  aws_ses: 'AWS SES',
  mailgun: 'Mailgun',
  smtp: 'SMTP Customizado',
};

// ============================================
// HELPERS ÚTEIS
// ============================================

/**
 * Formatar valor para moeda brasileira
 */
export const formatarMoeda = (valor) => {
  return (
    valor?.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }) || 'R$ 0,00'
  );
};

/**
 * Formatar data para pt-BR
 */
export const formatarData = (data) => {
  return new Date(data).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * Obter primeiro e último dia do mês
 */
export const obterPeriodoMes = (mes, ano) => {
  const inicio = new Date(ano, mes, 1);
  const fim = new Date(ano, mes + 1, 0);

  return {
    inicio: inicio.toISOString().split('T')[0],
    fim: fim.toISOString().split('T')[0],
  };
};

/**
 * Status get badge color
 */
export const getStatusColor = (status) => {
  const cores = {
    concluido: 'bg-green-100 text-green-800',
    pendente: 'bg-yellow-100 text-yellow-800',
    processando: 'bg-blue-100 text-blue-800',
    erro: 'bg-red-100 text-red-800',
    cancelado: 'bg-gray-100 text-gray-800',
  };
  return cores[status] || 'bg-gray-100 text-gray-800';
};

export default {
  obterDashboard,
  processarPeriodo,
  transferirTodas,
  notificarTodos,
  processarTudo,
  testarSistema,
  formatarMoeda,
  formatarData,
  obterPeriodoMes,
  getStatusColor,
  MESES,
  STATUS_TRANSFERENCIA,
  METODOS_TRANSFERENCIA,
  PROVEDORES_EMAIL,
};
