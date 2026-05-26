import React, { useState } from 'react';
import { generateDailyReport, generateWeeklyReport, generateMonthlyReport, generateReportSummary, exportReportToCSV } from './ReportGenerator';

export function PeriodReportViewer({ report, reportType }) {
  const [expandedSection, setExpandedSection] = useState('summary');
  
  if (!report) return null;
  
  const { totalActions, byAction, byProfessional, byPatient, displayDate, displayWeek, displayMonth } = report;
  const periodName = displayDate || displayWeek || displayMonth;
  const summary = generateReportSummary(report, reportType);
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{periodName}</h3>
          <p className="text-sm text-gray-600">{summary}</p>
        </div>
        <button
          onClick={() => exportReportToCSV(report, reportType, `auditoria_${reportType}_${periodName}.csv`)}
          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium"
        >
          📥 Exportar CSV
        </button>
      </div>
      
      {/* Action Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-green-50 p-3 rounded">
          <p className="text-xs text-gray-600">Criações</p>
          <p className="text-2xl font-bold text-green-600">{byAction.CREATED || 0}</p>
        </div>
        <div className="bg-blue-50 p-3 rounded">
          <p className="text-xs text-gray-600">Atualizações</p>
          <p className="text-2xl font-bold text-blue-600">{byAction.UPDATED || 0}</p>
        </div>
        <div className="bg-red-50 p-3 rounded">
          <p className="text-xs text-gray-600">Deleções</p>
          <p className="text-2xl font-bold text-red-600">{byAction.DELETED || 0}</p>
        </div>
      </div>
      
      {/* Expandable Sections */}
      <div className="space-y-2">
        {/* Professionals */}
        <div className="border rounded">
          <button
            onClick={() => setExpandedSection(expandedSection === 'professionals' ? null : 'professionals')}
            className="w-full px-3 py-2 text-left font-medium text-gray-700 hover:bg-gray-50 flex justify-between items-center"
          >
            <span>👤 Profissionais ({Object.keys(byProfessional).length})</span>
            <span>{expandedSection === 'professionals' ? '▼' : '▶'}</span>
          </button>
          {expandedSection === 'professionals' && (
            <div className="bg-gray-50 p-3 border-t max-h-48 overflow-y-auto">
              {Object.entries(byProfessional).map(([prof, data]) => (
                <div key={prof} className="text-sm mb-2 pb-2 border-b last:border-b-0">
                  <p className="font-medium">{prof}</p>
                  <p className="text-xs text-gray-600">
                    {data.count} ações | ✓ {data.byAction.CREATED} | ◆ {data.byAction.UPDATED} | ✕ {data.byAction.DELETED}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Patients */}
        <div className="border rounded">
          <button
            onClick={() => setExpandedSection(expandedSection === 'patients' ? null : 'patients')}
            className="w-full px-3 py-2 text-left font-medium text-gray-700 hover:bg-gray-50 flex justify-between items-center"
          >
            <span>🏥 Pacientes ({Object.keys(byPatient).length})</span>
            <span>{expandedSection === 'patients' ? '▼' : '▶'}</span>
          </button>
          {expandedSection === 'patients' && (
            <div className="bg-gray-50 p-3 border-t max-h-48 overflow-y-auto">
              {Object.entries(byPatient).map(([patient, data]) => (
                <div key={patient} className="text-sm mb-2 pb-2 border-b last:border-b-0">
                  <p className="font-medium">{patient}</p>
                  <p className="text-xs text-gray-600">
                    {data.count} ações | ✓ {data.byAction.CREATED} | ◆ {data.byAction.UPDATED} | ✕ {data.byAction.DELETED}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReportsPanel({ logs }) {
  const [reportType, setReportType] = useState('daily');
  const [reports, setReports] = useState([]);
  
  const handleGenerateReports = () => {
    let newReports = [];
    if (reportType === 'daily') {
      newReports = generateDailyReport(logs);
    } else if (reportType === 'weekly') {
      newReports = generateWeeklyReport(logs);
    } else if (reportType === 'monthly') {
      newReports = generateMonthlyReport(logs);
    }
    
    setReports(newReports);
  };
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Relatórios por Período</h2>
      
      <div className="flex gap-2 mb-4">
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="daily">Resumo Diário</option>
          <option value="weekly">Resumo Semanal</option>
          <option value="monthly">Resumo Mensal</option>
        </select>
        <button
          onClick={handleGenerateReports}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Gerar Relatórios
        </button>
      </div>
      
      <div className="space-y-2">
        {reports.length > 0 ? (
          reports.map((report, idx) => (
            <PeriodReportViewer key={idx} report={report} reportType={reportType} />
          ))
        ) : (
          <p className="text-gray-500 text-sm">Clique em "Gerar Relatórios" para visualizar</p>
        )}
      </div>
    </div>
  );
}
