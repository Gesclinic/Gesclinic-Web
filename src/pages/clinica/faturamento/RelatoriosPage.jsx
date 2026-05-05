// src/pages/clinica/faturamento/RelatoriosPage.jsx
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, AlertTriangle, Download } from 'lucide-react';

export default function RelatoriosPage() {
  const [activeTab, setActiveTab] = useState('faturamento');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios de Faturamento</h1>
          <p className="text-gray-600 mt-2">Análises e relatórios de faturamento e desempenho</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Download size={20} />
          Exportar
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <BarChart3 size={16} />
              Faturado (Mês)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">R$ 45.230,00</div>
            <p className="text-xs text-gray-500 mt-2">+12% vs. mês anterior</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp size={16} />
              Guias Processadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">248</div>
            <p className="text-xs text-gray-500 mt-2">De 258 enviadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <AlertTriangle size={16} />
              Taxa de Glosa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">3.9%</div>
            <p className="text-xs text-gray-500 mt-2">10 guias rejeitadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">R$ 182,34</div>
            <p className="text-xs text-gray-500 mt-2">Por guia processada</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="faturamento">Faturamento por Período</TabsTrigger>
          <TabsTrigger value="glosas">Análise de Glosas</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Faturamento por Período */}
        <TabsContent value="faturamento">
          <Card>
            <CardHeader>
              <CardTitle>Faturamento por Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { mes: 'Janeiro/2026', valor: 'R$ 45.230,00', guias: 248, status: 'Mês atual' },
                  { mes: 'Dezembro/2025', valor: 'R$ 40.120,00', guias: 225, status: 'Fechado' },
                  { mes: 'Novembro/2025', valor: 'R$ 38.950,00', guias: 215, status: 'Fechado' },
                  { mes: 'Outubro/2025', valor: 'R$ 42.100,00', guias: 235, status: 'Fechado' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.mes}</h3>
                      <p className="text-sm text-gray-600">{item.guias} guias processadas</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-green-600">{item.valor}</p>
                      <span className="text-xs text-gray-500">{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Análise de Glosas */}
        <TabsContent value="glosas">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Glosas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { motivo: 'Profissional não credenciado', count: 4, percentual: '40%' },
                  { motivo: 'Data de serviço inválida', count: 3, percentual: '30%' },
                  { motivo: 'Código TUSS inválido', count: 2, percentual: '20%' },
                  { motivo: 'Outros', count: 1, percentual: '10%' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.motivo}</h3>
                      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: item.percentual }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-bold text-lg text-red-600">{item.count}</p>
                      <p className="text-sm text-gray-500">{item.percentual}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tempo de Processamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'Tempo médio envio-recibo', valor: '2-3 horas', status: 'Normal' },
                    { label: 'Tempo médio processamento', valor: '4-6 horas', status: 'Normal' },
                    { label: 'Tempo máximo observado', valor: '24 horas', status: 'Aceitável' },
                  ].map((item, idx) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <p className="text-sm text-gray-600">{item.label}</p>
                      <p className="font-semibold text-gray-900 mt-1">{item.valor}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Disponibilidade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'Sistema disponível', valor: '99.8%', cor: 'text-green-600' },
                    { label: 'Uptime TISS', valor: '99.5%', cor: 'text-green-600' },
                    { label: 'Taxa sucesso envios', valor: '96.1%', cor: 'text-green-600' },
                  ].map((item, idx) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <p className="text-sm text-gray-600">{item.label}</p>
                      <p className={`font-semibold text-lg mt-1 ${item.cor}`}>{item.valor}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
