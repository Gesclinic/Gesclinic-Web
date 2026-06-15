// src/pages/clinica/faturamento/GuiasPage.jsx
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GuiasConsulta from './tiss/GuiasConsulta';

export default function GuiasPage() {
  const [activeTab, setActiveTab] = useState('consulta');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Guias TISS</h1>
          <p className="text-gray-600 mt-2">Gerencie guias de consulta, internação e SADT</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="consulta">Guias de Consulta</TabsTrigger>
          <TabsTrigger value="internacao">Guias de Internação</TabsTrigger>
          <TabsTrigger value="sadt">Guias SADT</TabsTrigger>
        </TabsList>

        {/* Guias de Consulta */}
        <TabsContent value="consulta" className="space-y-6">
          <GuiasConsulta
            tipoGuia="SP"
            titulo="Guias de Consulta"
            descricao="Criação, edição e visualização de guias de serviço profissional"
          />
        </TabsContent>

        {/* Guias de Internação */}
        <TabsContent value="internacao" className="space-y-6">
          <GuiasConsulta
            tipoGuia="Internação"
            titulo="Guias de Internação"
            descricao="Criação, edição e visualização de guias de internação persistidas"
          />
        </TabsContent>

        {/* Guias SADT */}
        <TabsContent value="sadt" className="space-y-6">
          <GuiasConsulta
            tipoGuia="SADT"
            titulo="Guias SADT"
            descricao="Criação, edição e visualização de serviços auxiliares diagnósticos e terapêuticos"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
