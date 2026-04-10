// src/pages/clinica/faturamento/RetornosPage.jsx
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertCircle, Download } from 'lucide-react';

export default function RetornosPage() {
  const [activeTab, setActiveTab] = useState('recibos');

  const mockData = {
    recibos: [
      {
        id: 1,
        recibo: 'REC-001',
        lote: 'LOT-2025-001',
        guias: 10,
        dataEnvio: '2025-12-20',
        dataRecebimento: '2025-12-20 14:30',
        status: 'Recebido',
      },
      {
        id: 2,
        recibo: 'REC-002',
        lote: 'LOT-2025-002',
        guias: 8,
        dataEnvio: '2025-12-19',
        dataRecebimento: '2025-12-19 16:45',
        status: 'Recebido',
      },
    ],
    retornos: [
      {
        id: 1,
        recibo: 'REC-001',
        lote: 'LOT-2025-001',
        dataProcessamento: '2025-12-21 08:15',
        guiasProcessadas: 10,
        guiasAceitas: 9,
        guiasRejeitadas: 1,
        status: 'Processado com erros',
      },
    ],
    erros: [
      {
        id: 1,
        recibo: 'REC-001',
        lote: 'LOT-2025-001',
        guia: 'GUIA-00005',
        erro: 'Profissional não credenciado',
        codigo: 'ERR-0001',
        data: '2025-12-21 08:15',
      },
      {
        id: 2,
        recibo: 'REC-002',
        lote: 'LOT-2025-002',
        guia: 'GUIA-00012',
        erro: 'Data de serviço inválida',
        codigo: 'ERR-0005',
        data: '2025-12-21 09:30',
      },
    ],
  };

  const getStatusColor = (status) => {
    if (status.includes('Recebido')) return 'bg-green-100 text-green-800';
    if (status.includes('erro')) return 'bg-red-100 text-red-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Retornos & Recibos</h1>
        <p className="text-gray-600 mt-2">
          Acompanhe retornos de processamento e recibos de envio
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="recibos">Recibos ({mockData.recibos.length})</TabsTrigger>
          <TabsTrigger value="retornos">Retornos ({mockData.retornos.length})</TabsTrigger>
          <TabsTrigger value="erros">Erros & Rejeições ({mockData.erros.length})</TabsTrigger>
        </TabsList>

        {/* Recibos */}
        <TabsContent value="recibos">
          <Card>
            <CardHeader>
              <CardTitle>Recibos de Envio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Recibo</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Lote</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Guias</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Data Envio</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Recebimento</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockData.recibos.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono text-blue-600">{item.recibo}</td>
                        <td className="py-3 px-4">{item.lote}</td>
                        <td className="py-3 px-4 text-center">{item.guias}</td>
                        <td className="py-3 px-4">{item.dataEnvio}</td>
                        <td className="py-3 px-4">{item.dataRecebimento}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                            ✓ {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button className="text-blue-600 hover:text-blue-800">
                            <Download size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retornos */}
        <TabsContent value="retornos">
          <Card>
            <CardHeader>
              <CardTitle>Retornos de Processamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockData.retornos.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Recibo</p>
                        <p className="font-mono font-semibold">{item.recibo}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Lote</p>
                        <p className="font-semibold">{item.lote}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Data Processamento</p>
                        <p className="text-sm">{item.dataProcessamento}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Status</p>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{item.guiasProcessadas}</p>
                        <p className="text-xs text-gray-500">Processadas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{item.guiasAceitas}</p>
                        <p className="text-xs text-gray-500">Aceitas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">{item.guiasRejeitadas}</p>
                        <p className="text-xs text-gray-500">Rejeitadas</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Erros */}
        <TabsContent value="erros">
          <Card>
            <CardHeader>
              <CardTitle>Erros & Rejeições</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Código</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Guia</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Erro</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Recibo</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Data</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockData.erros.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-red-50">
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                            {item.codigo}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">{item.guia}</td>
                        <td className="py-3 px-4">
                          <span className="flex items-center text-red-600">
                            <AlertCircle size={16} className="mr-2" />
                            {item.erro}
                          </span>
                        </td>
                        <td className="py-3 px-4">{item.recibo}</td>
                        <td className="py-3 px-4 text-xs text-gray-500">{item.data}</td>
                        <td className="py-3 px-4 text-center">
                          <button className="text-blue-600 hover:text-blue-800 text-sm">
                            Corrigir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

