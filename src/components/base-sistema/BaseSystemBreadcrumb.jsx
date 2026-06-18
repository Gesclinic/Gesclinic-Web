// src/components/base-sistema/BaseSystemBreadcrumb.jsx
// ============================================================
// BREADCRUMB COMPONENT - Base do Sistema
// Mostra a categoria e localização atual do usuário
// Reforça a estrutura conceitual do sistema
// ============================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Configuração das categorias e suas cores/ícones
 */
const CATEGORY_CONFIG = {
  'cadastros-estruturais': {
    title: 'Cadastros Estruturais',
    icon: '📋',
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  'regras-operacionais': {
    title: 'Regras Operacionais',
    icon: '⚙️',
    color: 'amber',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
  },
  'parametros-financeiros': {
    title: 'Parâmetros Financeiros',
    icon: '💰',
    color: 'green',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  },
};

/**
 * BaseSystemBreadcrumb Component
 * @param {string} category - Categoria do item (cadastros-estruturais | regras-operacionais | parametros-financeiros)
 * @param {string} pageTitle - Título da página atual
 * @param {React.ReactNode} icon - Ícone da página (opcional)
 */
export default function BaseSystemBreadcrumb({
  category = 'cadastros-estruturais',
  pageTitle = '',
  icon = null,
}) {
  const navigate = useNavigate();
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['cadastros-estruturais'];

  return (
    <div
      className={`
        flex items-center gap-2 px-4 py-3 rounded-lg border
        ${config.bgColor} ${config.borderColor}
      `}
    >
      {/* Home Icon */}
      <button
        onClick={() => navigate('/clinica/base-sistema')}
        className={`hover:opacity-70 transition-opacity ${config.textColor}`}
        title="Ir para Base do Sistema"
      >
        <Home size={18} />
      </button>

      {/* Separator */}
      <ChevronRight size={16} className={config.textColor} />

      {/* Category */}
      <span className={`text-sm font-medium ${config.textColor}`}>
        {config.icon} {config.title}
      </span>

      {/* Separator */}
      {pageTitle && <ChevronRight size={16} className={config.textColor} />}

      {/* Page Title */}
      {pageTitle && (
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <span className={`text-sm font-semibold ${config.textColor}`}>{pageTitle}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Mapa de páginas para suas categorias
 * Pode ser importado para validação ou lookup
 */
export const PAGES_BY_CATEGORY = {
  'cadastros-estruturais': [
    { path: '/clinica/base-sistema/servicos', title: 'Serviços', icon: '🩺' },
    { path: '/clinica/base-sistema/profissionais', title: 'Profissionais', icon: '👥' },
    { path: '/clinica/base-sistema/convenios', title: 'Convênios', icon: '🏥' },
    { path: '/clinica/base-sistema/salas', title: 'Salas', icon: '🚪' },
    { path: '/clinica/base-sistema/recursos', title: 'Recursos', icon: '📦' },
  ],
  'regras-operacionais': [
    { path: '/clinica/base-sistema/agenda-rules', title: 'Regras da Agenda', icon: '📅' },
    { path: '/clinica/base-sistema/room-resources', title: 'Salas × Serviços', icon: '⚡' },
  ],
  'parametros-financeiros': [
    { path: '/clinica/base-sistema/service-prices', title: 'Tabela de Preços', icon: '💵' },
    {
      path: '/clinica/base-sistema/professional-schedule',
      title: 'Valores por Convênio',
      icon: '📈',
    },
    { path: '/clinica/base-sistema/revenue-rules', title: 'Regras de Repasse', icon: '📊' },
  ],
};
