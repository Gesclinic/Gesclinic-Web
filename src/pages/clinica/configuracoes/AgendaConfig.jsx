import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AgendaConfigScreen from "@/pages/clinica/agenda/configuracoes/AgendaConfigScreen";
import PageLayout from "@/components/ui/PageLayout";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";

export default function AgendaConfig() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const currentTab = tab || 'central-horarios';

  const breadcrumbs = useBreadcrumbs([
    { label: "Clínica", path: "/clinica" },
    { label: "Configurações", path: "/clinica/configuracoes" },
    { label: "Agenda" }
  ]);

  const handleTabChange = (value) => {
    navigate(`/clinica/configuracoes/agenda/${value}`);
  };

  return (
    <PageLayout
      title="Configurações de Agenda"
      subtitle="Comportamento, regras, profissionais e serviços."
      breadcrumbs={breadcrumbs}
    >
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
          <TabsTrigger value="central-horarios">3.0 Central de Horários</TabsTrigger>
          <TabsTrigger value="regras">3.1 Parametrização</TabsTrigger>
          <TabsTrigger value="profissionais">3.2 Profissionais</TabsTrigger>
          <TabsTrigger value="servicos">3.3 Serviços</TabsTrigger>
          <TabsTrigger value="grupos">3.4 Grupos</TabsTrigger>
          <TabsTrigger value="tipos">3.5 Tipos</TabsTrigger>
          <TabsTrigger value="motivos">3.6 Motivos</TabsTrigger>
          <TabsTrigger value="notificacoes">3.7 Notificações</TabsTrigger>
        </TabsList>
        <TabsContent value="central-horarios" className="mt-4">
          <AgendaConfigScreen />
        </TabsContent>

        <TabsContent value="regras" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>3.1 Fluxo e Regras da Agenda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>• Slot da agenda</p>
              <p>• Tempo padrão de atendimento</p>
              <p>• Horário de almoço</p>
              <p>• Permitir horários simultâneos</p>
              <p>• Permitir encaixes?</p>
              <p>• Exibir paciente na agenda após confirmação?</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profissionais" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>3.2 Profissionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>Gerencie os profissionais vinculados à agenda no menu <b>Cadastros &gt; Profissionais</b>.</p>
              <p>Aqui você pode apenas visualizar regras e permissões relacionadas à agenda para cada profissional.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servicos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>3.3 Serviços</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>• Cadastro de serviços disponíveis para agendamento</p>
              <p>• Duração padrão por serviço</p>
              <p>• Regras de bloqueio por serviço</p>
              <p>• Vinculação com convênios</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grupos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>3.4 Grupos de Serviços</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>• Agrupamento de serviços para relatórios e regras</p>
              <p>• Exemplo: Consultas, Exames, Procedimentos</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tipos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>3.5 Tipos de Atendimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>• Primeira consulta</p>
              <p>• Retorno</p>
              <p>• Procedimento</p>
              <p>• Telemedicina</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="motivos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>3.6 Motivos de Cancelamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>• Cadastros</p>
              <p>• Obrigatoriedade</p>
              <p>• Cores</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>3.7 Notificações e Confirmações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>• WhatsApp automático</p>
              <p>• Confirmação X horas antes</p>
              <p>• Regras de reagendamento/cancelamento</p>
              <p>• Mensagens padrão</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}

