import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  FileText,
  Eye,
  Edit,
  Trash2,
  Globe,
  Calendar,
  Clock,
  RefreshCw,
  Printer,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/useClinicContext';
import LaudoDialog from '@/components/clinica/LaudoDialog';
import * as professionalsApi from '@/lib/professionalsApi';
import { getClinic } from '@/lib/clinicsApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  createPatientLaudo,
  deletePatientLaudo,
  listPatientLaudos,
  syncLocalPatientLaudos,
  updatePatientLaudo,
} from '@/lib/patientLaudosApi';
import {
  buildLetterheadText,
  getLaudoTypeLabel,
  summarizeLaudoContent,
} from '@/lib/patientLaudoTemplates';
import { printLaudoDocument } from '@/lib/laudoPrint';
import LaudoLetterhead from '@/components/laudos/LaudoLetterhead';
import LaudoSignatureBlock from '@/components/laudos/LaudoSignatureBlock';
import {
  createPatientLaudoTemplate,
  listPatientLaudoTemplates,
  updatePatientLaudoTemplate,
} from '@/lib/patientLaudoModelsApi';

const STATUS_CONFIG = {
  rascunho: { label: 'Rascunho', className: 'bg-amber-100 text-amber-800 border border-amber-200' },
  assinado: {
    label: 'Assinado',
    className: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  },
  publicado: { label: 'Publicado', className: 'bg-sky-100 text-sky-800 border border-sky-200' },
  cancelado: { label: 'Cancelado', className: 'bg-rose-100 text-rose-800 border border-rose-200' },
};

function normalizeLaudoRow(row) {
  return {
    ...row,
    title: row?.title ?? row?.titulo ?? '',
    content: row?.content ?? row?.corpo ?? '',
    exam_date: row?.exam_date ?? row?.data_exame ?? null,
    laudo_type: row?.laudo_type ?? row?.metadata?.template_type ?? 'personalizado',
    _storage_mode: row?._storage_mode || 'supabase',
  };
}

function buildClinicInfo(clinicRow) {
  if (!clinicRow) {
    return null;
  }

  return {
    ...clinicRow,
    address_line: [clinicRow?.address, clinicRow?.city, clinicRow?.state]
      .filter(Boolean)
      .join(' - '),
    contact_line: [clinicRow?.phone, clinicRow?.email, clinicRow?.cnpj].filter(Boolean).join(' • '),
  };
}

