// src/pages/clinica/agenda/components/AgendaHeader.jsx
import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronUp, ChevronDown } from 'lucide-react';

/**
 * AgendaHeader - Topo da Agenda com navegação de data e botão de novo agendamento
 * 
 * Props:
 * - date: string (ISO date)
 * - onDateChange: (date) => void
 * - onTodayClick: () => void
 * - onWeekClick: () => void
 * - onMonthClick: () => void
 * - onPreviousDay: () => void
 * - onNextDay: () => void
 * - onNewAppointment: () => void
 * - loading: boolean
 * - onSendWhatsApp: () => void
 * - whatsappLoading: boolean
 */
export default function AgendaHeader({
  date,
  onDateChange,
  onTodayClick,
  onWeekClick,
  onMonthClick,
  onPreviousDay,
  onNextDay,
  onNewAppointment,
  loading = false,
  onSendWhatsApp,
  whatsappLoading = false,
}) {
  console.log('🔍 [AgendaHeader] onSendWhatsApp recebido:', onSendWhatsApp, 'whatsappLoading:', whatsappLoading);
  
  // ⚠️ IMPORTANTE: new Date("2026-01-14") trata como UTC! Precisa parsear como data LOCAL
  const [year, month, day] = date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  
  // Formata corretamente usando toLocaleDateString
  const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
  const dayNum = dateObj.getDate();
  const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long' });
  const yearNum = dateObj.getFullYear();
  
  const formattedDate = `${weekday}, ${dayNum} de ${monthName} de ${yearNum}`;
  const titleDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  const handleDateInputChange = (e) => {
    const newDate = e.target.value; // Formato YYYY-MM-DD
    if (newDate) {
      onDateChange(newDate);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="px-6 py-4">
        {/* Título e navegação de data */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">📅</span>
              <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                AGENDA ÚNICA
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{titleDate}</h1>
            <p className="text-sm text-gray-500 mt-1">Gerenciamento de agendamentos</p>
          </div>

          {/* Botão Novo Agendamento */}
          <button
            onClick={onNewAppointment}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            Novo Agendamento
          </button>

          {/* 📱 Botão WhatsApp Confirmações */}
          <button
            onClick={onSendWhatsApp}
            disabled={whatsappLoading || !onSendWhatsApp}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center gap-2"
          >
            <span className="text-lg">📱</span>
            {whatsappLoading ? 'Enviando...' : 'Confirmar Agendamentos'}
          </button>
        </div>

        {/* Controles de navegação */}
        <div className="flex items-center gap-4">
          {/* Seletor de data CUSTOMIZADO - sem input nativo */}
          <div className="flex items-center gap-0 border border-gray-300 rounded-lg bg-white overflow-hidden">
            {/* Botão anterior (dia anterior) */}
            <button
              onClick={onPreviousDay}
              className="p-2 text-gray-700 hover:bg-gray-100 transition"
              title="Dia anterior"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            
            {/* Display de data CUSTOMIZADO - SEM INPUT NATIVO */}
            <div className="flex items-center gap-2 px-4 py-2 border-l border-r border-gray-300 min-w-[140px] justify-center">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">{date}</span>
            </div>
            
            {/* Botão próximo (próximo dia) */}
            <button
              onClick={onNextDay}
              className="p-2 text-gray-700 hover:bg-gray-100 transition"
              title="Próximo dia"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Botões de navegação rápida */}
          <button
            onClick={onTodayClick}
            className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium text-sm"
          >
            Hoje
          </button>

          {/* Separador */}
          <div className="w-px h-6 bg-gray-200"></div>

          {/* Botões de visualização por período */}
          <button
            onClick={onWeekClick}
            className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium"
          >
            Semana
          </button>

          <button
            onClick={onMonthClick}
            className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium"
          >
            Mês
          </button>
        </div>
      </div>
    </div>
  );
}

