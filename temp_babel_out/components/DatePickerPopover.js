import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Feriados Nacionais Brasileiros 2026
 * Formato: MM-DD (mês-dia)
 */
const FERIADOS_BRASIL = {
  '01-01': 'Ano Novo',
  '02-13': 'Sexta-feira de Carnaval',
  '02-14': 'Carnaval',
  '02-16': 'Segunda de Carnaval',
  '04-03': 'Sexta-feira Santa',
  '04-21': 'Tiradentes',
  '05-01': 'Dia do Trabalho',
  '05-28': 'Corpus Christi',
  '09-07': 'Independência',
  '10-12': 'Nossa Senhora Aparecida',
  '11-02': 'Finados',
  '11-15': 'Proclamação da República',
  '11-20': 'Consciência Negra',
  '12-25': 'Natal'
};

/**
 * Helper para verificar se uma data é feriado
 */
const isFeriado = date => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const key = `${month}-${day}`;
  return FERIADOS_BRASIL[key];
};

/**
 * DatePickerPopover
 * - Sem loop de render
 * - Estado derivado sincronizado corretamente
 * - Render estável e previsível
 */

export default function DatePickerPopover({
  selectedDate,
  onChange,
  agendaSummary = {}
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const modalRef = useRef(null);

  // Garantir que selectedDate é sempre uma Date válida
  const validSelectedDate = useMemo(() => {
    if (!selectedDate || !(selectedDate instanceof Date)) {
      return new Date();
    }
    return selectedDate;
  }, [selectedDate]);
  const [viewDate, setViewDate] = useState(() => {
    return new Date(validSelectedDate.getFullYear(), validSelectedDate.getMonth(), 1);
  });
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  // ✅ SINCRONIZAÇÃO CORRETA com selectedDate
  // (depende apenas de valores primitivos)
  useEffect(() => {
    setViewDate(new Date(validSelectedDate.getFullYear(), validSelectedDate.getMonth(), 1));
  }, [validSelectedDate.getFullYear(), validSelectedDate.getMonth()]);

  // 🔹 Dias do mês (memoizado) - incluindo dias vazios do mês anterior/próximo
  const days = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startDate = new Date(firstDay);

    // Volta para o domingo anterior ao primeiro dia do mês
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    const result = [];
    const currentDate = new Date(startDate);

    // Adiciona 42 dias (6 semanas) para cobrir o calendário inteiro
    while (result.length < 42) {
      result.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return result;
  }, [viewYear, viewMonth]);

  // 🔹 Nome do mês
  const monthName = useMemo(() => {
    return new Date(viewYear, viewMonth).toLocaleString('pt-BR', {
      month: 'long'
    });
  }, [viewYear, viewMonth]);

  // 🔹 Navegação de meses
  const handlePrevMonth = useCallback(() => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);
  const handleNextMonth = useCallback(() => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);
  const setViewMonth = useCallback(m => {
    setViewDate(new Date(viewYear, m, 1));
  }, [viewYear]);
  const setViewYear = useCallback(y => {
    setViewDate(new Date(y, viewMonth, 1));
  }, [viewMonth]);
  const handleSelectDate = useCallback(date => {
    onChange(date);
    // ✅ NÃO fecha o calendário aqui!
    // O calendário fecha apenas ao clicar fora
  }, [onChange]);
  const handleGoToday = useCallback(() => {
    const today = new Date();
    onChange(today);
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    // ✅ NÃO fecha o calendário aqui!
  }, [onChange]);

  // 🔹 Click fora - DESABILITADO com Portal (backdrop cuida disso)
  // useEffect(() => {
  //   if (!open) return;
  //   const handleClickOutside = (e) => {
  //     if (ref.current && !ref.current.contains(e.target)) {
  //       setOpen(false);
  //     }
  //   };
  //   document.addEventListener('mousedown', handleClickOutside);
  //   return () => document.removeEventListener('mousedown', handleClickOutside);
  // }, [open]);

  // 🔹 Fechar ao clicar fora (detectar clicks no documento)
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = e => {
      // Se clicou na ref (botão picker), não fecha
      if (ref.current && ref.current.contains(e.target)) {
        return;
      }
      // Se clicou dentro da modal, não fecha
      if (modalRef.current && modalRef.current.contains(e.target)) {
        return;
      }
      // Clicou realmente fora
      setOpen(false);
    };

    // Pequeno delay para evitar conflitos com o click no botão
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [open]);

  // 🔹 Atalho teclado (ESC para fechar)
  useEffect(() => {
    if (!open) return;
    const handleKey = e => {
      if (e.key === 'Escape') {
        console.log('⚠️ ESC - fechando');
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  // 🔹 Atalho teclado (Ctrl + K para abrir)
  useEffect(() => {
    const handleKey = e => {
      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        console.log('⌨️ Ctrl+K - abrindo');
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // 🔹 Status helper
  const getStatusColor = useCallback(status => {
    const map = {
      full: 'bg-red-500',
      partial: 'bg-yellow-400',
      holiday: 'bg-purple-500'
    };
    return map[status] || 'bg-green-500';
  }, []);

  // 🔹 Dias renderizados
  const dayButtons = useMemo(() => {
    const todayStr = new Date().toDateString();
    const selectedStr = validSelectedDate.toDateString();
    return days.map(date => {
      const dateStr = date.toDateString();
      const key = date.toISOString().split('T')[0];
      const meta = agendaSummary[key];
      const feriado = isFeriado(date);
      const isCurrentMonth = date.getMonth() === viewMonth;
      const isSelected = dateStr === selectedStr;
      const isToday = dateStr === todayStr;
      const isFeriadoDay = !!feriado;

      // Se é feriado, mostrar com status holiday mesmo sem meta
      const displayMeta = isFeriadoDay ? {
        status: 'holiday',
        label: feriado
      } : meta;
      return /*#__PURE__*/React.createElement("button", {
        key: key,
        onClick: () => isCurrentMonth && handleSelectDate(date),
        title: displayMeta?.label || '',
        className: `relative h-9 rounded font-medium transition-all
            ${!isCurrentMonth ? 'text-gray-300 cursor-default' : isSelected ? 'bg-blue-500 text-white' : isToday ? 'border border-dashed border-gray-400' : 'text-gray-700 hover:bg-gray-100'}
          `
      }, date.getDate(), isCurrentMonth && displayMeta && /*#__PURE__*/React.createElement("span", {
        className: `absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full ${displayMeta.status === 'full' ? 'bg-red-500' : displayMeta.status === 'partial' ? 'bg-yellow-400' : displayMeta.status === 'holiday' ? 'bg-purple-500' : 'bg-green-500'}`
      }));
    });
  }, [days, validSelectedDate, agendaSummary, handleSelectDate, getStatusColor]);

  // 🔹 Anos disponíveis
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({
      length: 7
    }, (_, i) => current - 3 + i);
  }, []);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "relative",
    ref: ref
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(o => !o),
    className: "flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col text-left"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-semibold"
  }, format(validSelectedDate, 'dd/MM/yyyy')), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-gray-500"
  }, validSelectedDate.toLocaleDateString('pt-BR', {
    weekday: 'long'
  }))), /*#__PURE__*/React.createElement("span", {
    className: "ml-1"
  }, "\uD83D\uDCC5"))), open && /*#__PURE__*/createPortal(/*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[9998]"
  }), /*#__PURE__*/React.createElement("div", {
    ref: modalRef,
    className: "fixed top-1/2 left-1/2 z-[9999] w-96 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg border border-gray-300 shadow-lg p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 mb-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handlePrevMonth,
    className: "p-2 hover:bg-gray-100 rounded transition-colors hover:text-blue-600",
    title: "M\xEAs anterior"
  }, "\u2039"), /*#__PURE__*/React.createElement("select", {
    value: viewMonth,
    onChange: e => setViewMonth(Number(e.target.value)),
    className: "flex-1 px-2.5 py-2 text-sm border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
  }, Array.from({
    length: 12
  }).map((_, i) => /*#__PURE__*/React.createElement("option", {
    key: i,
    value: i
  }, new Date(2020, i).toLocaleString('pt-BR', {
    month: 'long'
  })))), /*#__PURE__*/React.createElement("select", {
    value: viewYear,
    onChange: e => setViewYear(Number(e.target.value)),
    className: "px-2.5 py-2 text-sm border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-24"
  }, Array.from({
    length: 12
  }).map((_, i) => {
    const year = viewYear - 6 + i;
    return /*#__PURE__*/React.createElement("option", {
      key: year,
      value: year
    }, year);
  })), /*#__PURE__*/React.createElement("button", {
    onClick: handleNextMonth,
    className: "p-2 hover:bg-gray-100 rounded transition-colors hover:text-blue-600",
    title: "Pr\xF3ximo m\xEAs"
  }, "\u203A")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-7 text-xs text-center font-semibold text-gray-600 mb-3"
  }, ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(d => /*#__PURE__*/React.createElement("div", {
    key: d,
    className: "py-2"
  }, d))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-7 gap-1.5 mb-4"
  }, dayButtons), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-gray-100 pt-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleGoToday,
    className: "text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors mb-2 block"
  }, "\u2190 Hoje"), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-gray-600 flex items-center justify-start gap-4 flex-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "h-1.5 w-1.5 rounded-full bg-green-500"
  }), /*#__PURE__*/React.createElement("span", null, "Livre")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "h-1.5 w-1.5 rounded-full bg-yellow-400"
  }), /*#__PURE__*/React.createElement("span", null, "Parcial")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "h-1.5 w-1.5 rounded-full bg-red-500"
  }), /*#__PURE__*/React.createElement("span", null, "Cheio")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "h-1.5 w-1.5 rounded-full bg-purple-500"
  }), /*#__PURE__*/React.createElement("span", null, "Feriado")))))), document.getElementById('popover-root')));
}