export default function LaudosTab({ patientId, patientData, updatePatientData }) {
  const { user, clinicId } = useAuth();
  const { clinic } = useClinicContext();
  const { toast } = useToast();
  const [laudos, setLaudos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedLaudo, setSelectedLaudo] = useState(null);
  const [editingLaudo, setEditingLaudo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [syncingLocal, setSyncingLocal] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [professionalData, setProfessionalData] = useState(null);
  const [clinicDetails, setClinicDetails] = useState(null);

  const resolvedClinicInfo = buildClinicInfo(clinicDetails);
  const resolvedProfessionalInfo = professionalsApi.normalizeProfessionalProfile(professionalData);

  const localLaudosCount = laudos.filter((item) => item._storage_mode === 'local').length;

  const getProfessionalName = () => {
    try {
      const savedSession = localStorage.getItem('gesclinic_session');
      if (savedSession) {
        const sessionData = JSON.parse(savedSession);
        if (sessionData.username) {
          return sessionData.username;
        }
      }
    } catch {
      // noop
    }

    return user?.user_metadata?.full_name || user?.username || user?.email || 'Profissional';
  };

  async function loadLaudos() {
    setLoading(true);
    try {
      const rows = await listPatientLaudos(patientId, clinic?.id || clinicId || null);
      setLaudos((rows || []).map(normalizeLaudoRow));
    } catch (error) {
      console.error('Erro ao carregar laudos:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar os laudos do paciente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadTemplates() {
    try {
      const rows = await listPatientLaudoTemplates(clinic?.id || clinicId || null);
      setTemplates(rows || []);
    } catch (error) {
      console.error('Erro ao carregar modelos de laudo:', error);
    }
  }

  async function loadContextData() {
    try {
      const emailToSearch =
        user?.email || JSON.parse(localStorage.getItem('gesclinic_session') || '{}').email;
      const [professional, clinicRow] = await Promise.all([
        professionalsApi.getProfessionalByUserId(user?.id, emailToSearch),
        clinic?.id || clinicId ? getClinic(clinic?.id || clinicId) : Promise.resolve(null),
      ]);

      setProfessionalData(professional || null);
      setClinicDetails(clinicRow || clinic || null);
    } catch (error) {
      console.error('Erro ao carregar contexto do laudo:', error);
      setClinicDetails(clinic || null);
    }
  }

  useEffect(() => {
    loadLaudos();
    loadTemplates();
    loadContextData();
  }, [patientId, clinic?.id, clinicId]);

  const handleSubmitLaudo = async (payload) => {
    setSaving(true);

    const laudoPayload = {
      clinic_id: clinic?.id || clinicId || patientData?.clinic_id || null,
      patient_id: patientId,
      professional_user_id: user?.id || null,
      professional_name: resolvedProfessionalInfo?.name || getProfessionalName(),
      title: payload.title,
      content: payload.content,
      summary: summarizeLaudoContent(payload.content),
      laudo_type: payload.laudo_type,
      exam_date: payload.exam_date || null,
      status: payload.status,
      portal_visible: Boolean(payload.portal_visible),
      portal_published_at: payload.portal_published_at || null,
      signed_at: payload.signed_at || null,
      metadata: {
        ...(payload.metadata || {}),
        patient_name: patientData?.name || null,
        clinic_name: clinic?.name || null,
        letterhead_text: buildLetterheadText(payload.metadata?.letterhead || {}),
      },
    };

    try {
      if (editingLaudo?.id) {
        const updatedRow = normalizeLaudoRow(
          await updatePatientLaudo(editingLaudo.id, laudoPayload),
        );
        setLaudos((prev) => prev.map((item) => (item.id === editingLaudo.id ? updatedRow : item)));
        setEditingLaudo(null);
        setShowEditor(false);
        toast({
          title: 'Laudo atualizado',
          description:
            updatedRow._storage_mode === 'local'
              ? 'Alteracoes salvas localmente ate a migration do Supabase ser aplicada.'
              : 'As alteracoes do laudo foram salvas no Supabase.',
        });
        return;
      }

      const newRow = normalizeLaudoRow(await createPatientLaudo(laudoPayload));
      setLaudos((prev) => [newRow, ...prev]);
      setShowEditor(false);
      toast({
        title: 'Laudo criado',
        description:
          newRow._storage_mode === 'local'
            ? 'Laudo salvo localmente ate a migration do Supabase ser aplicada.'
            : 'O laudo foi salvo nesta ficha do paciente.',
      });
    } catch (error) {
      console.error('Erro ao salvar laudo:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao salvar o laudo do paciente.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async (payload) => {
    setSavingTemplate(true);
    const templatePayload = {
      clinic_id: clinic?.id || clinicId || patientData?.clinic_id || null,
      professional_user_id: user?.id || null,
      name: payload.name,
      laudo_type: payload.laudo_type,
      is_default: Boolean(payload.is_default),
      title_template: payload.title_template,
      content_template: payload.content_template,
      letterhead: payload.letterhead,
      metadata: payload.metadata || {},
    };

    try {
      const savedTemplate = payload.id
        ? await updatePatientLaudoTemplate(payload.id, templatePayload)
        : await createPatientLaudoTemplate(templatePayload);

      await loadTemplates();

      toast({
        title: payload.id ? 'Modelo atualizado' : 'Modelo salvo',
        description:
          savedTemplate?._storage_mode === 'local'
            ? 'Modelo salvo localmente ate a migration do Supabase ser aplicada.'
            : 'O modelo de laudo foi salvo com sucesso.',
      });

      return savedTemplate;
    } catch (error) {
      console.error('Erro ao salvar modelo de laudo:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao salvar o modelo de laudo.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteLaudo = async (id) => {
    try {
      await deletePatientLaudo(id);
      setLaudos((prev) => prev.filter((item) => item.id !== id));
      toast({ title: 'Laudo removido', description: 'O laudo foi excluido da lista do paciente.' });
    } catch (error) {
      console.error('Erro ao remover laudo:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao remover o laudo.',
        variant: 'destructive',
      });
    }
  };

  const handleTogglePortal = async (id) => {
    const currentRow = laudos.find((item) => item.id === id);

    if (!currentRow) {
      return;
    }

    if (!['assinado', 'publicado'].includes(currentRow.status)) {
      toast({
        title: 'Assinatura pendente',
        description: 'O laudo precisa estar assinado antes de ser publicado no portal.',
        variant: 'destructive',
      });
      return;
    }

    const nextPortalState = !currentRow.portal_visible;

    try {
      const updatedRow = normalizeLaudoRow(
        await updatePatientLaudo(id, {
          portal_visible: nextPortalState,
          status: nextPortalState ? 'publicado' : 'assinado',
          portal_published_at: nextPortalState
            ? currentRow.portal_published_at || new Date().toISOString()
            : null,
          signed_at: currentRow.signed_at || new Date().toISOString(),
        }),
      );

      setLaudos((prev) => prev.map((item) => (item.id === id ? updatedRow : item)));

      toast({
        title: updatedRow.portal_visible ? 'Portal habilitado' : 'Portal desabilitado',
        description: updatedRow.portal_visible
          ? 'O laudo foi marcado para exibicao no portal do paciente.'
          : 'O laudo deixou de ficar disponivel no portal.',
      });
    } catch (error) {
      console.error('Erro ao atualizar publicacao do laudo:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar a publicacao do laudo.',
        variant: 'destructive',
      });
    }
  };

  const handleSyncLocalLaudos = async () => {
    setSyncingLocal(true);

    try {
      const result = await syncLocalPatientLaudos(patientId, clinic?.id || clinicId || null);
      await loadLaudos();

      if (result.blockedByPolicy) {
        toast({
          title: 'Sincronizacao bloqueada',
          description:
            'O Supabase ainda esta rejeitando gravacoes. Aplique a migration e tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      if (result.syncedRows.length > 0) {
        toast({
          title: 'Laudos sincronizados',
          description: `${result.syncedRows.length} laudo(s) foram enviados ao Supabase.`,
        });
        return;
      }

      toast({
        title: 'Nada para sincronizar',
        description: 'Nao ha laudos locais pendentes neste paciente.',
      });
    } catch (error) {
      console.error('Erro ao sincronizar laudos locais:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao sincronizar laudos locais com o Supabase.',
        variant: 'destructive',
      });
    } finally {
      setSyncingLocal(false);
    }
  };

  const handlePrintLaudo = (laudo) => {
    try {
      printLaudoDocument({
        laudo,
        patientName: patientData?.name || laudo?.metadata?.patient_name || 'Paciente',
      });
    } catch (error) {
      console.error('Erro ao imprimir laudo:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao abrir a impressão do laudo.',
        variant: 'destructive',
      });
    }
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Laudos</h3>
          <p className="mt-1 text-sm text-gray-500">
            Laudos clinicos formais com fluxo de rascunho, assinatura, publicacao e acesso futuro no
            portal do paciente.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {localLaudosCount > 0 ? (
            <Button variant="outline" onClick={handleSyncLocalLaudos} disabled={syncingLocal}>
              <RefreshCw size={16} className={`mr-2 ${syncingLocal ? 'animate-spin' : ''}`} />
              Sincronizar locais
            </Button>
          ) : null}
          <Button
            className="bg-sky-600 hover:bg-sky-700 text-white"
            onClick={() => {
              setEditingLaudo(null);
              setShowEditor(true);
            }}
          >
            <Plus size={16} className="mr-2" />
            Novo Laudo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-sky-500 bg-sky-50">
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Total de laudos
            </p>
            <p className="mt-2 text-3xl font-bold text-sky-900">{laudos.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-emerald-500 bg-emerald-50">
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Publicados
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-900">
              {laudos.filter((item) => item.status === 'publicado').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-violet-500 bg-violet-50">
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Pendentes de sincronizacao
            </p>
            <p className="mt-2 text-3xl font-bold text-violet-900">{localLaudosCount}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-10 pb-10 text-center text-gray-500">
            Carregando laudos...
          </CardContent>
        </Card>
      ) : laudos.length === 0 ? (
        <Card className="border-l-4 border-sky-500 bg-sky-50">
          <CardContent className="pt-12 pb-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-sky-300" />
            <p className="font-medium text-gray-700">Nenhum laudo cadastrado</p>
            <p className="mt-2 text-sm text-gray-500">
              Crie laudos formais para deixar separado do historico clinico e preparar a futura
              entrega no portal.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {laudos.map((laudo) => (
            <Card key={laudo.id} className="border-l-4 border-sky-500 shadow-sm">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-semibold text-gray-900">{laudo.title}</h4>
                      <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
                        {getLaudoTypeLabel(laudo.laudo_type)}
                      </Badge>
                      <Badge
                        className={
                          STATUS_CONFIG[laudo.status]?.className || 'bg-slate-100 text-slate-800'
                        }
                      >
                        {STATUS_CONFIG[laudo.status]?.label || laudo.status}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          laudo._storage_mode === 'local'
                            ? 'border-amber-300 bg-amber-50 text-amber-800'
                            : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        }
                      >
                        {laudo._storage_mode === 'local' ? 'Local' : 'Supabase'}
                      </Badge>
                      {laudo.portal_visible ? (
                        <Badge
                          variant="outline"
                          className="border-violet-200 bg-violet-50 text-violet-800"
                        >
                          Portal habilitado
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} /> {new Date(laudo.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} />{' '}
                        {laudo.exam_date
                          ? new Date(laudo.exam_date).toLocaleDateString('pt-BR')
                          : 'Sem data de exame'}
                      </span>
                      <span>{laudo.professional_name || 'Profissional nao informado'}</span>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm text-gray-700">
                      {laudo.summary ||
                        summarizeLaudoContent(laudo.content) ||
                        'Sem conteudo informado.'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() => {
                        setSelectedLaudo(laudo);
                        setShowPreview(true);
                      }}
                    >
                      <Eye size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() => handlePrintLaudo(laudo)}
                    >
                      <Printer size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() => {
                        setEditingLaudo(laudo);
                        setShowEditor(true);
                      }}
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() => handleTogglePortal(laudo.id)}
                    >
                      <Globe size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 text-rose-600"
                      onClick={() => handleDeleteLaudo(laudo.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <LaudoDialog
        open={showEditor}
        onOpenChange={(open) => {
          setShowEditor(open);
          if (!open) {
            setEditingLaudo(null);
          }
        }}
        onSubmit={handleSubmitLaudo}
        templates={templates}
        onSaveTemplate={handleSaveTemplate}
        initialData={editingLaudo}
        loading={saving}
        savingTemplate={savingTemplate}
        patientName={patientData?.name || ''}
        clinicInfo={resolvedClinicInfo}
        professionalInfo={resolvedProfessionalInfo}
      />

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="app-dialog-shell app-dialog-shell--content overflow-hidden p-0">
          <DialogHeader className="border-b border-slate-200 px-6 pb-4 pt-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <DialogTitle>{selectedLaudo?.title || 'Laudo'}</DialogTitle>
              </div>
              {selectedLaudo?.portal_visible ? (
                <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-800">
                  Marcado para portal
                </Badge>
              ) : null}
            </div>
          </DialogHeader>
          {selectedLaudo ? (
            <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)]">
              <aside className="border-b border-slate-200 bg-slate-50 px-6 py-6 xl:border-b-0 xl:border-r">
                <div className="space-y-4 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
                      {getLaudoTypeLabel(selectedLaudo.laudo_type)}
                    </Badge>
                    <Badge
                      className={
                        STATUS_CONFIG[selectedLaudo.status]?.className ||
                        'bg-slate-100 text-slate-800'
                      }
                    >
                      {STATUS_CONFIG[selectedLaudo.status]?.label || selectedLaudo.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        selectedLaudo._storage_mode === 'local'
                          ? 'border-amber-300 bg-amber-50 text-amber-800'
                          : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      }
                    >
                      {selectedLaudo._storage_mode === 'local' ? 'Local' : 'Supabase'}
                    </Badge>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="font-semibold text-gray-700">Paciente</p>
                    <p className="mt-1 text-gray-900">{patientData?.name || 'Paciente'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="font-semibold text-gray-700">Profissional</p>
                    <p className="mt-1 text-gray-900">
                      {selectedLaudo.professional_name || 'Nao informado'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="font-semibold text-gray-700">Data do exame</p>
                    <p className="mt-1 text-gray-900">
                      {selectedLaudo.exam_date
                        ? new Date(selectedLaudo.exam_date).toLocaleDateString('pt-BR')
                        : 'Nao informada'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="font-semibold text-gray-700">Criado em</p>
                    <p className="mt-1 text-gray-900">
                      {new Date(selectedLaudo.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </aside>
              <div className="min-h-0 overflow-y-auto px-6 py-6">
                {selectedLaudo?.metadata?.letterhead ? (
                  <div className="mb-4">
                    <LaudoLetterhead
                      letterhead={selectedLaudo.metadata.letterhead}
                      section="clinic"
                    />
                  </div>
                ) : null}
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-700">Conteúdo</p>
                  <Button variant="outline" onClick={() => handlePrintLaudo(selectedLaudo)}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir / PDF
                  </Button>
                </div>
                <div className="min-h-[55vh] rounded-2xl border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-800 whitespace-pre-wrap shadow-sm">
                  {selectedLaudo.content || 'Sem conteudo informado.'}
                </div>
                {selectedLaudo?.metadata?.letterhead ? (
                  <div className="mt-4">
                    <LaudoLetterhead
                      letterhead={selectedLaudo.metadata.letterhead}
                      section="professional"
                      compact
                    />
                  </div>
                ) : null}
                {selectedLaudo?.metadata?.signature ? (
                  <div className="mt-4">
                    <LaudoSignatureBlock signature={selectedLaudo.metadata.signature} compact />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
