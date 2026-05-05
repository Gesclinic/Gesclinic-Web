import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  applyTemplateWithLetterhead,
  buildLaudoTemplate,
  getLaudoTypeConfig,
  LAUDO_STATUS_OPTIONS,
  LAUDO_TYPE_OPTIONS,
  normalizeLetterhead,
} from '@/lib/patientLaudoTemplates';
import LaudoLetterhead from '@/components/laudos/LaudoLetterhead';
import LaudoSignaturePad from '@/components/laudos/LaudoSignaturePad';
import LaudoSignatureBlock from '@/components/laudos/LaudoSignatureBlock';
import {
  buildLaudoSignaturePayload,
  generateLaudoSignatureHash,
  normalizeLaudoSignature,
} from '@/lib/laudoSignature';

function normalizeTemplateSections(sections, fallbackSections = []) {
  const source = Array.isArray(sections) && sections.length > 0 ? sections : fallbackSections;
  return source.map((section) => String(section || '').trim()).filter(Boolean);
}

function buildStructuredContent(sections, patientName = '') {
  const normalizedSections = normalizeTemplateSections(sections);
  const patientLine = patientName ? `Paciente: ${patientName}` : '';
  return [patientLine, ...normalizedSections].filter(Boolean).join('\n\n').trim();
}

