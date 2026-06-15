/**
 * Financial Calendar Component
 * Calendário visual com datas importantes financeiras
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, AlertCircle } from 'lucide-react';
import { getReceivablesForCalendar } from '@/lib/agingAnalysisApi';

interface FinancialCalendarProps {
  clinicId: string;
}

interface CalendarEvent {
  date: Date;
  title: string;
  type: 'receivable' | 'repayment' | 'bank' | 'conciliation';
  amount?: number;
  status?: string;
}

const FinancialCalendar: React.FC<FinancialCalendarProps> = ({ clinicId }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch calendar events
  useEffect(() => {
    if (!clinicId) return;

    const fetchEvents = async () => {
      try {
        setLoading(true);

        // Get receivables due this month
        const receivables = await getReceivablesForCalendar(
          clinicId,
          currentMonth
        );

        const calendarEvents: CalendarEvent[] = receivables.map((r: any) => ({
          date: new Date(r.due_date),
          title: `Recebimento: ${r.description}`,
          type: 'receivable',
          amount: r.amount,
          status: r.status
        }));

        setEvents(calendarEvents);
      } catch (error) {
        console.error('Error loading calendar events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [clinicId, currentMonth]);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const eventsForDay = (day: number): CalendarEvent[] => {
    return events.filter(event => event.date.getDate() === day);
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => null);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendário Financeiro
          </CardTitle>
          <div className="flex gap-2">
            <button
              onClick={prevMonth}
              className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm"
            >
              ←
            </button>
            <span className="px-4 py-1 font-semibold">
              {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button
              onClick={nextMonth}
              className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm"
            >
              →
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {/* Days of week header */}
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(day => (
            <div key={day} className="text-center font-bold text-sm text-gray-600 py-2">
              {day}
            </div>
          ))}

          {/* Empty cells for first week */}
          {blanks.map((_, idx) => (
            <div key={`blank-${idx}`} className="p-2 h-20 bg-gray-50 rounded"></div>
          ))}

          {/* Days of month */}
          {days.map(day => {
            const dayEvents = eventsForDay(day);
            const isToday = new Date().getDate() === day && 
                           new Date().getMonth() === currentMonth.getMonth();

            return (
              <div
                key={day}
                className={`p-2 h-20 rounded border-2 overflow-hidden ${
                  isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className={`text-sm font-bold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                  {day}
                </div>
                <div className="space-y-1 text-xs">
                  {dayEvents.slice(0, 2).map((event, idx) => (
                    <div
                      key={idx}
                      className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded truncate flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{event.amount ? `R$ ${(event.amount / 1000).toFixed(0)}k` : event.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-gray-500 text-xs">
                      +{dayEvents.length - 2} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Events List for Current Month */}
        {events.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="font-semibold text-sm mb-3">Eventos do Mês</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {events.sort((a, b) => a.date.getTime() - b.date.getTime()).map((event, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 bg-gray-50 rounded text-sm">
                  <div className="w-1 h-full bg-blue-500 rounded flex-shrink-0 mt-1"></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium truncate">{event.date.toLocaleDateString('pt-BR')}</span>
                      {event.amount && (
                        <span className="font-bold text-blue-600 flex-shrink-0">
                          R$ {(event.amount / 1000).toFixed(1)}k
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 truncate">{event.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {events.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhum evento financeiro para este mês</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FinancialCalendar;
