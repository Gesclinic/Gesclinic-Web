import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Edit, ImagePlus, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/useClinicContext';
import { getClinic } from '@/lib/clinicsApi';
import { uploadClinicLogo } from '@/lib/clinicBranding';
import { LAUDO_TYPE_OPTIONS, normalizeLetterhead } from '@/lib/patientLaudoTemplates';
import { createPatientLaudoTemplate, deletePatientLaudoTemplate, listPatientLaudoTemplates, updatePatientLaudoTemplate } from '@/lib/patientLaudoModelsApi';
import * as professionalsApi from '@/lib/professionalsApi';
import LaudoLetterhead from '@/components/laudos/LaudoLetterhead';

function buildDefaultForm({ clinicInfo, professionalInfo }) {
  return {
    id: null,
    name: '',
    laudo_type: 'avaliacao_clinica',
    title_template: 'Laudo de avaliação clínica',
    content_template: '1. Identificação e contexto clínico\n\n2. Principais achados\n\n3. Conclusão\n\n4. Conduta e orientações',
    is_default: false,
    letterhead: normalizeLetterhead({
      clinic_display_name: clinicInfo?.brand_name || clinicInfo?.name || '',
      clinic_logo_url: clinicInfo?.logo_url || '',
      clinic_address_line: clinicInfo?.address_line || '',
      clinic_contact_line: clinicInfo?.contact_line || '',
      professional_display_name: professionalInfo?.name || '',
      professional_title_line: [professionalInfo?.specialization, professionalInfo?.crm_line].filter(Boolean).join(' • '),
      professional_address_line: professionalInfo?.address_line || '',
      professional_contact_line: professionalInfo?.contact_line || '',
    }),
  };
}