export default function LaudoDialog({
  open,
  onOpenChange,
  onSubmit,
  templates = [],
  onSaveTemplate,
  initialData = null,
  loading = false,
  savingTemplate = false,
  patientName = '',
  clinicInfo = null,
  professionalInfo = null,
}) {
  const [signatureError, setSignatureError] = useState('');
  const isEdit = Boolean(initialData?.id);
  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');
  const [laudoType, setLaudoType] = useState('avaliacao_clinica');
  const [status, setStatus] = useState('rascunho');
  const [dataExame, setDataExame] = useState('');
  const [portalVisible, setPortalVisible] = useState(false);
  const [templateMetadata, setTemplateMetadata] = useState({});
  const [templateName, setTemplateName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('builtin');
  const [letterhead, setLetterhead] = useState(() => normalizeLetterhead());
  const [templateSearch, setTemplateSearch] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [templateSections, setTemplateSections] = useState([]);
  const [signature, setSignature] = useState(() =>
    normalizeLaudoSignature({}, professionalInfo?.name || ''),
  );

  const defaultLetterhead = useMemo(
    () =>
      normalizeLetterhead({
        clinic_display_name: clinicInfo?.brand_name || clinicInfo?.name || '',
        clinic_logo_url: clinicInfo?.logo_url || '',
        clinic_address_line: clinicInfo?.address_line || '',
        clinic_contact_line: clinicInfo?.contact_line || '',
        professional_display_name: professionalInfo?.name || '',
        professional_title_line: [professionalInfo?.specialization, professionalInfo?.crm_line]
          .filter(Boolean)
          .join(' • '),
        professional_address_line: professionalInfo?.address_line || '',
        professional_contact_line: professionalInfo?.contact_line || '',
      }),
    [clinicInfo, professionalInfo],
  );

  useEffect(() => {
    if (open) {
      if (initialData?.id) {
        setTitulo(initialData?.title ?? initialData?.titulo ?? '');
        setCorpo(initialData?.content ?? initialData?.corpo ?? '');
        setLaudoType(
          initialData?.laudo_type ?? initialData?.metadata?.template_type ?? 'personalizado',
        );
        setStatus(initialData?.status ?? 'rascunho');
        setDataExame(
          (initialData?.exam_date ?? initialData?.data_exame ?? '')?.split('T')[0] ?? '',
        );
        setPortalVisible(
          Boolean(initialData?.portal_visible || initialData?.status === 'publicado'),
        );
        setTemplateMetadata(initialData?.metadata || {});
        setTemplateName(initialData?.metadata?.template_name || '');
        setSelectedTemplateId(initialData?.metadata?.template_id || 'builtin');
        setTemplateSearch('');
        setSaveAsDefault(false);
        setTemplateSections(
          normalizeTemplateSections(
            initialData?.metadata?.template_sections,
            getLaudoTypeConfig(
              initialData?.laudo_type ?? initialData?.metadata?.template_type ?? 'personalizado',
            ).sections,
          ),
        );
        setSignature(
          normalizeLaudoSignature(
            initialData?.metadata?.signature || {},
            initialData?.professional_name || professionalInfo?.name || '',
          ),
        );
        setLetterhead(normalizeLetterhead(initialData?.metadata?.letterhead || defaultLetterhead));
        return;
      }

      const starterTemplate = buildLaudoTemplate('avaliacao_clinica', patientName);
      setTitulo(starterTemplate.title);
      setCorpo(starterTemplate.content);
      setLaudoType('avaliacao_clinica');
      setStatus(initialData?.status ?? 'rascunho');
      setDataExame('');
      setPortalVisible(false);
      setTemplateMetadata(starterTemplate.metadata);
      setTemplateName('Avaliação clínica padrão');
      setSelectedTemplateId('builtin');
      setTemplateSearch('');
      setSaveAsDefault(false);
      setTemplateSections(
        normalizeTemplateSections(
          starterTemplate.metadata?.template_sections,
          getLaudoTypeConfig('avaliacao_clinica').sections,
        ),
      );
      setSignature(
        normalizeLaudoSignature(
          {},
          professionalInfo?.name || defaultLetterhead.professional_display_name || '',
        ),
      );
      setLetterhead(defaultLetterhead);
    }
  }, [open, initialData, patientName, defaultLetterhead, professionalInfo?.name]);

  const canPublishToPortal = status === 'assinado' || status === 'publicado';
  const selectedTypeConfig = getLaudoTypeConfig(laudoType);
  const filteredTemplates = useMemo(() => {
    const sameType = templates.filter((item) => item.laudo_type === laudoType);
    return sameType.length > 0 ? sameType : templates;
  }, [templates, laudoType]);
  const searchableTemplates = useMemo(() => {
    const normalizedSearch = templateSearch.trim().toLowerCase();
    const sortedTemplates = [...filteredTemplates].sort((left, right) => {
      if (Boolean(left.is_default) !== Boolean(right.is_default)) {
        return left.is_default ? -1 : 1;
      }
      return (
        new Date(right.updated_at || right.created_at || 0) -
        new Date(left.updated_at || left.created_at || 0)
      );
    });

    if (!normalizedSearch) {
      return sortedTemplates;
    }

    return sortedTemplates.filter((template) => {
      const haystack = [template.name, template.title_template, template.laudo_type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [filteredTemplates, templateSearch]);
  const highlightedTemplates = searchableTemplates.slice(0, 4);
  const mostRecentTemplateId = searchableTemplates[0]?.id || null;

  const handleTemplateSelectionChange = useCallback(
    (value) => {
      setSelectedTemplateId(value);
      const selectedTemplate = templates.find((item) => item.id === value);
      setTemplateName(selectedTemplate?.name || '');
      setSaveAsDefault(Boolean(selectedTemplate?.is_default));
    },
    [templates],
  );

  const handleApplyTemplate = useCallback(() => {
    const selectedTemplate = templates.find((item) => item.id === selectedTemplateId);
    const builtInTemplate = buildLaudoTemplate(laudoType, patientName);
    const resolved = applyTemplateWithLetterhead({
      template: selectedTemplate || {
        title_template: builtInTemplate.title,
        content_template: builtInTemplate.content,
        letterhead,
      },
      patientName,
      letterhead,
    });

    setTitulo(resolved.title);
    setCorpo(resolved.content);
    setLetterhead(resolved.letterhead);
    setTemplateSections(
      normalizeTemplateSections(
        selectedTemplate?.metadata?.template_sections,
        builtInTemplate.metadata?.template_sections || getLaudoTypeConfig(laudoType).sections,
      ),
    );
    setTemplateMetadata((prev) => ({
      ...prev,
      ...(selectedTemplate?.metadata || builtInTemplate.metadata),
    }));
  }, [templates, selectedTemplateId, laudoType, patientName, letterhead]);

  const handleUseSavedTemplate = useCallback(
    (template) => {
      setSelectedTemplateId(template.id);
      setTemplateName(template.name || '');
      setSaveAsDefault(Boolean(template.is_default));

      const resolved = applyTemplateWithLetterhead({
        template,
        patientName,
        letterhead: normalizeLetterhead(template.letterhead || letterhead),
      });

      setTitulo(resolved.title);
      setCorpo(resolved.content);
      setLetterhead(resolved.letterhead);
      setTemplateSections(
        normalizeTemplateSections(
          template.metadata?.template_sections,
          getLaudoTypeConfig(template.laudo_type || laudoType).sections,
        ),
      );
      setTemplateMetadata((prev) => ({
        ...prev,
        ...(template.metadata || {}),
        template_type: template.laudo_type || laudoType,
      }));
    },
    [patientName, letterhead, laudoType],
  );

  const handleLetterheadFieldChange = useCallback((field, value) => {
    setLetterhead((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleTemplateSectionChange = useCallback((index, value) => {
    setTemplateSections((prev) =>
      prev.map((section, sectionIndex) => (sectionIndex === index ? value : section)),
    );
  }, []);

  const handleAddTemplateSection = useCallback(() => {
    setTemplateSections((prev) => [...prev, `${prev.length + 1}. Novo tópico`]);
  }, []);

  const handleRemoveTemplateSection = useCallback((index) => {
    setTemplateSections((prev) => prev.filter((_, sectionIndex) => sectionIndex !== index));
  }, []);

  const handleApplySectionsToContent = useCallback(() => {
    const nextSections = normalizeTemplateSections(
      templateSections,
      getLaudoTypeConfig(laudoType).sections,
    );
    setTemplateSections(nextSections);
    setCorpo(buildStructuredContent(nextSections, patientName));
    setTemplateMetadata((prev) => ({
      ...prev,
      template_type: laudoType,
      template_sections: nextSections,
    }));
  }, [templateSections, laudoType, patientName]);

  const handleSaveTemplateClick = useCallback(
    async (mode = 'update') => {
      const shouldCreateNew = mode === 'new' || selectedTemplateId === 'builtin';
      const normalizedSections = normalizeTemplateSections(
        templateSections,
        getLaudoTypeConfig(laudoType).sections,
      );
      const payload = {
        id: shouldCreateNew ? undefined : selectedTemplateId,
        name: templateName?.trim() || `${titulo?.trim() || 'Modelo'} padrão`,
        laudo_type: laudoType,
        is_default: saveAsDefault,
        title_template: titulo?.trim() || 'Laudo clínico',
        content_template: corpo?.trim() || '',
        letterhead,
        metadata: {
          ...templateMetadata,
          template_type: laudoType,
          template_sections: normalizedSections,
        },
      };

      const savedTemplate = await onSaveTemplate?.(payload);
      if (savedTemplate?.id) {
        setSelectedTemplateId(savedTemplate.id);
        setTemplateName(savedTemplate.name || payload.name);
        setSaveAsDefault(Boolean(savedTemplate.is_default ?? payload.is_default));
        setTemplateMetadata((prev) => ({
          ...prev,
          ...(savedTemplate.metadata || payload.metadata),
        }));
      }
    },
    [
      selectedTemplateId,
      templateName,
      titulo,
      laudoType,
      corpo,
      letterhead,
      templateMetadata,
      onSaveTemplate,
      saveAsDefault,
      templateSections,
    ],
  );

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault?.();
      // Validação obrigatória do certificado digital
      if (!signature?.certificate_id || !signature.certificate_id.trim()) {
        setSignatureError('O certificado digital é obrigatório para assinar o laudo.');
        return;
      }
      setSignatureError('');
      const publishInPortal = portalVisible && canPublishToPortal;
      const normalizedStatus = publishInPortal
        ? 'publicado'
        : status === 'publicado'
          ? 'assinado'
          : status;
      const normalizedSignature = normalizeLaudoSignature(
        signature,
        letterhead.professional_display_name || professionalInfo?.name || '',
      );
      const shouldPersistSignature = Boolean(
        normalizedSignature.visual_signature_data_url ||
        normalizedSignature.certificate_id ||
        ['assinado', 'publicado'].includes(normalizedStatus),
      );

      let resolvedSignature = normalizedSignature;
      if (shouldPersistSignature) {
        const signaturePayload = buildLaudoSignaturePayload({
          title: titulo?.trim(),
          content: corpo?.trim(),
          laudoType,
          patientName,
          examDate: dataExame || null,
          professionalName:
            normalizedSignature.signed_by_name ||
            letterhead.professional_display_name ||
            professionalInfo?.name ||
            '',
          letterhead,
        });

        resolvedSignature = {
          ...normalizedSignature,
          signature_hash: await generateLaudoSignatureHash(signaturePayload),
          signed_at: ['assinado', 'publicado'].includes(normalizedStatus)
            ? initialData?.metadata?.signature?.signed_at ||
              initialData?.signed_at ||
              new Date().toISOString()
            : normalizedSignature.signed_at || null,
        };
      }

      const payload = {
        title: titulo?.trim(),
        content: corpo?.trim(),
        laudo_type: laudoType,
        status: normalizedStatus,
        exam_date: dataExame || null,
        portal_visible: publishInPortal,
        portal_published_at: publishInPortal
          ? initialData?.portal_published_at || new Date().toISOString()
          : null,
        signed_at:
          normalizedStatus === 'assinado' || normalizedStatus === 'publicado'
            ? initialData?.signed_at || new Date().toISOString()
            : null,
        metadata: {
          ...(initialData?.metadata || {}),
          ...templateMetadata,
          template_type: laudoType,
          template_sections: normalizeTemplateSections(
            templateSections,
            getLaudoTypeConfig(laudoType).sections,
          ),
          patient_name: patientName || null,
          template_id: selectedTemplateId !== 'builtin' ? selectedTemplateId : null,
          template_name: templateName?.trim() || null,
          letterhead,
          signature: shouldPersistSignature ? resolvedSignature : null,
        },
      };
      await onSubmit?.(payload);
    },
    [
      titulo,
      corpo,
      laudoType,
      status,
      dataExame,
      portalVisible,
      canPublishToPortal,
      initialData,
      templateMetadata,
      patientName,
      onSubmit,
      templateSections,
      selectedTemplateId,
      templateName,
      letterhead,
      signature,
      professionalInfo?.name,
    ],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog-shell app-dialog-shell--content overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-200 px-6 pb-4 pt-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-xl font-semibold text-slate-900">
                {isEdit ? 'Editar Laudo' : 'Novo Laudo'}
              </DialogTitle>
              <DialogDescription>
                Estruture o laudo clínico com mais conforto. Você pode manter em rascunho e publicar
                depois no fluxo do paciente.
              </DialogDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {patientName ? (
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                  Paciente: {patientName}
                </span>
              ) : null}
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                {isEdit ? 'Modo edição' : 'Novo documento'}
              </span>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1.7fr)_400px]">
            <div className="min-h-0 overflow-y-auto px-6 py-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Estrutura recomendada
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      {selectedTypeConfig.description ||
                        'Registre achados, conclusão e orientações de forma clara para a equipe e para a futura liberação ao paciente.'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Status atual
                    </p>
                    <p className="mt-2 text-sm font-medium text-emerald-900">
                      {status === 'publicado'
                        ? 'Documento publicado no portal'
                        : status === 'assinado'
                          ? 'Documento assinado'
                          : status === 'cancelado'
                            ? 'Documento cancelado'
                            : 'Documento em rascunho'}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="space-y-2">
                    <Label htmlFor="titulo">Título do laudo</Label>
                    <Input
                      id="titulo"
                      placeholder="Ex.: Laudo de avaliação clínica"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      required
                      className="bg-white"
                    />
                    <p className="text-xs text-slate-500">
                      Use um título objetivo para localizar e publicar este laudo no portal depois.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4">
                    <LaudoLetterhead letterhead={letterhead} compact section="clinic" />
                  </div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <Label htmlFor="corpo">Conteúdo do laudo</Label>
                      <p className="mt-1 text-xs text-slate-500">
                        Escreva o laudo completo, com linguagem apropriada para entrega ao paciente
                        e consulta futura.
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">{corpo.length} caracteres</span>
                  </div>
                  <Textarea
                    id="corpo"
                    placeholder="Digite o conteúdo do laudo..."
                    value={corpo}
                    onChange={(e) => setCorpo(e.target.value)}
                    rows={20}
                    className="min-h-[58vh] resize-none bg-white"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Estrutura do modelo</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Edite os tópicos do modelo e aplique a estrutura no conteúdo quando quiser.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={handleAddTemplateSection}>
                        Adicionar tópico
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleApplySectionsToContent}
                      >
                        Aplicar estrutura
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {templateSections.map((section, index) => (
                      <div
                        key={`${index}-${section}`}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex items-start gap-2">
                          <Input
                            value={section}
                            onChange={(e) => handleTemplateSectionChange(index, e.target.value)}
                            className="bg-white"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            className="px-3 text-rose-600"
                            onClick={() => handleRemoveTemplateSection(index)}
                            disabled={templateSections.length <= 1}
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Assinatura do laudo</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Salve a assinatura visual e o hash do documento para auditoria.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <LaudoSignatureBlock signature={signature} compact />
                  </div>
                </div>
              </div>
            </div>

            <aside className="min-h-0 overflow-y-auto border-t border-slate-200 bg-slate-50 px-6 py-6 xl:border-l xl:border-t-0">
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Configuração</h3>
                  <div className="mt-4 space-y-4">
                    {highlightedTemplates.length > 0 ? (
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Modelos rápidos
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Clique para carregar um modelo salvo do mesmo tipo.
                          </p>
                        </div>
                        <div className="grid gap-2">
                          {highlightedTemplates.map((template) => {
                            const isActive = selectedTemplateId === template.id;
                            return (
                              <button
                                key={template.id}
                                type="button"
                                onClick={() => handleUseSavedTemplate(template)}
                                className={`rounded-xl border px-3 py-3 text-left transition ${isActive ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium text-slate-900 line-clamp-1">
                                    {template.name}
                                  </p>
                                  <div className="flex items-center gap-1">
                                    {template.id === mostRecentTemplateId ? (
                                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                        Recente
                                      </span>
                                    ) : null}
                                    {template.is_default ? (
                                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                                        Padrão
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                                  {template.title_template || 'Modelo de laudo salvo'}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <Label>Modelo salvo</Label>
                      <Input
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        placeholder="Buscar modelo por nome"
                        className="bg-white"
                      />
                      <Select
                        value={selectedTemplateId}
                        onValueChange={handleTemplateSelectionChange}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="builtin">Modelo padrão do tipo</SelectItem>
                          {searchableTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={handleApplyTemplate}
                          disabled={selectedTemplateId === 'builtin' && !laudoType}
                        >
                          Aplicar modelo
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-3 text-slate-600"
                          onClick={() => handleTemplateSelectionChange('builtin')}
                        >
                          Limpar
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="template_name">Nome do modelo</Label>
                      <Input
                        id="template_name"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Ex.: Laudo padrão cardiologia"
                        className="bg-white"
                      />
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            Marcar como modelo padrão
                          </p>
                          <p className="text-xs text-slate-500">
                            Deixa este modelo em destaque para futuras seleções.
                          </p>
                        </div>
                        <Switch checked={saveAsDefault} onCheckedChange={setSaveAsDefault} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo de laudo</Label>
                      <Select value={laudoType} onValueChange={setLaudoType}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {LAUDO_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {LAUDO_STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="data_exame">Data do exame</Label>
                      <Input
                        id="data_exame"
                        type="date"
                        value={dataExame || ''}
                        onChange={(e) => setDataExame(e.target.value || '')}
                        className="bg-white"
                      />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Liberar no portal</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Disponivel quando o laudo estiver assinado ou publicado.
                          </p>
                        </div>
                        <Switch
                          checked={portalVisible && canPublishToPortal}
                          disabled={!canPublishToPortal && !portalVisible}
                          onCheckedChange={(checked) => setPortalVisible(checked)}
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-slate-900">Salvar modelo</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Salve este conteúdo para reutilizar depois e já deixe o modelo selecionado.
                      </p>
                      <div className="mt-3 flex flex-col gap-2">
                        {selectedTemplateId !== 'builtin' ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleSaveTemplateClick('update')}
                            disabled={savingTemplate || !titulo.trim()}
                          >
                            {savingTemplate ? 'Salvando...' : 'Atualizar modelo selecionado'}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          onClick={() => handleSaveTemplateClick('new')}
                          disabled={savingTemplate || !titulo.trim()}
                        >
                          {savingTemplate ? 'Salvando...' : 'Salvar como novo modelo'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Timbrado e identificação</h3>
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="clinic_display_name">Nome exibido da clínica</Label>
                      <Input
                        id="clinic_display_name"
                        value={letterhead.clinic_display_name}
                        onChange={(e) =>
                          handleLetterheadFieldChange('clinic_display_name', e.target.value)
                        }
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clinic_address_line">Endereço / timbrado da clínica</Label>
                      <Textarea
                        id="clinic_address_line"
                        value={letterhead.clinic_address_line}
                        onChange={(e) =>
                          handleLetterheadFieldChange('clinic_address_line', e.target.value)
                        }
                        rows={3}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clinic_contact_line">Contato da clínica</Label>
                      <Input
                        id="clinic_contact_line"
                        value={letterhead.clinic_contact_line}
                        onChange={(e) =>
                          handleLetterheadFieldChange('clinic_contact_line', e.target.value)
                        }
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="professional_display_name">Nome do médico</Label>
                      <Input
                        id="professional_display_name"
                        value={letterhead.professional_display_name}
                        onChange={(e) =>
                          handleLetterheadFieldChange('professional_display_name', e.target.value)
                        }
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="professional_title_line">CRM / especialidade</Label>
                      <Input
                        id="professional_title_line"
                        value={letterhead.professional_title_line}
                        onChange={(e) =>
                          handleLetterheadFieldChange('professional_title_line', e.target.value)
                        }
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="professional_address_line">Endereço do médico</Label>
                      <Textarea
                        id="professional_address_line"
                        value={letterhead.professional_address_line}
                        onChange={(e) =>
                          handleLetterheadFieldChange('professional_address_line', e.target.value)
                        }
                        rows={3}
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="professional_contact_line">Contato do médico</Label>
                      <Input
                        id="professional_contact_line"
                        value={letterhead.professional_contact_line}
                        onChange={(e) =>
                          handleLetterheadFieldChange('professional_contact_line', e.target.value)
                        }
                        className="bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Assinatura híbrida</h3>
                  <div className="mt-4">
                    <LaudoSignaturePad
                      signature={signature}
                      onChange={setSignature}
                      disabled={loading}
                    />
                    {signatureError && (
                      <p className="mt-2 text-sm text-red-600 font-semibold">{signatureError}</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                  <h3 className="text-sm font-semibold text-sky-900">Uso futuro no portal</h3>
                  <p className="mt-2 text-sm text-sky-800">
                    Este laudo poderá entrar no fluxo de assinatura, liberação e publicação para
                    acesso do paciente com login e senha.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Checklist rápido</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    <li>Título claro e localizável</li>
                    <li>Conteúdo final revisado</li>
                    <li>Status correto antes da liberação</li>
                    <li>Data do exame quando aplicável</li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Orientação de preenchimento
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    <li>Descreva o contexto clínico de forma objetiva.</li>
                    <li>Registre conclusão e conduta quando houver.</li>
                    <li>Evite abreviações ambíguas em conteúdo entregue ao paciente.</li>
                  </ul>
                </div>
              </div>
            </aside>
          </div>

          <DialogFooter className="border-t border-slate-200 bg-white px-6 py-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !titulo.trim()}>
              {isEdit ? 'Salvar laudo' : 'Criar laudo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
