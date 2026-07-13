/**
 * PeriodFilter Component
 * Seletor de período para o dashboard (7d, 30d, 90d, 12m, custom)
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

export function PeriodFilter({ onPeriodChange, currentPeriod = '30d' }) {
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const periods = [
    { id: '7d', label: '7 dias', days: 7 },
    { id: '30d', label: '30 dias', days: 30 },
    { id: '90d', label: '90 dias', days: 90 },
    { id: '12m', label: '12 meses', days: 365 },
  ];

  const handlePeriodClick = (periodId) => {
    setShowCustom(false);
    onPeriodChange(periodId, null, null);
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onPeriodChange('custom', new Date(customStart), new Date(customEnd));
      setShowCustom(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Período rápido */}
      <div className="flex flex-wrap gap-1.5">
        {periods.map((period) => (
          <Button
            key={period.id}
            onClick={() => handlePeriodClick(period.id)}
            variant={currentPeriod === period.id ? 'default' : 'outline'}
            size="sm"
            className={`h-8 px-2.5 text-xs transition ${
              currentPeriod === period.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {period.label}
          </Button>
        ))}

        {/* Custom period toggle */}
        <Button
          onClick={() => setShowCustom(!showCustom)}
          variant={currentPeriod === 'custom' ? 'default' : 'outline'}
          size="sm"
          className={`flex h-8 items-center gap-1 px-2.5 text-xs transition ${
            currentPeriod === 'custom'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Calendar size={14} />
          Custom
        </Button>
      </div>

      {/* Custom date picker */}
      {showCustom && (
        <div className="flex items-end gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-600">Data Início</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm mt-1"
            />
          </div>

          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-600">Data Fim</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm mt-1"
            />
          </div>

          <Button
            onClick={handleCustomApply}
            size="sm"
            className="bg-blue-600 text-white hover:bg-blue-700"
            disabled={!customStart || !customEnd}
          >
            Aplicar
          </Button>
        </div>
      )}
    </div>
  );
}
