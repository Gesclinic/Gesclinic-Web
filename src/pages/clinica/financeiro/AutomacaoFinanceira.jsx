import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Zap, FileText, QrCode } from 'lucide-react';
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/SupabaseAuthContext";

export default function AutomacaoFinanceira() {
  const [nfeResponse, setNfeResponse] = useState(null);
  const [paymentResponse, setPaymentResponse] = useState(null);
  const [loading, setLoading] = useState({ nfe: false, payment: false });
  const { clinic } = useAuth();

  async function emitirNFe() {
    setLoading(prev => ({ ...prev, nfe: true }));
    setNfeResponse(null);

    const body = {
      clinic_id: clinic?.id || "00000000-0000-0000-0000-000000000000",
      paciente_id: "00000000-0000-0000-0000-000000000000", // UUID de paciente para teste
      valor_total: 250.00,
      descricao: "Consulta Neurológica",
    };

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nfe-emit`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const res = await response.json();
      if (res.erro) throw new Error(res.erro);
      
      setNfeResponse(res);
      toast({
        title: "Sucesso!",
        description: `Nota fiscal ${res.nfResponse.numero} emitida com sucesso.`,
        className: "bg-green-100 text-green-800"
      });

    } catch (error) {
      console.error("Erro ao emitir NF-e:", error);
      toast({
        title: "Erro ao emitir NF-e",
        description: error.message || "Verifique se a função Edge foi criada no Supabase",
        variant: "destructive"
      });
    } finally {
      setLoading(prev => ({ ...prev, nfe: false }));
    }
  }
  
  async function gerarCobranca(tipo) {
    setLoading(prev => ({ ...prev, payment: true }));
    setPaymentResponse(null);

    const body = {
      nome: "Paciente Teste",
      cpf: "123.456.789-00",
      valor: 150.00,
      vencimento: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 dias a partir de hoje
      tipo: tipo
    };

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-gateway`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const res = await response.json();
      if (res.error) throw new Error(res.error);

      setPaymentResponse(res);
      toast({
        title: `Cobrança ${tipo.toUpperCase()} Gerada!`,
        description: `Status: ${res.status}`,
      });

    } catch (error) {
      console.error("Erro ao gerar cobrança:", error);
      toast({
        title: "Erro ao gerar cobrança",
        description: error.message || "Verifique se a função Edge foi criada no Supabase",
        variant: "destructive"
      });
    } finally {
      setLoading(prev => ({ ...prev, payment: false }));
    }
  }


  return (
    <>
    <Helmet>
        <title>Automação Financeira - Gesclinic</title>
        <meta name="description" content="Automatize a emissão de notas fiscais, PIX e boletos." />
    </Helmet>
    <div className="p-4 md:p-6 space-y-8 w-full mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800">💰 Automação Financeira</h1>
        <p className="text-gray-600 mt-2">Emita notas fiscais, gere cobranças PIX e boletos com um clique.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="text-blue-600" />Emissão de NF-e</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">Simule a emissão de uma Nota Fiscal de Serviço eletrônica para um atendimento.</p>
            <Button onClick={emitirNFe} disabled={loading.nfe} className="w-full bg-blue-600 hover:bg-blue-700">
              {loading.nfe ? <Loader2 className="animate-spin mr-2"/> : <Zap className="mr-2"/>}
              {loading.nfe ? 'Emitindo...' : 'Emitir Nota Fiscal (Teste)'}
            </Button>
            {nfeResponse && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm">
                <p><strong>Status:</strong> {nfeResponse.sucesso ? "Emitida com sucesso!" : "Erro"}</p>
                <p><strong>Chave:</strong> {nfeResponse?.nfResponse?.chave_nfe}</p>
                {nfeResponse?.nfResponse?.danfe && (
                  <p><a href={nfeResponse.nfResponse.danfe} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">Ver DANFE (PDF Simulado)</a></p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><QrCode className="text-green-600" />Geração de Cobranças</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">Simule a geração de um QR Code PIX ou um boleto bancário para um paciente.</p>
            <div className="flex gap-4">
              <Button onClick={() => gerarCobranca('pix')} disabled={loading.payment} className="w-full bg-green-600 hover:bg-green-700">
                {loading.payment ? <Loader2 className="animate-spin mr-2"/> : null} Gerar PIX
              </Button>
              <Button onClick={() => gerarCobranca('boleto')} disabled={loading.payment} className="w-full" variant="outline">
                {loading.payment ? <Loader2 className="animate-spin mr-2"/> : null} Gerar Boleto
              </Button>
            </div>
             {paymentResponse && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200 text-sm">
                <p><strong>Tipo:</strong> {paymentResponse.billingType}</p>
                <p><strong>Status:</strong> {paymentResponse.status}</p>
                <p><strong>Valor:</strong> R$ {paymentResponse.value.toFixed(2)}</p>
                {paymentResponse.billingType === 'PIX' && paymentResponse.pixQrCode && (
                  <div className="mt-2">
                    <strong>Payload PIX:</strong>
                    <textarea readOnly className="w-full h-20 text-xs bg-gray-100 p-2 rounded mt-1" value={paymentResponse.pixQrCode.payload} />
                  </div>
                )}
                {paymentResponse.billingType === 'BOLETO' && (
                  <p><a href={paymentResponse.bankSlipUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">Ver Boleto (PDF Simulado)</a></p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}

