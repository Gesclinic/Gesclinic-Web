import React, { useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ValidatedFormField } from '@/components/ValidatedFormField';
import { useFormValidation, validators, composeValidators } from '@/hooks/useFormValidation';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Componente de Formulário com Abas
 * Ideal para formulários longos com múltiplas seções
 * Valida todos os campos antes de permitir submissão
 */
export function TabbedForm({
  title,
  description,
  tabs = [], // Array de { label, icon, fields: [] }
  initialValues = {},
  onSubmit,
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  onCancel,
  isLoading = false,
}) {
  const [activeTab, setActiveTab] = useState('0');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [visitedTabs, setVisitedTabs] = useState(new Set());

  // Hook de validação
  const formik = useFormValidation(initialValues, async (fieldName, value, allValues) => {
    // Encontrar o campo e sua validação
    for (const tab of tabs) {
      const field = tab.fields.find(f => f.name === fieldName);
      if (field && field.validate) {
        return await field.validate(value, allValues);
      }
    }
    return { error: null };
  });

  // Marcar aba como visitada
  const handleTabChange = (tabIndex) => {
    setVisitedTabs(prev => new Set([...prev, tabIndex]));
    setActiveTab(tabIndex);
  };

  // Validar tab específica
  const validateTab = async (tabIndex) => {
    const tab = tabs[tabIndex];
    const fieldNames = tab.fields.map(f => f.name);

    const isValid = await Promise.all(
      fieldNames.map(fieldName => formik.validateField(fieldName, formik.values[fieldName]))
    ).then(results => results.every(r => !r?.error));

    return isValid;
  };

  // Avançar para próxima aba
  const handleNext = async () => {
    const currentTabIndex = parseInt(activeTab);
    const isValid = await validateTab(currentTabIndex);

    if (!isValid) {
      setSubmitError('Preencha os campos obrigatórios desta aba');
      return;
    }

    if (currentTabIndex < tabs.length - 1) {
      handleTabChange(String(currentTabIndex + 1));
      setSubmitError('');
    }
  };

  // Voltar para aba anterior
  const handlePrevious = () => {
    const currentTabIndex = parseInt(activeTab);
    if (currentTabIndex > 0) {
      handleTabChange(String(currentTabIndex - 1));
    }
  };

  // Submeter formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      // Validar todas as abas
      const allValid = await Promise.all(
        tabs.map((_, index) => validateTab(index))
      ).then(results => results.every(v => v));

      if (!allValid) {
        setSubmitError('Existem erros em algumas abas. Revise e tente novamente.');
        return;
      }

      // Submeter dados
      await onSubmit(formik.values);
      setSubmitSuccess(true);
      setTimeout(() => {
        if (onCancel) onCancel();
      }, 1500);
    } catch (error) {
      setSubmitError(error.message || 'Erro ao salvar formulário');
      console.error('Erro ao submeter:', error);
    }
  };

  const currentTabIndex = parseInt(activeTab);
  const isFirstTab = currentTabIndex === 0;
  const isLastTab = currentTabIndex === tabs.length - 1;

  // Contar erros por aba
  const getTabErrorCount = (tabIndex) => {
    const tab = tabs[tabIndex];
    return tab.fields.filter(field => formik.errors[field.name]).length;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="mb-6">
        {title && <h2 className="text-2xl font-bold text-gray-900 mb-1">{title}</h2>}
        {description && <p className="text-gray-600 text-sm">{description}</p>}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-700">
            Aba {currentTabIndex + 1} de {tabs.length}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(((currentTabIndex + 1) / tabs.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-300"
            style={{ width: `${((currentTabIndex + 1) / tabs.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Erro de Submissão */}
      {submitError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {/* Sucesso */}
      {submitSuccess && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            ✅ Formulário salvo com sucesso!
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const hasError = getTabErrorCount(index) > 0;
            const isVisited = visitedTabs.has(String(index));

            return (
              <TabsTrigger
                key={index}
                value={String(index)}
                className={`flex items-center gap-2 ${
                  hasError && isVisited ? 'text-red-600' : ''
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                <span>{tab.label}</span>
                {hasError && isVisited && (
                  <span className="ml-1 text-red-600 font-semibold">!</span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Tab Contents */}
        {tabs.map((tab, index) => (
          <TabsContent key={index} value={String(index)} className="space-y-4 mt-6">
            {tab.description && (
              <p className="text-sm text-gray-600 mb-4">{tab.description}</p>
            )}

            {/* Campos da Aba */}
            <div className="space-y-4">
              {tab.fields.map((field) => (
                <ValidatedFormField
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  type={field.type || 'text'}
                  value={formik.values[field.name]}
                  error={formik.errors[field.name]}
                  touched={formik.touched[field.name]}
                  validating={formik.validating[field.name]}
                  onChange={formik.setFieldValue}
                  onBlur={formik.setFieldTouched}
                  placeholder={field.placeholder}
                  required={field.required}
                  disabled={field.disabled}
                  options={field.options}
                  help={field.help}
                  icon={field.icon}
                  maxLength={field.maxLength}
                  rows={field.rows}
                />
              ))}
            </div>

            {/* Info da Aba */}
            {tab.info && (
              <Alert className="mt-4 bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">{tab.info}</AlertDescription>
              </Alert>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Navegação */}
      <div className="flex gap-3 pt-6 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={isFirstTab}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>

        <Button
          variant="outline"
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>

        <div className="flex-1" />

        {!isLastTab && (
          <Button
            onClick={handleNext}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            Próximo
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}

        {isLastTab && (
          <Button
            onClick={handleSubmit}
            disabled={!formik.isValid || isLoading || submitSuccess}
            className="bg-green-600 hover:bg-green-700"
          >
            {submitSuccess ? '✅ Salvo!' : isLoading ? 'Salvando...' : submitLabel}
          </Button>
        )}
      </div>

      {/* Resumo de Validação */}
      {Object.keys(formik.touched).length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700">
          <div className="font-semibold mb-1">📊 Status de Validação:</div>
          <div className="grid grid-cols-2 gap-2">
            {tabs.map((tab, index) => {
              const errorCount = getTabErrorCount(index);
              return (
                <div key={index} className="flex items-center gap-2">
                  {errorCount === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span>
                    {tab.label}: {errorCount === 0 ? 'OK' : `${errorCount} erro(s)`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Exemplo de uso do TabbedForm
 */
export function ExampleTabbedForm() {
  const tabs = [
    {
      label: 'Básico',
      icon: null,
      description: 'Informações básicas do profissional',
      fields: [
        {
          name: 'name',
          label: 'Nome Completo',
          type: 'text',
          required: true,
          placeholder: 'Digite o nome completo',
          validate: (value) => validators.required('Nome')(value),
        },
        {
          name: 'email',
          label: 'Email',
          type: 'email',
          required: true,
          validate: (value) => validators.email(value),
        },
        {
          name: 'phone',
          label: 'Telefone',
          type: 'text',
          required: true,
          validate: (value) => validators.phone(value),
        },
      ],
    },
    {
      label: 'Profissional',
      icon: null,
      description: 'Informações profissionais',
      fields: [
        {
          name: 'crm',
          label: 'CRM / CRBIO',
          type: 'text',
          required: true,
          placeholder: 'Número do registro profissional',
        },
        {
          name: 'specialty',
          label: 'Especialidade',
          type: 'select',
          required: true,
          options: [
            { value: 'cirurgia', label: 'Cirurgia' },
            { value: 'clinica', label: 'Clínica Geral' },
          ],
        },
      ],
    },
    {
      label: 'Confirmação',
      icon: null,
      description: 'Revise as informações antes de salvar',
      fields: [
        {
          name: 'terms',
          label: 'Concordo com os termos',
          type: 'checkbox',
          required: true,
        },
      ],
    },
  ];

  const handleSubmit = async (values) => {
    console.log('Formulário enviado:', values);
    // Enviar para API
  };

  return (
    <TabbedForm
      title="Cadastro de Profissional"
      description="Preencha todas as informações para criar um novo profissional"
      tabs={tabs}
      initialValues={{
        name: '',
        email: '',
        phone: '',
        crm: '',
        specialty: '',
        terms: false,
      }}
      onSubmit={handleSubmit}
      submitLabel="Criar Profissional"
      cancelLabel="Cancelar"
    />
  );
}
