// src/pages/clinica/faturamento/FaturamentoPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, Send, CheckCircle, Settings, BarChart3, Download } from 'lucide-react';

export default function FaturamentoPage() {
  const navigate = useNavigate();

  const modules = [
    {
      id: 'guias',
      title: 'Guias TISS',
      description: 'Gerenciar guias de consulta, internação e SADT',
      icon: FileText,
      color: 'bg-blue-50 text-blue-600',
      path: '/clinica/faturamento/guias',
      items: ['Guias de Consulta', 'Guias de Internação', 'Guias SADT'],
    },
    {
      id: 'xml',
      title: 'Envio de XML',
      description: 'Enviar e acompanhar envios de arquivos TISS',
      icon: Send,
      color: 'bg-green-50 text-green-600',
      path: '/clinica/faturamento/xml',
      items: ['Envios Pendentes', 'Histórico de Envios', 'Status de Processamento'],
    },
    {
      id: 'retornos',
      title: 'Retornos & Recibos',
      description: 'Acompanhar retornos de processamento e recibos',
      icon: CheckCircle,
      color: 'bg-purple-50 text-purple-600',
      path: '/clinica/faturamento/retornos',
      items: ['Recibos de Envio', 'Retornos Processados', 'Erros & Rejeições'],
    },
    {
      id: 'relatorios',
      title: 'Relatórios',
      description: 'Relatórios de faturamento e análises',
      icon: BarChart3,
      color: 'bg-orange-50 text-orange-600',
      path: '/clinica/faturamento/relatorios',
      items: ['Faturamento por Período', 'Análise de Glosas', 'Performance'],
    },
    {
      id: 'lotes',
      title: 'Lotes de Envio',
      description: 'Gerenciar lotes de processamento em lote',
      icon: Download,
      color: 'bg-indigo-50 text-indigo-600',
      path: '/clinica/faturamento/lotes',
      items: ['Criar Lote', 'Acompanhar Lotes', 'Histórico'],
    },
    {
      id: 'configuracoes',
      title: 'Configurações',
      description: 'Configurações de faturamento e TISS',
      icon: Settings,
      color: 'bg-gray-50 text-gray-600',
      path: '/clinica/configuracoes/faturamento',
      items: ['Parâmetros TISS', 'Integração', 'Validações'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Faturamento</h1>
        <p className="text-gray-600 mt-2">
          Gerencie guias TISS, envios XML e acompanhe a faturação
        </p>
      </div>

      {/* Grid de Módulos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Card
              key={module.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(module.path)}
            >
              <CardHeader className="pb-3">
                <div
                  className={`w-12 h-12 rounded-lg ${module.color} flex items-center justify-center mb-3`}
                >
                  <Icon size={24} />
                </div>
                <CardTitle className="text-lg">{module.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">{module.description}</p>

                {/* Submódulos */}
                <ul className="space-y-2">
                  {module.items.map((item, idx) => (
                    <li key={idx} className="text-sm text-gray-500 flex items-center">
                      <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Guias Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">0</div>
            <p className="text-xs text-gray-500 mt-1">Aguardando processamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Faturado (Mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">R$ 0,00</div>
            <p className="text-xs text-gray-500 mt-1">Últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Taxa Glosa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">0%</div>
            <p className="text-xs text-gray-500 mt-1">Rejeições detectadas</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
