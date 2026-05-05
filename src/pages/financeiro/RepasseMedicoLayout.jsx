import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RepasseMedicoPage from './RepasseMedicoPage';
import RepasseRegrasPage from './RepasseRegrasPage';
import RepasseDashboardAnalyticsPage from './RepasseDashboardAnalyticsPage';
import RepasseAutomacaoPage from './RepasseAutomacaoPage';

export default function RepasseMedicoLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'visao-geral';

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="bg-white border-b border-gray-200 px-6 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Repasse Médico</h1>
          <p className="text-gray-600 mt-2">
            Gestão completa de repassos com análise avançada e automação
          </p>
        </div>

        {/* Abas */}
        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <div className="bg-white border-b border-gray-200 px-6">
            <TabsList className="w-full justify-start bg-transparent border-b-0">
              <TabsTrigger
                value="visao-geral"
                className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none border-b-2 border-transparent"
              >
                📊 Visão Geral
              </TabsTrigger>
              <TabsTrigger
                value="regras-avancadas"
                className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none border-b-2 border-transparent"
              >
                🔥 Regras Avançadas
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none border-b-2 border-transparent"
              >
                📈 Analytics
              </TabsTrigger>
              <TabsTrigger
                value="automacao"
                className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none border-b-2 border-transparent"
              >
                🤖 Automação
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Conteúdo das abas */}
          <div className="p-6">
            <TabsContent value="visao-geral" className="mt-0">
              <RepasseMedicoPage />
            </TabsContent>

            <TabsContent value="regras-avancadas" className="mt-0">
              <RepasseRegrasPage />
            </TabsContent>

            <TabsContent value="analytics" className="mt-0">
              <RepasseDashboardAnalyticsPage />
            </TabsContent>

            <TabsContent value="automacao" className="mt-0">
              <RepasseAutomacaoPage />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
