// src/pages/clinica/faturamento/XMLPage.jsx
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, Clock } from 'lucide-react';

export default function XMLPage() {
  const [activeTab, setActiveTab] = useState('pendentes');

  const mockData = {
    pendentes: [
      { id: 1, lote: 'LOT-001', guias: 5, data: '2026-01-15', status: 'Pronto para envio' },
      { id: 2, lote: 'LOT-002', guias: 3, data: '2026-01-15', status: 'Validação' },
    ],
    enviados: [
      { id: 1, lote: 'LOT-2025-001', guias: 10, data: '2025-12-20', recibo: 'REC-001' },
      { id: 2, lote: 'LOT-2025-002', guias: 8, data: '2025-12-19', recibo: 'REC-002' },
    ],
    processamento: [
      { id: 1, recibo: 'REC-001', lote: 'LOT-2025-001', guias: 10, data: '2025-12-20', status: 'Em processamento' },
      { id: 2, recibo: 'REC-002', lote: 'LOT-2025-002', guias: 8, data: '2025-12-19', status: 'Processado' },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Envio de XML TISS</h1>
          <p className="text-gray-600 mt-2">
            Envie e acompanhe o processamento de arquivos XML
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          <Upload size={20} />
          Enviar XML
        </button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes ({mockData.pendentes.length})</TabsTrigger>
          <TabsTrigger value="enviados">Enviados ({mockData.enviados.length})</TabsTrigger>
          <TabsTrigger value="processamento">Em Processamento ({mockData.processamento.length})</TabsTrigger>
        </TabsList>

        {/* Pendentes */}
        <TabsContent value="pendentes">
          <Card>
            <CardHeader>
              <CardTitle>Lotes Aguardando Envio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockData.pendentes.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50">
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.lote}</h3>
                      <p className="text-sm text-gray-600">{item.guias} guias • {item.data}</p>
                      <span className="inline-block mt-2 px-3 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                        {item.status}
                      </span>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                      Enviar
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enviados */}
        <TabsContent value="enviados">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Envios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockData.enviados.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50">
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.lote}</h3>
                      <p className="text-sm text-gray-600">{item.guias} guias • Recibo: {item.recibo}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.data}</p>
                    </div>
                    <button className="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50">
                      Ver Detalhes
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Processamento */}
        <TabsContent value="processamento">
          <Card>
            <CardHeader>
              <CardTitle>Status de Processamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockData.processamento.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50">
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.recibo}</h3>
                      <p className="text-sm text-gray-600">{item.lote} • {item.guias} guias</p>
                      <p className="text-xs text-gray-500 mt-1">{item.data}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 text-xs rounded-full ${
                        item.status === 'Processado'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

