import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import DatePickerPopover from './DatePickerPopover';
import { getAccessibleAgendaTabs, AGENDA_TAB_LABELS } from '@/config/agendaTabs.config';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/**
 * AgendaHeaderNew - Header otimizado com 3 blocos visuais claros
 * 
 * 🅐 Navegação de data (esq) | 🅑 Modo (centro) | 🅒 Ação (dir)
 * 
 * Props:
 * - date: string (YYYY-MM-DD)
 * - onPreviousDay: () => void
 * - onNextDay: () => void
 * - onDateSelect: (date: string) => void
 * - viewMode: string - 'dia' | 'semana' | 'mes'
 * - onViewModeChange: (mode) => void
 * - onNewAppointment: () => void
 * - loading: boolean
 * - agendaSummary: object - resumo da agenda { 'YYYY-MM-DD': { status, label } }
 */
export default function AgendaHeaderNew({
  date,
  onPreviousDay,
  onNextDay,
  onDateSelect,
  viewMode = 'dia',
  onViewModeChange,
  onNewAppointment,
  loading = false,
  agendaSummary = {},
}) {
  const auth = useAuth();
  const currentRole = auth?.currentRole?.toLowerCase();
  const accessibleTabs = getAccessibleAgendaTabs(currentRole);
  
  const [year, month, day] = date ? date.split('-').map(Number) : 
    [new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()];
  
  const dateObj = new Date(year, month - 1, day);
  
  if (isNaN(dateObj.getTime())) {
    return (
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm px-6 py-2">
        <div className="text-red-600 text-xs">Erro ao carregar data</div>
      </div>
    );
  }
  
  const today = new Date();
  const isToday = dateObj.toDateString() === today.toDateString();

  const handleTodayClick = () => {
    const todayStr = format(today, 'yyyy-MM-dd');
    onDateSelect(todayStr);
  };

  // Wrapper para converter Date de popover para string para o container
  const handleDatePickerChange = (dateObj) => {
    const dateStr = format(dateObj, 'yyyy-MM-dd');
    onDateSelect(dateStr);
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
      <div className="px-6 py-2.5 flex items-center justify-between gap-6">
        
        {/* 🅐 BLOCO A: Navegação de Data */}
        <div className="flex items-center gap-2">
          {/* Seta Esquerda */}
          <button
            onClick={onPreviousDay}
            disabled={loading}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50"
            title="Dia anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* DatePickerPopover com mini calendário */}
          <DatePickerPopover
            selectedDate={dateObj}
            onChange={handleDatePickerChange}
            agendaSummary={agendaSummary}
          />

          {/* Seta Direita */}
          <button
            onClick={onNextDay}
            disabled={loading}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50"
            title="Próximo dia"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Hoje - Discreto */}
          {!isToday && (
            <button
              onClick={handleTodayClick}
              disabled={loading}
              className="ml-2 text-xs text-blue-600 hover:text-blue-700 hover:underline transition-colors font-medium disabled:opacity-50"
            >
              Hoje
            </button>
          )}
        </div>

        {/* 🅑 BLOCO B: Modo de Visualização */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {['dia', 'semana', 'mes'].map((mode) => {
            const isAccessible = accessibleTabs.includes(mode);
            const isActive = viewMode === mode;
            const tabLabel = AGENDA_TAB_LABELS[mode];
            
            // Se não tem acesso, mostrar desabilitado
            if (!isAccessible) {
              return (
                <button
                  key={mode}
                  disabled={true}
                  title={`Acesso negado para ${tabLabel.fullLabel}`}
                  className="px-3 py-1.5 text-xs font-medium rounded transition-all whitespace-nowrap opacity-30 cursor-not-allowed"
                >
                  {tabLabel.label}
                </button>
              );
            }
            
            return (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode)}
                disabled={loading}
                title={tabLabel.fullLabel}
                className={`
                  px-3 py-1.5 text-xs font-medium rounded transition-all whitespace-nowrap disabled:opacity-50
                  ${isActive 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                {tabLabel.label}
              </button>
            );
          })}
        </div>

        {/* 🅒 BLOCO C: Ação Principal */}
        <button
          onClick={onNewAppointment}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 active:scale-95 whitespace-nowrap font-medium"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Novo</span>
        </button>
      </div>
    </div>
  );
}

