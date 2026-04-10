/**
 * AgendaFinanceDashboard.jsx
 * Dashboard visual Agenda × Financeiro
 * 
 * Objetivo: Mostrar em 30 segundos a saúde financeira da agenda
 * Sem jargão contábil, apenas dados acionáveis
 */

import React from 'react';
import { TrendingUp, Users, DollarSign, Calendar, Target, AlertCircle } from 'lucide-react';

export default function AgendaFinanceDashboard({ metrics, loading = false }) {
  if (loading) {
    return <AgendaFinanceDashboardLoading />;
  }

  if (!metrics) {
    return null;
  }

  const {
    totalReceita,
    receitaPorHora,
    ocupacaoPercentual,
    agendamentos,
    servicosMais,
    receitaPorProfissional,
    indicadorSaude,
    statusAgenda,
    metaDia,
    data,
    profissionaisAtivos,
  } = metrics;

  return (
    <div className="space-y-4">
      {/* Linha 1: Indicadores Principais */}
      <div className="grid grid-cols-4 gap-4">
        {/* Receita Total */}
        <DashboardCard
          icon={<DollarSign className="w-5 h-5" />}
          title="Receita da Agenda"
          value={`R$ ${totalReceita.toFixed(2)}`}
          subtitle={`${agendamentos} agendamentos`}
          color="bg-emerald-50"
          borderColor="border-emerald-200"
        />

        {/* Receita por Hora */}
        <DashboardCard
          icon={<TrendingUp className="w-5 h-5" />}
          title="Receita por Hora"
          value={`R$ ${receitaPorHora.toFixed(2)}`}
          subtitle="Produtividade do tempo"
          color="bg-blue-50"
          borderColor="border-blue-200"
        />

        {/* Ocupação */}
        <DashboardCard
          icon={<Calendar className="w-5 h-5" />}
          title="Ocupação"
          value={`${ocupacaoPercentual}%`}
          subtitle={`${agendamentos} / ${Math.round(metaDia.ocupacaoMeta * 1.5)} slots`}
          color="bg-purple-50"
          borderColor="border-purple-200"
          progress={ocupacaoPercentual}
        />

        {/* Saúde Geral */}
        <DashboardCard
          icon={<Target className="w-5 h-5" />}
          title="Indicador de Saúde"
          value={`${indicadorSaude}%`}
          subtitle={statusAgenda.label}
          color="bg-amber-50"
          borderColor="border-amber-200"
          progress={indicadorSaude}
        />
      </div>

      {/* Linha 2: Status e Ações */}
      <div className="grid grid-cols-3 gap-4">
        {/* Status Qualitativo */}
        <StatusCard status={statusAgenda} />

        {/* Profissionais Ativos */}
        <DashboardCard
          icon={<Users className="w-5 h-5" />}
          title="Profissionais Ativos"
          value={profissionaisAtivos}
          subtitle={profissionaisAtivos > 0 ? 'Em atividade' : 'Sem profissionais'}
          color="bg-indigo-50"
          borderColor="border-indigo-200"
        />

        {/* Meta do Dia */}
        <MetaCard meta={metaDia} receitaAtual={totalReceita} />
      </div>

      {/* Linha 3: Análise de Mix (Se houver serviços) */}
      {servicosMais.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Top 3 Serviços
          </h3>
          <div className="space-y-2">
            {servicosMais.map((srv, idx) => (
              <div key={srv.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 w-5">{idx + 1}.</span>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{srv.nome}</p>
                    <p className="text-xs text-gray-500">{srv.quantidade} agendamentos</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-600">
                    R$ {(srv.valor * srv.quantidade).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">R$ {srv.valor.toFixed(2)} un.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linha 4: Ranking de Profissionais (Se houver) */}
      {receitaPorProfissional.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Receita por Profissional
          </h3>
          <div className="space-y-2">
            {receitaPorProfissional.slice(0, 3).map((prof, idx) => (
              <div key={prof.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 w-5">{idx + 1}.</span>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{prof.nome}</p>
                    <p className="text-xs text-gray-500">{prof.agendamentos} agendamentos</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-600">
                    R$ {prof.receita.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">Média: R$ {prof.receitaMedia.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Card padrão para métrica
 */
function DashboardCard({
  icon,
  title,
  value,
  subtitle,
  color,
  borderColor,
  progress,
}) {
  return (
    <div className={`${color} border ${borderColor} rounded-lg p-4 space-y-2`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className="text-gray-400">{icon}</div>
      </div>

      {subtitle && (
        <p className="text-xs text-gray-600">{subtitle}</p>
      )}

      {progress !== undefined && (
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className={`h-2 rounded-full transition-all ${
              progress >= 80
                ? 'bg-emerald-500'
                : progress >= 60
                ? 'bg-blue-500'
                : progress >= 40
                ? 'bg-amber-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Card de status qualitativo
 */
function StatusCard({ status }) {
  const bgColor =
    status.label.includes('Excelente')
      ? 'bg-emerald-50 border-emerald-200'
      : status.label.includes('Bom')
      ? 'bg-blue-50 border-blue-200'
      : status.label.includes('Atenção')
      ? 'bg-amber-50 border-amber-200'
      : 'bg-red-50 border-red-200';

  const iconColor = status.label.includes('🔴') ? 'text-red-600' : 'text-gray-600';

  return (
    <div className={`border ${bgColor} rounded-lg p-4 space-y-2`}>
      <div className="flex items-center gap-2">
        <AlertCircle className={`w-5 h-5 ${iconColor}`} />
        <h3 className="font-semibold text-gray-700">{status.label}</h3>
      </div>
      <p className="text-sm text-gray-600">{status.descricao}</p>
      <p className="text-xs font-medium text-gray-700 pt-2 border-t border-gray-200 mt-2">
        💡 {status.acao}
      </p>
    </div>
  );
}

/**
 * Card de meta do dia
 */
function MetaCard({ meta, receitaAtual }) {
  const percentualMeta = (receitaAtual / meta.receitaMeta) * 100;
  const cumpriu = percentualMeta >= 100;

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">Meta do Dia</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            R$ {receitaAtual.toFixed(2)}
          </p>
        </div>
        <div className="text-indigo-600 text-xl">
          {cumpriu ? '✅' : '⏳'}
        </div>
      </div>

      <p className="text-xs text-gray-600">
        Meta: R$ {meta.receitaMeta.toFixed(2)} ({Math.round(percentualMeta)}%)
      </p>

      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
        <div
          className={`h-2 rounded-full transition-all ${
            cumpriu ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
          style={{ width: `${Math.min(percentualMeta, 100)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Loading skeleton
 */
function AgendaFinanceDashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-100 rounded-lg p-4 h-32 animate-pulse"
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-100 rounded-lg p-4 h-32 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

