import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RepasseMedicoPage from './RepasseMedicoPage';
import RepasseRegrasPage from './RepasseRegrasPage';
import RepasseDashboardAnalyticsPage from './RepasseDashboardAnalyticsPage';
import RepasseAutomacaoPage from './RepasseAutomacaoPage';
import BankAccountsManager from '@/pages/clinica/configuracoes/BankAccountsManager';

export default function RepasseMedicoLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'visao-geral';
  const [subTab, setSubTab] = useState('regras');

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  return (
    <div className="w-full space-y-6 bg-slate-50">
      <div className="w-full">
        {/* Cabeçalho */}
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Repasse Médico</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestão completa de repassos com análise avançada e automação
          </p>
        </div>

        {/* Abas */}
        <Tabs value={currentTab} onValueChange={handleTabChange} className="mt-4 w-full">
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white px-4 shadow-sm">
            <TabsList className="h-auto w-max min-w-full justify-start gap-1 bg-transparent p-0">
              <TabsTrigger
                value="visao-geral"
                className="min-h-10 rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
              >
                Visão Geral
              </TabsTrigger>
              <TabsTrigger
                value="regras-avancadas"
                className="min-h-10 rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
              >
                Regras Avançadas
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="min-h-10 rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
              >
                Analytics
              </TabsTrigger>
              <TabsTrigger
                value="automacao"
                className="min-h-10 rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
              >
                Automação
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Conteúdo das abas */}
          <div className="mt-4">
            <TabsContent value="visao-geral" className="mt-0">
              <RepasseMedicoPage />
            </TabsContent>

            <TabsContent value="regras-avancadas" className="mt-0">
              {/* Sub-abas dentro de Regras Avançadas */}
              <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
                  <div className="overflow-x-auto border-b border-gray-200 px-4">
                    <TabsList className="h-auto w-max min-w-full justify-start bg-transparent p-0">
                      <TabsTrigger
                        value="regras"
                        className="min-h-10 rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
                      >
                        Regras de Repasse
                      </TabsTrigger>
                      <TabsTrigger
                        value="contas"
                        className="min-h-10 rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600"
                      >
                        Contas Bancárias
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <div className="p-6">
                    <TabsContent value="regras" className="mt-0">
                      <RepasseRegrasPage />
                    </TabsContent>
                    <TabsContent value="contas" className="mt-0">
                      <BankAccountsManager />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
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
