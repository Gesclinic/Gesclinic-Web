import React, { useState, useEffect, useCallback } from 'react';
import LaudoSignaturePad from '@/components/laudos/LaudoSignaturePad';
import LaudoSignatureBlock from '@/components/laudos/LaudoSignatureBlock';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import {
  Save,
  CreditCard,
  FileText,
  User,
  Printer,
  History,
  Loader2,
  ClipboardList,
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient.js';
import { useToast } from '@/components/ui/use-toast';
import { formatPhone } from '@/utils/formatters/formatPhone';

export default function DrawerAtendimento({ open, onClose, appointment, onSave }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('atendimento');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [docText, setDocText] = useState('');
  const [docTemplate, setDocTemplate] = useState('');
  const [historicoDocs, setHistoricoDocs] = useState([]);
  // Estado para assinatura híbrida da receita
  const [rxSignature, setRxSignature] = useState({});
  const [rxSignatureError, setRxSignatureError] = useState('');
  const [historicoAtendimentos, setHistoricoAtendimentos] = useState([]);
  const [resumoPaciente, setResumoPaciente] = useState(null);

  const defaultTemplates = {
    receita: `
      <h2 style="text-align:center;">RECEITA MÉDICA</h2>
      <p><strong>Paciente:</strong> {{paciente}}</p>
      <p><strong>Prescrição:</strong></p>
      <div style="min-height:200px;border-bottom:1px solid #ccc;"></div>
      <br/><div style="text-align:center;">
      <p>__________________________________</p></div>`,
    receita: `
        <div class='receita-bloco-unico'>
          <div class='receita-cabecalho-linha'>
            <span class='logo-clinica'>Gesclinic</span>
            <span class='nome-clinica'>Gesclinic Demo</span>
            <span class='receita-titulo'>RECEITA</span>
            <span class='receita-subtitulo'>Documento para Assinatura Manual</span>
            <span class='receita-data'>Emitido em ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString().slice(0, 8)}</span>
          </div>
          <hr class='receita-divider'/>
          <div style="min-height:200px;border-bottom:1px solid #ccc;"></div>
          <br/><div style="text-align:center;">
          <p>__________________________________</p></div>`,
    laudo: `
      <h2 style="text-align:center;">LAUDO MÉDICO</h2>
      <p><strong>Paciente:</strong> {{paciente}}</p>
      <p><strong>Descrição:</strong></p>
      <div style="min-height:200px;border-bottom:1px solid #ccc;"></div>
      <br/><div style="text-align:center;">
      <p>__________________________________</p><p>Assinatura e carimbo</p></div>`,
    atestado: `
      <h2 style="text-align:center;">ATESTADO MÉDICO</h2>
      <p>Atesto, para os devidos fins, que o(a) Sr(a). <strong>{{paciente}}</strong> esteve sob meus cuidados nesta data.</p>
      <p>Recomendo afastamento de ____ dias, a contar de hoje.</p>
      <br/><div style="text-align:center;">
      <p>__________________________________</p><p>Assinatura e carimbo</p></div>`,
  };

  const loadHistoricoAtendimentos = useCallback(async (patientId) => {
    if (!patientId) {
      return;
    }
    const { data: rows } = await supabase
      .from('appointments')
      .select('id, start_time, status, service:services(name), professional:professionals(name)')
      .eq('patient_id', patientId)
      .order('start_time', { ascending: false })
      .limit(10);
    setHistoricoAtendimentos(rows || []);
  }, []);

  const loadHistoricoDocs = useCallback(async (patientId) => {
    if (!patientId) {
      return;
    }
    const { data: docs } = await supabase
      .from('patient_documents')
      .select('id, created_at, type, content')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    setHistoricoDocs(docs || []);
  }, []);

  const loadResumoPaciente = useCallback(async (patientId) => {
    if (!patientId) {
      return;
    }
    const { data } = await supabase.rpc('get_patient_clinical_summary', {
      p_patient_id: patientId,
    });
    setResumoPaciente(data?.[0] || null);
  }, []);

  useEffect(() => {
    if (open) {
      const current = appointment || {};
      setData(current);
      if (current.patient_id) {
        loadHistoricoDocs(current.patient_id);
        loadHistoricoAtendimentos(current.patient_id);
        loadResumoPaciente(current.patient_id);
      } else {
        setHistoricoDocs([]);
        setHistoricoAtendimentos([]);
        setResumoPaciente(null);
      }
      setDocText('');
      setDocTemplate('');
      setActiveTab('atendimento');
    }
  }, [open, appointment, loadHistoricoDocs, loadHistoricoAtendimentos, loadResumoPaciente]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        id: data.id || null,
        clinic_id: data.clinic_id,
        professional_id: data.professional_id,
        patient_id: data.patient_id,
        service_id: data.service_id,
        start_time: data.start_time,
        end_time: data.end_time,
        status: data.status || 'scheduled',
        price: data.price,
        notes: data.notes,
        phone: data.phone || '',
      };

      const { error } = await supabase.rpc('create_or_update_appointment', { p_data: payload });

      if (error) {
        throw error;
      }
      toast({ title: '✅ Sucesso', description: 'Atendimento salvo com sucesso.' });
      if (onSave) {
        onSave();
      }
      onClose();
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFaturamento = async () => {
    toast({
      title: '🚧 Em breve',
      description: 'A integração com o faturamento TISS será adicionada.',
    });
  };

  const saveDocumentoPaciente = async () => {
    if (!data.patient_id) {
      toast({
        title: 'Atenção',
        description: 'Selecione um paciente antes de salvar.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    // Inclui assinatura híbrida apenas para receita
    const metadata = {};
    if (docTemplate === 'receita' && rxSignature && rxSignature.certificate_id) {
      metadata.signature = rxSignature;
    }
    const { error } = await supabase.from('patient_documents').insert([
      {
        patient_id: data.patient_id,
        appointment_id: data.id,
        type: docTemplate || 'personalizado',
        content: docText,
        metadata,
      },
    ]);
    setLoading(false);
    if (!error) {
      toast({
        title: 'Documento salvo!',
        description: 'Adicionado ao histórico do paciente.',
      });
      loadHistoricoDocs(data.patient_id);
    } else {
      toast({
        title: 'Erro ao salvar documento',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handlePrint = () => {
    let finalHtml = (docText || '').replace(
      /{{paciente}}/g,
      data.patient_name || 'Paciente não informado',
    );
    // Remove qualquer linha ou bloco (com ou sem tags) que contenha 'ASSINATURA' e 'CARIMBO DO PROFISSIONAL' (com ou sem acento, variações, espaços, tags)
    finalHtml = finalHtml.replace(
      /<[^>]*>?\s*ASSINATURA[^<\n]*CARIMBO DO PROFISSIONAL[^<\n]*<\/?[^>]*>/gim,
      '',
    );
    finalHtml = finalHtml.replace(
      /<[^>]*>?\s*ASSINATURA[^<\n]*PROFISSIONAL[^<\n]*<\/?[^>]*>/gim,
      '',
    );
    finalHtml = finalHtml.replace(/^.*ASSINATURA.*CARIMBO DO PROFISSIONAL.*$/gim, '');
    finalHtml = finalHtml.replace(/^.*ASSINATURA.*PROFISSIONAL.*$/gim, '');
    let assinaturaHtml = '';
    if (docTemplate === 'receita' && rxSignature && rxSignature.certificate_id) {
      assinaturaHtml = "<div class='assinatura-bloco'>";
      if (rxSignature.visual_signature_data_url) {
        assinaturaHtml += `<div style='margin-bottom:8px;'><img src='${rxSignature.visual_signature_data_url}' alt='Assinatura' style='height:60px;max-width:100%;object-fit:contain;'/></div>`;
      }
      assinaturaHtml += '</div>';
    }
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>${docTemplate.toUpperCase()} - Gesclinic</title>
            <style>
              html, body {
                font-family:Arial,sans-serif;
                margin:0;
                color:#222;
                background:#fafbfc;
                height:auto !important;
                background:#fff !important;
                width:100vw;
                max-width:100vw;
                overflow-x:hidden;
              }
              .receita-bloco-unico {
                max-width:700px;
                margin:2px auto 0 auto;
                background:#fff;
                border-radius:6px;
                box-shadow:0 1px 2px #0001;
                padding:6px 4px 4px 4px;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                page-break-before: avoid !important;
                page-break-after: avoid !important;
              }
              .receita-titulo {
                text-align:center;
                font-size:1.05rem;
                font-weight:bold;
                letter-spacing:0.5px;
                margin-bottom:2px;
              }
              .receita-subtitulo {
                text-align:center;
                font-size:0.85rem;
                color:#444;
                margin-bottom:4px;
              }
                .receita-cabecalho-linha {
                  display: flex;
                  flex-direction: row;
                  align-items: center;
                  justify-content: center;
                  gap: 18px;
                  margin-bottom: 8px;
                  font-size: 1.01rem;
                  flex-wrap: wrap;
                }
                .logo-clinica {
                  font-weight: bold;
                  font-size: 1.08rem;
                  color: #222;
                  letter-spacing: 0.5px;
                }
                .nome-clinica {
                  font-size: 0.98rem;
                  color: #444;
                  font-style: italic;
                  margin-right: 8px;
                }
                .receita-titulo {
                  font-size: 1.12rem;
                  font-weight: bold;
                  color: #222;
                  letter-spacing: 1px;
                  margin-right: 8px;
                }
                .receita-subtitulo {
                  font-size: 0.95rem;
                  color: #444;
                  margin-right: 8px;
                }
                .receita-data {
                  font-size: 0.92rem;
                  color: #888;
                  font-style: italic;
                }
              .receita-section {
                margin-bottom:4px;
              }
              .receita-label {
                font-weight:bold;
                color:#222;
              }
              .receita-divider {
                border:0; border-top:1px solid #e0e0e0; margin:4px 0 4px 0;
              }
              .medicamentos-bloco {
                background:#f6f8fa;
                border:1px solid #e0e0e0;
                border-radius:3px;
                padding:3px 4px;
                margin-bottom:3px;
                font-size:0.90rem;
              }
              .assinatura-bloco {
                margin-top:3px;
                padding:2px 0 0 0;
                border-top:1px dashed #bbb;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                page-break-before: avoid !important;
                page-break-after: avoid !important;
              }
              .assinatura-bloco img { display:block; margin:0 auto; }
              .rodape-info {
                margin-top:2px;
                font-size:8px;
                color:#666;
                text-align:center;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                page-break-before: avoid !important;
                page-break-after: avoid !important;
              }
              @media print {
                html, body {
                  height:auto !important;
                  background:#fff !important;
                  width:100vw;
                  max-width:100vw;
                  overflow-x:hidden;
                  margin:0 !important;
                  padding:0 !important;
                }
                .receita-bloco-unico, .assinatura-bloco, .rodape-info, .assinatura-bloco * {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  page-break-before: avoid !important;
                  page-break-after: avoid !important;
                  margin:0 !important;
                  padding:0 !important;
                }
                * {
                  box-sizing: border-box !important;
                }
              }
            </style>
      </head><body>
        <div class='receita-bloco-unico'>
          <div class='receita-titulo'>RECEITA</div>
          <div class='receita-subtitulo'>Documento para Assinatura Manual<br/>Emitido em ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString().slice(0, 5)}</div>
          <hr class='receita-divider'/>
          <div>${finalHtml}</div>
          ${assinaturaHtml}
                <div class='assinatura-bloco' style='margin-top:24px;text-align:center;'>
                  <div style='margin-bottom:18px;'>&nbsp;</div>
                  <div style='font-weight:bold;font-size:1.05rem;'>${data?.professional_name || 'Profissional Responsável'}</div>
                  <div style='font-size:0.98rem;color:#444;'>CRM: ${data?.professional_crm || '____'} / UF: ${data?.professional_uf || '___'}</div>
                </div>
          <div class='rodape-info'>
            <div>• Esta receita é válida por 30 dias a contar da data de emissão<br/>
            • Conforme RDC nº 20/2011 (Regulação de Prescrição Digital)<br/>
            • Lei nº 14.307/2022 (Autorização de Prescrição Digital)<br/>
            • Lei nº 9.787/99 (Substituição de Medicamentos Genéricos)<br/>
            O paciente pode apresentar em qualquer farmácia brasileira<br/>
            Assinada digitalmente com certificado ICP-Brasil</div>
            <div style='margin-top:4px;'>Documento gerado por Gesclinic - ${new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <Drawer open={open} onOpenChange={onClose} direction="right">
      <DrawerContent className="w-[90vw] max-w-[720px] p-4 bg-white shadow-xl rounded-l-2xl flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-semibold text-blue-800">
            {data.id ? 'Editar Atendimento' : 'Novo Atendimento'}
          </h2>
          {data.patient_id && (
            <Button
              size="sm"
              variant="link"
              className="flex items-center gap-1 text-blue-600 h-auto p-0"
              onClick={() => setActiveTab('historico_clinico')}
            >
              <ClipboardList size={16} /> Ver histórico clínico
            </Button>
          )}
        </div>

        <div className="flex-grow overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-4 bg-gray-100 rounded-lg">
              <TabsTrigger value="atendimento">
                <User size={16} className="mr-1" /> Atendimento
              </TabsTrigger>
              <TabsTrigger value="financeiro">
                <CreditCard size={16} className="mr-1" /> Financeiro
              </TabsTrigger>
              <TabsTrigger value="documentos">
                <FileText size={16} className="mr-1" /> Documentos
              </TabsTrigger>
              <TabsTrigger value="historico">
                <History size={16} className="mr-1" /> Docs
              </TabsTrigger>
              <TabsTrigger value="historico_clinico">
                <ClipboardList size={16} className="mr-1" /> Histórico
              </TabsTrigger>
            </TabsList>

            {/* Atendimento */}
            <TabsContent value="atendimento">
              <div className="space-y-4 p-1">
                <Input
                  name="patient_name"
                  placeholder="Nome do paciente"
                  value={data.patient_name || ''}
                  onChange={handleInputChange}
                  className="font-semibold"
                />
                <Input
                  name="phone"
                  placeholder="(XX) 9 XXXX-XXXX"
                  value={data.phone || ''}
                  onChange={(e) =>
                    handleInputChange({
                      ...e,
                      target: { ...e.target, value: formatPhone(e.target.value) },
                    })
                  }
                />
                <Input
                  name="service_name"
                  placeholder="Serviço"
                  value={data.service_name || ''}
                  onChange={handleInputChange}
                />
                <Select
                  name="status"
                  value={data.status || 'agendado'}
                  onValueChange={(v) => setData({ ...data, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Agendado</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="in_office">Em Atendimento</SelectItem>
                    <SelectItem value="attended">Concluído</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                    <SelectItem value="no_show">Não Compareceu</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  name="notes"
                  placeholder="Observações do agendamento..."
                  value={data.notes || ''}
                  onChange={handleInputChange}
                />
              </div>
            </TabsContent>

            {/* Financeiro */}
            <TabsContent value="financeiro">
              <div className="space-y-4 p-1">
                <p className="text-sm text-gray-500">
                  Registrar pagamento ou gerar guia de convênio.
                </p>
                <Input
                  type="number"
                  placeholder="Valor"
                  value={data.price || ''}
                  onChange={(e) => setData({ ...data, price: parseFloat(e.target.value) || 0 })}
                />
                <Select
                  onValueChange={(v) => setData({ ...data, payment_method: v })}
                  value={data.payment_method}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleFaturamento} className="w-full bg-blue-600 text-white">
                  ⚙️ Gerar Faturamento TISS
                </Button>
              </div>
            </TabsContent>

            {/* Documentos */}
            <TabsContent value="documentos">
              <div className="space-y-3 p-1">
                <Select
                  value={docTemplate}
                  onValueChange={(v) => {
                    setDocTemplate(v);
                    setDocText(defaultTemplates[v] || '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar modelo de documento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita Médica</SelectItem>
                    <SelectItem value="laudo">Laudo Médico</SelectItem>
                    <SelectItem value="atestado">Atestado Médico</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  rows={12}
                  value={docText}
                  onChange={(e) => setDocText(e.target.value)}
                  className="border border-gray-300 rounded-md font-mono text-sm"
                  placeholder="Digite o conteúdo do documento ou selecione um modelo."
                />
                {/* Assinatura híbrida da receita */}
                {docTemplate === 'receita' && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mt-4">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Assinatura híbrida da receita
                    </h3>
                    <div className="mt-4">
                      <LaudoSignaturePad
                        signature={rxSignature}
                        onChange={setRxSignature}
                        disabled={loading}
                      />
                      {rxSignatureError && (
                        <p className="mt-2 text-sm text-red-600 font-semibold">
                          {rxSignatureError}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (docTemplate === 'receita') {
                        if (!rxSignature?.certificate_id || !rxSignature.certificate_id.trim()) {
                          setRxSignatureError(
                            'O certificado digital é obrigatório para assinar a receita.',
                          );
                          return;
                        }
                        setRxSignatureError('');
                      }
                      saveDocumentoPaciente();
                    }}
                    disabled={loading || !docText}
                  >
                    Salvar no Histórico
                  </Button>
                  <Button variant="default" onClick={handlePrint} disabled={!docText}>
                    <Printer size={16} className="mr-2" /> Imprimir
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Histórico Docs */}
            <TabsContent value="historico">
              <div className="space-y-2 p-1">
                <h3 className="font-semibold text-gray-700">Histórico de Documentos</h3>
                {historicoDocs.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Nenhum documento registrado.
                  </p>
                )}
                {historicoDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="border border-gray-200 rounded-md p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setDocTemplate(doc.type);
                      setDocText(doc.content);
                      setActiveTab('documentos');
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium capitalize">
                        {doc.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Histórico Clínico */}
            <TabsContent value="historico_clinico">
              <div className="space-y-4 p-1">
                {resumoPaciente && (
                  <div className="mb-4 border-b pb-4 text-sm text-gray-700 space-y-1">
                    <h3 className="font-semibold text-gray-800 mb-2">Resumo do Paciente</h3>
                    <p>
                      <strong>Último atendimento:</strong>{' '}
                      {resumoPaciente.last_date
                        ? new Date(resumoPaciente.last_date).toLocaleDateString('pt-BR')
                        : '—'}
                    </p>
                    <p>
                      <strong>Total de atendimentos:</strong> {resumoPaciente.total_appointments}
                    </p>
                    <p>
                      <strong>Particulares:</strong> {resumoPaciente.total_private}
                    </p>
                    <p>
                      <strong>Convênios:</strong> {resumoPaciente.total_insurance}
                    </p>
                  </div>
                )}

                <h3 className="font-semibold text-gray-700">Últimos Atendimentos</h3>
                {historicoAtendimentos.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">
                    Nenhum atendimento registrado.
                  </p>
                )}
                {historicoAtendimentos.map((a) => (
                  <div
                    key={a.id}
                    className="border border-gray-200 p-3 rounded-md hover:bg-gray-50 text-sm"
                  >
                    <div className="flex justify-between">
                      <span>
                        {new Date(a.start_time).toLocaleDateString('pt-BR')} —{' '}
                        <strong>{a.service?.name || 'Atendimento'}</strong>
                      </span>
                      <span className="text-gray-500 capitalize">{a.status}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Prof: {a.professional?.name || 'Não informado'}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex-shrink-0 pt-4 mt-auto border-t">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save size={16} className="mr-2" />
              )}
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
