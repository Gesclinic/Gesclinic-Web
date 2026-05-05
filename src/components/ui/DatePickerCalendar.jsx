// src/components/ui/DatePickerCalendar.jsx
// ============================================================
// Componente de Date Picker com Calendário Visual
// Usa react-calendar com Radix Popover
// ============================================================

import React, { useState } from 'react';
import Calendar from 'react-calendar';
import * as Popover from '@radix-ui/react-popover';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import 'react-calendar/dist/Calendar.css';

export function DatePickerCalendar({
  value,
  onChange,
  placeholder = 'Selecione uma data',
  disabled = false,
  label = '',
}) {
  const [open, setOpen] = useState(false);
  const [activeStartDate, setActiveStartDate] = useState(new Date());

  const handleDateChange = (date) => {
    // Converter para formato YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    onChange(formattedDate);
    setOpen(false);
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) {
      return placeholder;
    }

    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const parseStringToDate = (dateString) => {
    if (!dateString) {
      return new Date();
    }
    return new Date(dateString + 'T00:00:00');
  };

  const handlePrevMonth = () => {
    setActiveStartDate(new Date(activeStartDate.getFullYear(), activeStartDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setActiveStartDate(new Date(activeStartDate.getFullYear(), activeStartDate.getMonth() + 1));
  };

  const handleMonthChange = (e) => {
    const newMonth = parseInt(e.target.value);
    setActiveStartDate(new Date(activeStartDate.getFullYear(), newMonth));
  };

  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value);
    setActiveStartDate(new Date(newYear, activeStartDate.getMonth()));
  };

  const months = [
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

  const currentYear = activeStartDate.getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="block text-xs font-medium text-gray-700">{label}</label>}

      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="px-3 py-2 border rounded text-sm text-left bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
          >
            <span className={value ? 'text-gray-900' : 'text-gray-500'}>
              {formatDisplayDate(value)}
            </span>
            <span className="text-gray-400 text-xs">📅</span>
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            className="z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4"
            align="start"
            side="bottom"
            sideOffset={8}
          >
            {/* Header com Navegação e Selects */}
            <div className="flex items-center justify-between gap-2 mb-4 pb-2 border-b">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-gray-100 rounded text-gray-600 transition"
                title="Mês anterior"
              >
                <ChevronLeft size={20} />
              </button>

              {/* Select Mês */}
              <select
                value={activeStartDate.getMonth()}
                onChange={handleMonthChange}
                className="text-xs font-medium text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {months.map((month, index) => (
                  <option key={index} value={index}>
                    {month}
                  </option>
                ))}
              </select>

              {/* Select Ano */}
              <select
                value={currentYear}
                onChange={handleYearChange}
                className="text-xs font-medium text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-gray-100 rounded text-gray-600 transition"
                title="Próximo mês"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Calendário com navegação padrão */}
            <Calendar
              value={parseStringToDate(value)}
              onChange={handleDateChange}
              locale="pt-BR"
              activeStartDate={activeStartDate}
              onActiveStartDateChange={({ activeStartDate }) => setActiveStartDate(activeStartDate)}
              showNavigation={false}
              showNeighboringMonth={false}
            />

            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="w-full mt-3 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded flex items-center justify-center gap-1 transition"
              >
                <X size={14} /> Limpar
              </button>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
