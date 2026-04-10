// src/pages/clinica/faturamento/GuiasPage.jsx
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Plus } from 'lucide-react';
import GuiasConsulta from './tiss/GuiasConsulta';

export default function GuiasPage() {
  const [activeTab, setActiveTab] = useState('consulta');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Guias TISS</h1>
          <p className="text-gray-600 mt-2">
            Gerencie guias de consulta, internação e SADT
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={20} />
          Nova Guia
        </button>
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
          <GuiasConsulta />
        </TabsContent>

        {/* Guias de Internação */}
        <TabsContent value="internacao" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Guias de Internação</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Funcionalidade em desenvolvimento...</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guias SADT */}
        <TabsContent value="sadt" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Guias SADT</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Funcionalidade em desenvolvimento...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

