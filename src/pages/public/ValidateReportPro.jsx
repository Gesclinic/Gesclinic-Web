import React, { useEffect, useState } from "react";
    import { useSearchParams, Link } from "react-router-dom";
    import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
    import { Loader2, CheckCircle, XCircle, ShieldCheck, AlertTriangle, QrCode, FileWarning } from "lucide-react";
    import CertificateGenerator from "@/components/reports/CertificateGenerator";

    export default function ValidateReportPro() {
      const [params] = useSearchParams();
      const [status, setStatus] = useState("loading");
      const [info, setInfo] = useState(null);
      const [validationType, setValidationType] = useState(null);

      const file = params.get("file");
      const hashFromQR = params.get("hash");
      const certCode = params.get("cert");

      useEffect(() => {
        if (file && hashFromQR) {
          setValidationType("report");
          validateFile();
        } else if (certCode) {
          setValidationType("cert");
          validateCert();
        } else {
          setStatus("invalid_params");
        }
      }, [file, hashFromQR, certCode]);

      const validateFile = async () => {
        setStatus("loading");
        try {
          const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate_report?file=${file}`
          );
          
          const data = await res.json();

          if (res.ok && data && data.file_hash) {
            const match = data.file_hash === hashFromQR;
            if (match) {
              setInfo(data);
              setStatus("valid");
            } else {
              setInfo(data);
              setStatus("tampered");
            }
          } else {
            setInfo(data || {});
            setStatus("invalid");
          }
        } catch (err) {
          console.error(err);
          setStatus("error");
        }
      };

      const validateCert = async () => {
        setStatus("loading");
        try {
          const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/certifications_api?code=${certCode}`);
          const data = await res.json();
          if (res.ok && data.valid) {
            setInfo(data);
            setStatus("valid");
          } else {
            setInfo(data);
            setStatus(data.is_revoked ? "revoked" : "invalid");
          }
        } catch (err) {
          console.error(err);
          setStatus("error");
        }
      };

      const formattedDate = (d) =>
        d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "medium" }) : "-";

      const renderContent = () => {
        switch (status) {
          case "loading":
            return (
              <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground p-8">
                <Loader2 className="animate-spin w-8 h-8" />
                <span className="text-lg">Verificando autenticidade...</span>
              </div>
            );
          case "valid":
            return (
              <div className="space-y-4 p-4">
                <CheckCircle className="mx-auto w-16 h-16 text-green-500" />
                <p className="text-2xl font-bold text-green-700">
                  Documento Autêntico
                </p>
                <p className="text-muted-foreground">Este documento foi verificado e sua integridade foi confirmada.</p>
                <div className="text-left bg-green-50/50 border border-green-200 rounded-lg p-4 space-y-2 text-sm text-gray-700">
                  <p><strong>Documento:</strong> {info.document_name || info.report_name}</p>
                  {info.cert_code && <p><strong>Certificado:</strong> {info.cert_code}</p>}
                  <p><strong>Clínica:</strong> {info.clinic_name || 'N/A'}</p>
                  <p><strong>Emitido em:</strong> {formattedDate(info.issued_at || info.created_at)}</p>
                  <p className="break-all"><strong>Assinatura SHA-256:</strong> <span className="font-mono text-xs">{info.file_hash}</span></p>
                </div>
                <div className="text-xs text-gray-500 pt-2">
                  Esta assinatura digital garante que o documento não foi alterado desde sua emissão.
                </div>
                {validationType === 'report' && <CertificateGenerator validationData={info} />}
              </div>
            );
          case "tampered":
            return (
              <div className="space-y-4 p-4">
                <AlertTriangle className="mx-auto w-16 h-16 text-yellow-500" />
                <p className="text-2xl font-bold text-yellow-700">
                  Documento Possivelmente Alterado
                </p>
                <p className="text-muted-foreground">O conteúdo deste documento não corresponde à sua assinatura digital original.</p>
                <div className="text-left bg-yellow-50/50 border border-yellow-200 rounded-lg p-4 space-y-2 text-sm text-gray-700">
                    <p><strong>Relatório:</strong> {info?.report_name || file}</p>
                    <p className="break-all"><strong>Assinatura Digital (Original):</strong> <span className="font-mono text-xs">{info?.file_hash || "Não encontrada"}</span></p>
                    <p className="break-all"><strong>Assinatura Apresentada (QR Code):</strong> <span className="font-mono text-xs">{hashFromQR}</span></p>
                </div>
              </div>
            );
          case "revoked":
            return (
              <div className="space-y-4 p-4">
                <FileWarning className="mx-auto w-16 h-16 text-orange-500" />
                <p className="text-2xl font-bold text-orange-700">
                  Certificado Revogado
                </p>
                <p className="text-muted-foreground">Este certificado não é mais válido.</p>
                 <div className="text-left bg-orange-50/50 border border-orange-200 rounded-lg p-4 space-y-2 text-sm text-gray-700">
                  <p><strong>Documento:</strong> {info.document_name}</p>
                  <p><strong>Certificado:</strong> {info.cert_code}</p>
                </div>
              </div>
            );
          case "invalid_params":
               return (
                 <div className="space-y-4 p-4">
                   <XCircle className="mx-auto w-16 h-16 text-red-500" />
                   <p className="text-2xl font-bold text-red-700">
                     Link de Validação Inválido
                   </p>
                   <p className="text-muted-foreground">Os parâmetros necessários para a validação não foram encontrados na URL.</p>
                 </div>
               );
          default:
            return (
              <div className="space-y-4 p-4">
                <XCircle className="mx-auto w-16 h-16 text-red-500" />
                <p className="text-2xl font-bold text-red-700">
                  Documento Inválido ou Não Encontrado
                </p>
                <p className="text-muted-foreground">Nenhum registro de assinatura digital foi localizado para o item <strong>{file || certCode}</strong>.</p>
              </div>
            );
        }
      };
      
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="text-center mb-6">
                <Link to="/" className="inline-flex items-center gap-2">
                    <img src="/logo.svg" alt="Gesclinic Logo" className="h-8" />
                    <span className="text-2xl font-bold text-gray-700">Gesclinic</span>
                </Link>
            </div>

          <Card className="w-full max-w-2xl shadow-lg border-gray-200/80 bg-white/90 backdrop-blur-sm">
            <CardHeader className="text-center bg-gray-50/50 rounded-t-lg border-b p-5">
              <ShieldCheck className="mx-auto w-10 h-10 text-blue-600" />
              <CardTitle className="mt-2 text-xl font-bold text-gray-800">
                Certificado Digital de Autenticidade
              </CardTitle>
              <p className="text-sm text-gray-500">Módulo de Faturamento TISS</p>
            </CardHeader>
            <CardContent className="p-6">
              {renderContent()}
            </CardContent>
          </Card>
          
          <div className="mt-8 text-center text-xs text-gray-500">
            <p>© {new Date().getFullYear()} Gesclinic • Todos os direitos reservados.</p>
            <p>Documento autenticado digitalmente em conformidade com a legislação vigente.</p>
          </div>
        </div>
      );
    }