export default function LaudoTemplatesManager() {
  const { user, clinicId } = useAuth();
  const { clinic } = useClinicContext();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [clinicDetails, setClinicDetails] = useState(null);
  const [professionalData, setProfessionalData] = useState(null);
  const [form, setForm] = useState(buildDefaultForm({ clinicInfo: null, professionalInfo: null }));

  const resolvedClinic = useMemo(() => ({
    ...clinicDetails,
    address_line: [clinicDetails?.address, clinicDetails?.city, clinicDetails?.state].filter(Boolean).join(' - '),
    contact_line: [clinicDetails?.phone, clinicDetails?.email, clinicDetails?.cnpj].filter(Boolean).join(' • '),
  }), [clinicDetails]);

  const resolvedProfessional = useMemo(() => ({
    ...(professionalsApi.normalizeProfessionalProfile(professionalData) || {}),
  }), [professionalData]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const emailToSearch = user?.email || (JSON.parse(localStorage.getItem('gesclinic_session') || '{}')).email;
        const [templateRows, clinicRow, professional] = await Promise.all([
          listPatientLaudoTemplates(clinic?.id || clinicId || null),
          clinic?.id || clinicId ? getClinic(clinic?.id || clinicId) : Promise.resolve(null),
          professionalsApi.getProfessionalByUserId(user?.id, emailToSearch),
        ]);
        setTemplates(templateRows || []);
        setClinicDetails(clinicRow || clinic || null);
        setProfessionalData(professional || null);
      } catch (error) {
        console.error('Erro ao carregar gerenciador de modelos:', error);
        toast({ title: 'Erro', description: 'Falha ao carregar os modelos de laudo.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [clinic?.id, clinicId, user?.id]);

  useEffect(() => {
    if (!form.id) {
      setForm((prev) => ({
        ...buildDefaultForm({ clinicInfo: resolvedClinic, professionalInfo: resolvedProfessional }),
        ...prev,
        letterhead: prev.letterhead?.clinic_display_name ? prev.letterhead : buildDefaultForm({ clinicInfo: resolvedClinic, professionalInfo: resolvedProfessional }).letterhead,
      }));
    }
  }, [resolvedClinic, resolvedProfessional]);

  const resetForm = () => setForm(buildDefaultForm({ clinicInfo: resolvedClinic, professionalInfo: resolvedProfessional }));

  const handleSelectTemplate = (template) => {
    setForm({
      id: template.id,
      name: template.name,
      laudo_type: template.laudo_type,
      title_template: template.title_template,
      content_template: template.content_template,
      is_default: Boolean(template.is_default),
      letterhead: normalizeLetterhead(template.letterhead || {}),
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      clinic_id: clinic?.id || clinicId || null,
      professional_user_id: user?.id || null,
      name: form.name,
      laudo_type: form.laudo_type,
      title_template: form.title_template,
      content_template: form.content_template,
      is_default: form.is_default,
      letterhead: form.letterhead,
    };

    try {
      await (form.id ? updatePatientLaudoTemplate(form.id, payload) : createPatientLaudoTemplate(payload));
      const refreshed = await listPatientLaudoTemplates(clinic?.id || clinicId || null);
      setTemplates(refreshed || []);
      toast({ title: form.id ? 'Modelo atualizado' : 'Modelo criado', description: 'O modelo de laudo foi salvo com sucesso.' });
      if (!form.id) resetForm();
    } catch (error) {
      console.error('Erro ao salvar modelo:', error);
      toast({ title: 'Erro', description: 'Falha ao salvar o modelo.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!form.id) return;
    try {
      await deletePatientLaudoTemplate(form.id);
      setTemplates((prev) => prev.filter((template) => template.id !== form.id));
      toast({ title: 'Modelo removido', description: 'O modelo foi excluído.' });
      resetForm();
    } catch (error) {
      console.error('Erro ao excluir modelo:', error);
      toast({ title: 'Erro', description: 'Falha ao excluir o modelo.', variant: 'destructive' });
    }
  };

  const handleUploadLogo = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !(clinic?.id || clinicId)) return;

    setUploadingLogo(true);
    try {
      const upload = await uploadClinicLogo(clinic?.id || clinicId, file);
      setForm((prev) => ({
        ...prev,
        letterhead: {
          ...prev.letterhead,
          clinic_logo_url: upload.publicUrl || upload.path,
        },
      }));
      toast({ title: 'Logo carregado', description: 'O logo foi vinculado ao timbrado deste modelo.' });
    } catch (error) {
      console.error('Erro ao carregar logo:', error);
      toast({ title: 'Erro', description: error.message || 'Falha ao carregar o logo.', variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Modelos de Laudo</h2>
              <p className="text-sm text-slate-500">Gerencie os modelos salvos da clínica.</p>
            </div>
            <Button variant="outline" onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Novo
            </Button>
          </div>

          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Carregando modelos...</div>
            ) : templates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                Nenhum modelo salvo ainda.
              </div>
            ) : templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleSelectTemplate(template)}
                className={`w-full rounded-2xl border p-4 text-left transition ${form.id === template.id ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{template.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{template.title_template}</p>
                  </div>
                  <Edit className="h-4 w-4 text-slate-400" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
                    {LAUDO_TYPE_OPTIONS.find((option) => option.value === template.laudo_type)?.label || template.laudo_type}
                  </Badge>
                  {template.is_default ? <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200">Padrão</Badge> : null}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{form.id ? 'Editar modelo' : 'Novo modelo'}</h3>
              <p className="text-sm text-slate-500">Defina conteúdo padrão, timbrado e logo institucional.</p>
            </div>
            {form.id ? (
              <Button variant="outline" className="text-rose-600" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            ) : null}
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Nome do modelo</Label>
                  <Input id="template-name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.laudo_type} onValueChange={(value) => setForm((prev) => ({ ...prev, laudo_type: value }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {LAUDO_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title-template">Título padrão</Label>
                <Input id="title-template" value={form.title_template} onChange={(e) => setForm((prev) => ({ ...prev, title_template: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content-template">Conteúdo padrão</Label>
                <Textarea id="content-template" rows={16} value={form.content_template} onChange={(e) => setForm((prev) => ({ ...prev, content_template: e.target.value }))} />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">Timbrado</p>
                    <p className="text-sm text-slate-500">Configure os dados institucionais exibidos no laudo.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} />
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo || !(clinic?.id || clinicId)}>
                      <ImagePlus className="mr-2 h-4 w-4" />
                      {uploadingLogo ? 'Enviando...' : 'Upload do logo'}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome exibido da clínica</Label>
                    <Input value={form.letterhead.clinic_display_name} onChange={(e) => setForm((prev) => ({ ...prev, letterhead: { ...prev.letterhead, clinic_display_name: e.target.value } }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contato da clínica</Label>
                    <Input value={form.letterhead.clinic_contact_line} onChange={(e) => setForm((prev) => ({ ...prev, letterhead: { ...prev.letterhead, clinic_contact_line: e.target.value } }))} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Endereço / timbrado da clínica</Label>
                  <Textarea rows={3} value={form.letterhead.clinic_address_line} onChange={(e) => setForm((prev) => ({ ...prev, letterhead: { ...prev.letterhead, clinic_address_line: e.target.value } }))} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome do médico</Label>
                    <Input value={form.letterhead.professional_display_name} onChange={(e) => setForm((prev) => ({ ...prev, letterhead: { ...prev.letterhead, professional_display_name: e.target.value } }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>CRM / especialidade</Label>
                    <Input value={form.letterhead.professional_title_line} onChange={(e) => setForm((prev) => ({ ...prev, letterhead: { ...prev.letterhead, professional_title_line: e.target.value } }))} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Endereço do médico</Label>
                  <Textarea rows={3} value={form.letterhead.professional_address_line} onChange={(e) => setForm((prev) => ({ ...prev, letterhead: { ...prev.letterhead, professional_address_line: e.target.value } }))} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Contato do médico</Label>
                    <Input value={form.letterhead.professional_contact_line} onChange={(e) => setForm((prev) => ({ ...prev, letterhead: { ...prev.letterhead, professional_contact_line: e.target.value } }))} />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Modelo padrão</p>
                      <p className="text-xs text-slate-500">Marque para destacar este modelo como preferencial.</p>
                    </div>
                    <Switch checked={form.is_default} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_default: checked }))} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Pré-visualização do timbrado</p>
                <p className="text-sm text-slate-500">O logo e as linhas abaixo serão exibidos no laudo, no preview e na impressão.</p>
              </div>
              <LaudoLetterhead letterhead={form.letterhead} />
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-base font-semibold text-slate-900">{form.title_template || 'Título do laudo'}</p>
                <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{form.content_template || 'Conteúdo do modelo.'}</div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="outline" onClick={resetForm}>Limpar</Button>
            <Button type="button" onClick={handleSave} disabled={saving || !form.name.trim() || !form.title_template.trim()}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Salvando...' : form.id ? 'Salvar alterações' : 'Criar modelo'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}