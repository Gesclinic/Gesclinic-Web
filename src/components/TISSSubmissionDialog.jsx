/**
 * Componente: TISSSubmissionDialog
 * ==============================
 * Gerencia fluxo de envio de guias TISS para operadoras
 * - Validação de dados
 * - Confirmação e envio
 * - Feedback de progresso
 * - Histórico de submissões
 * 
 * Data: Abril 10, 2026
 */

import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Loader,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  validateTISSDataCompleteness,
  generateTISSXML,
  downloadTISSXML,
  getTISSSubmissionStatus,
} from "@/lib/tissApi";
import {
  submitGuideWithOperatorRouting,
  getRejectedTISSSubmissions,
} from "@/lib/tissSubmissionServiceApi";

export function TISSSubmissionDialog({
  isOpen,
  onClose,
  guideId,
  clinicId,
  guideData, // { patient, professional, service, payer, appointment }
  onSubmitSuccess,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [xmlContent, setXmlContent] = useState(null);
  const [activeTab, setActiveTab] = useState("validation");

  // Ao abrir, validar dados
  useEffect(() => {
    if (isOpen && guideData) {
      const validation = validateTISSDataCompleteness(guideData);
      if (!validation.valid) {
        setValidationErrors(validation.errors);
        setActiveTab("validation");
      } else {
        setValidationErrors([]);
        // Gerar XML preview
        try {
          const xml = generateTISSXML(guideData);
          setXmlContent(xml);
        } catch (error) {
          console.error("Erro ao gerar XML:", error);
        }
      }

      // Buscar histórico
      loadSubmissionHistory();
    }
  }, [isOpen, guideData]);

  const loadSubmissionHistory = async () => {
    try {
      const { status } = await getTISSSubmissionStatus(guideId, clinicId);
      setSubmissionStatus(status);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await submitGuideWithOperatorRouting(guideId, clinicId);

      if (result.success) {
        setActiveTab("confirmation");
        if (onSubmitSuccess) onSubmitSuccess();

        // Fechar após 3 segundos se sucesso
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setValidationErrors([result.message]);
        setActiveTab("validation");
      }
    } catch (error) {
      setValidationErrors([error.message]);
      setActiveTab("validation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadXML = () => {
    if (xmlContent) {
      downloadTISSXML(xmlContent, `TISS-${guideId}.xml`);
    }
  };

  const hasErrors = validationErrors.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {submissionStatus === "accepted" && (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
            {submissionStatus === "rejected" && (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            {submissionStatus === "pending" && (
              <Clock className="w-5 h-5 text-yellow-600" />
            )}
            {!submissionStatus && <Send className="w-5 h-5 text-blue-600" />}
            Enviar Guia TISS
          </DialogTitle>
          <DialogDescription>
            {guideData?.appointment?.guide_number && (
              <>Guia: {guideData.appointment.guide_number}</>
            )}
            {guideData?.payer?.name && (
              <> • Operadora: {guideData.payer.name}</>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* ======== TAB 1: VALIDAÇÃO ======== */}
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="validation">Validação</TabsTrigger>
            <TabsTrigger value="preview">XML</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
          </TabsList>

          {/* VALIDAÇÃO */}
          <TabsContent value="validation" className="space-y-4">
            {hasErrors ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">
                    ⚠️ Dados incompletos para TISS:
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    {validationErrors.map((error, i) => (
                      <li key={i} className="text-sm">
                        {error}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-green-600 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  ✅ Todos os dados obrigatórios estão preenchidos.
                  Guia pronta para envio.
                </AlertDescription>
              </Alert>
            )}

            {/* Dados Resumo */}
            {!hasErrors && guideData && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Paciente</p>
                  <p className="font-semibold">
                    {guideData.patient?.name}
                  </p>
                  <p className="text-xs text-gray-600">
                    CPF: {guideData.patient?.cpf}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Profissional</p>
                  <p className="font-semibold">
                    {guideData.professional?.name}
                  </p>
                  <p className="text-xs text-gray-600">
                    CBO: {guideData.professional?.cbo_code}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Serviço</p>
                  <p className="font-semibold">{guideData.service?.name}</p>
                  <p className="text-xs text-gray-600">
                    TUSS: {guideData.service?.tuss_code}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Operadora</p>
                  <p className="font-semibold">{guideData.payer?.name}</p>
                  <p className="text-xs text-gray-600">
                    ANS: {guideData.payer?.registration_ans}
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* PREVIEW XML */}
          <TabsContent value="preview" className="space-y-4">
            {xmlContent ? (
              <>
                <div className="bg-gray-50 p-4 rounded border border-gray-200 max-h-64 overflow-auto font-mono text-xs">
                  <pre className="whitespace-pre-wrap break-words">
                    {xmlContent.substring(0, 2000)}
                    {xmlContent.length > 2000 && (
                      <p className="text-gray-500 mt-2">
                        ... (+ {xmlContent.length - 2000} caracteres)
                      </p>
                    )}
                  </pre>
                </div>
                <div className="text-xs text-gray-600">
                  Tamanho: {(xmlContent.length / 1024).toFixed(2)} KB
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Gere o XML na aba de validação
              </div>
            )}
          </TabsContent>

          {/* HISTÓRICO */}
          <TabsContent value="history" className="space-y-4">
            <div className="text-sm text-gray-600">
              Últimas submissões desta guia:
            </div>
            {submissionHistory.length > 0 ? (
              <div className="space-y-2">
                {submissionHistory.map((item, i) => (
                  <div
                    key={i}
                    className="p-3 border rounded flex items-start gap-3"
                  >
                    {item.status === "accepted" && (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    )}
                    {item.status === "rejected" && (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    {(item.status === "pending" ||
                      item.status === "sent") && (
                      <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-sm">
                        {item.status.toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-600">
                        {new Date(item.created_at).toLocaleString("pt-BR")}
                      </p>
                      {item.error_message && (
                        <p className="text-xs text-red-600 mt-1">
                          ❌ {item.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Nenhuma submissão registrada
              </div>
            )}
          </TabsContent>

          {/* STATUS */}
          <TabsContent value="status" className="space-y-4">
            {submissionStatus ? (
              <>
                <div className="p-4 border rounded bg-blue-50">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">Status Atual:</span>{" "}
                    <span className="uppercase">{submissionStatus}</span>
                  </p>
                </div>

                {submissionStatus === "accepted" && (
                  <Alert className="border-green-600 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      ✅ Guia aceita pela operadora com sucesso!
                    </AlertDescription>
                  </Alert>
                )}

                {submissionStatus === "rejected" && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      ❌ Guia foi rejeitada pela operadora. Verifique os erros e
                      reenvie.
                    </AlertDescription>
                  </Alert>
                )}

                {submissionStatus === "pending" && (
                  <Alert className="border-yellow-600 bg-yellow-50">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      ⏳ Aguardando processamento pela operadora...
                    </AlertDescription>
                  </Alert>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Nenhuma submissão ainda
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* FOOTER */}
        <DialogFooter className="flex gap-2 justify-end">
          {xmlContent && !hasErrors && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadXML}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Baixar XML
            </Button>
          )}

          {submissionStatus === "rejected" && !hasErrors && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Retry
                handleSubmit();
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reenviar
            </Button>
          )}

          {!submissionStatus && !hasErrors && (
            <Button
              onClick={handleSubmit}
              disabled={submitting || hasErrors}
              className="flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar para Operadora
                </>
              )}
            </Button>
          )}

          {submissionStatus === "accepted" && (
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          )}

          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
