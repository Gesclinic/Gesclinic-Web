/**
 * Página: TISSPage
 * ================
 * Dashboard e gerenciador de guias TISS
 * - Lista de guias aguardando envio
 * - Status de submissões
 * - Histórico de enviados
 * - Métricas e relatórios
 * 
 * Data: Abril 10, 2026
 */

import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle,
  Download,
  RefreshCw,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { useClinicContext } from "@/contexts/ClinicContext";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TISSSubmissionDialog } from "@/components/TISSSubmissionDialog";
import { listPendingTISSGuides, getTISSTAuditHistory } from "@/lib/tissApi";
import { getTISSSubmissionSummary, getRejectedTISSSubmissions } from "@/lib/tissSubmissionServiceApi";

export function TISSPage() {
  const { clinicId } = useClinicContext();
  const { user } = useAuth();
  const [pendingGuides, setPendingGuides] = useState([]);
  const [rejectedGuides, setRejectedGuides] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState({});

  useEffect(() => {
    loadData();
  }, [clinicId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [guides, rejected, sum] = await Promise.all([
        listPendingTISSGuides(clinicId),
        getRejectedTISSSubmissions(clinicId),
        getTISSSubmissionSummary(clinicId),
      ]);

      setPendingGuides(guides);
      setRejectedGuides(rejected);
      setSummary(sum);

      // Carregar audit logs para each guide
      for (const guide of guides) {
        const logs = await getTISSTAuditHistory(guide.id);
        setAuditLogs((prev) => ({ ...prev, [guide.id]: logs }));
      }
    } catch (error) {
      console.error("Erro ao carregar dados TISS:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSubmissionDialog = (guide) => {
    setSelectedGuide(guide);
    setSubmissionDialogOpen(true);
  };

  const handleSubmissionSuccess = () => {
    loadData(); // Recarregar dados
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600">Carregando dados TISS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ======== HEADER ======== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">TISS - Guias</h1>
          <p className="text-gray-600 mt-1">
            Envio de Guias para Operadoras de Saúde
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* ======== MÉTRICAS ======== */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {summary.total}
                </p>
                <p className="text-xs text-gray-600 mt-1">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-600">
                  {summary.pending}
                </p>
                <p className="text-xs text-gray-600 mt-1">Pendentes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {summary.sent}
                </p>
                <p className="text-xs text-gray-600 mt-1">Enviadas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {summary.processing}
                </p>
                <p className="text-xs text-gray-600 mt-1">Processando</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {summary.accepted}
                </p>
                <p className="text-xs text-gray-600 mt-1">Aceitas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">
                  {summary.rejected}
                </p>
                <p className="text-xs text-gray-600 mt-1">Rejeitadas</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======== TABS ======== */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Aguardando Envio ({pendingGuides.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejeitadas ({rejectedGuides.length})
          </TabsTrigger>
          <TabsTrigger value="info">Informações</TabsTrigger>
        </TabsList>

        {/* ======== PENDENTES ======== */}
        <TabsContent value="pending" className="space-y-4">
          {pendingGuides.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="text-gray-600">
                  Nenhuma guia aguardando envio! 🎉
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingGuides.map((guide) => (
                <Card key={guide.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold">
                          Guia: {guide.guide_number}
                        </p>
                        <p className="text-sm text-gray-600">
                          Paciente:{" "}
                          {guide.appointments?.[0]?.patients?.[0]?.name ||
                            "N/A"}
                        </p>
                        <p className="text-sm text-gray-600">
                          Operadora:{" "}
                          {guide.health_insurances?.name || "N/A"}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Criada em:{" "}
                          {new Date(guide.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleOpenSubmissionDialog(guide)}
                        className="flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Enviar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ======== REJEITADAS ======== */}
        <TabsContent value="rejected" className="space-y-4">
          {rejectedGuides.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="text-gray-600">Nenhuma guia rejeitada!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rejectedGuides.map((item) => (
                <Card key={item.id} className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold text-red-900">
                          Guia: {item.billing_guides?.guide_number}
                        </p>
                        <p className="text-sm text-red-800 mt-2">
                          Motivo: {item.error_message || "Não especificado"}
                        </p>
                        {item.response_data?.errors && (
                          <ul className="text-xs text-red-700 mt-2 ml-4 list-disc">
                            {item.response_data.errors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        )}
                        <p className="text-xs text-gray-600 mt-2">
                          Rejeitada em:{" "}
                          {new Date(item.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenSubmissionDialog(item.billing_guides)}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reenviar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ======== INFORMAÇÕES ======== */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>O que é TISS?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                <strong>TISS (Troca de Informações em Saúde Suplementar)</strong>
                é o padrão de intercâmbio de dados entre prestadores de saúde e
                operadoras de planos de saúde, regulado pela
                <strong> Agência Nacional de Saúde Suplementar (ANS)</strong>.
              </p>

              <div>
                <h4 className="font-semibold mb-2">Campos Obrigatórios:</h4>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>Dados do paciente (CPF, nome, data de nascimento)</li>
                  <li>Dados do profissional (CBO, conselho, número registro)</li>
                  <li>Dados do serviço (TUSS code - 10 dígitos)</li>
                  <li>Dados da operadora (ANS, padrão TISS)</li>
                  <li>Data e hora do atendimento</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Status de Submissão:</h4>
                <ul className="space-y-1 text-xs">
                  <li>
                    🟡 <strong>Pendente:</strong> Aguardando envio para operadora
                  </li>
                  <li>
                    🔵 <strong>Enviada:</strong> Recebida pela operadora
                  </li>
                  <li>
                    🟣 <strong>Processando:</strong> Operadora processando
                  </li>
                  <li>
                    🟢 <strong>Aceita:</strong> Guia válida e aceita
                  </li>
                  <li>
                    🔴 <strong>Rejeitada:</strong> Erros que precisam correção
                  </li>
                </ul>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Dúvidas? Consulte a ANS em{" "}
                  <a
                    href="https://www.ans.gov.br"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-600"
                  >
                    www.ans.gov.br
                  </a>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuração por Operadora</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              <p>
                Para configurar credenciais e endpoints TISS para cada
                operadora, acesse:
              </p>
              <Button
                variant="link"
                className="mt-2 px-0"
                onClick={() => (window.location.href = "/clinica/base-sistema/convenios")}
              >
                Convênios e Operadoras →
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ======== DIALOG DE ENVIO ======== */}
      {selectedGuide && (
        <TISSSubmissionDialog
          isOpen={submissionDialogOpen}
          onClose={() => {
            setSubmissionDialogOpen(false);
            setSelectedGuide(null);
          }}
          guideId={selectedGuide.id}
          clinicId={clinicId}
          guideData={selectedGuide}
          onSubmitSuccess={handleSubmissionSuccess}
        />
      )}
    </div>
  );
}

export default TISSPage;
