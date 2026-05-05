// src/pages/clinica/faturamento/LotesPage.jsx
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, Download, Trash2, Eye } from 'lucide-react';

export default function LotesPage() {
  const [lotes, setLotes] = useState([
    {
      id: 1,
      nome: 'LOT-2025-001',
      dataCreacao: '2025-12-20',
      guias: 10,
      status: 'Enviado',
      recibo: 'REC-001',
    },
    {
      id: 2,
      nome: 'LOT-2025-002',
      dataCreacao: '2025-12-19',
      guias: 8,
      status: 'Processado',
      recibo: 'REC-002',
    },
    {
      id: 3,
      nome: 'LOT-2026-001',
      dataCreacao: '2026-01-15',
      guias: 5,
      status: 'Rascunho',
      recibo: null,
    },
  ]);

  const getStatusColor = (status) => {
    switch (status) {
    case 'Rascunho':
      return 'bg-gray-100 text-gray-800';
    case 'Enviado':
      return 'bg-blue-100 text-blue-800';
    case 'Processado':
      return 'bg-green-100 text-green-800';
    case 'Erro':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lotes de Envio</h1>
          <p className="text-gray-600 mt-2">Crie e acompanhe lotes de guias para processamento</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={20} />
          Novo Lote
        </button>
      </div>

      {/* Tabela de Lotes */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Lotes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Lote</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Data Criação</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Guias</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Recibo</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lotes.map((lote) => (
                  <tr key={lote.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono font-semibold">{lote.nome}</td>
                    <td className="py-3 px-4">{lote.dataCreacao}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-3 py-1 bg-gray-100 rounded-full text-xs font-semibold">
                        {lote.guias}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(lote.status)}`}
                      >
                        {lote.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {lote.recibo ? (
                        <span className="font-mono text-blue-600">{lote.recibo}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2 justify-center">
                        <button className="text-gray-600 hover:text-blue-600" title="Visualizar">
                          <Eye size={16} />
                        </button>
                        {lote.status === 'Rascunho' && (
                          <>
                            <button className="text-gray-600 hover:text-green-600" title="Enviar">
                              <Download size={16} />
                            </button>
                            <button className="text-gray-600 hover:text-red-600" title="Deletar">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Lotes Rascunho</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {lotes.filter((l) => l.status === 'Rascunho').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Lotes Enviados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {lotes.filter((l) => l.status === 'Enviado').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Lotes Processados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {lotes.filter((l) => l.status === 'Processado').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Total Guias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {lotes.reduce((sum, l) => sum + l.guias, 0)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
