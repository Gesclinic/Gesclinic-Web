import React, { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ValidatedFormField, ValidatedFormFieldGroup } from '@/components/forms/ValidatedFormField';
import { useFormValidation, validators, composeValidators } from '@/hooks/useFormValidation';
import { useDependentSelect } from '@/hooks/useDynamicSelect';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Formulário de Agendamento com Validações Avançadas
 * Utiliza: useFormValidation + ValidatedFormField + useDependentSelect
 */
export function AppointmentFormWithValidation({
  open,
  onClose,
  onSubmit,
  initialValues = {},
  professionals = [],
  patients = [],
  rooms = [],
  insurances = [],
  isLoading = false,
  fetchServicesByProfessional,
  fetchPlansByInsurance,
}) {
  const [submitError, setSubmitError] = React.useState('');
  const [submitSuccess, setSubmitSuccess] = React.useState(false);

  // Selects dinâmicos
  const { cascade, loadCascade, getCascadeOptions } = useDependentSelect(formik.values);

  // Hook de validação
  const formik = useFormValidation(
    {
      date: initialValues.date || '',
      startTime: initialValues.startTime || '09:00',
      endTime: initialValues.endTime || '10:00',
      patientId: initialValues.patientId || '',
      professionalId: initialValues.professionalId || '',
      serviceId: initialValues.serviceId || '',
      roomId: initialValues.roomId || '',
      insuranceId: initialValues.insuranceId || '',
      planId: initialValues.planId || '',
      notes: initialValues.notes || '',
    },
    async (fieldName, value, allValues) => {
      // Validações específicas por campo
      switch (fieldName) {
        case 'date':
          return validators.required('Data')(value);

        case 'startTime':
          return validators.required('Hora inicial')(value);

        case 'endTime':
          return validators.required('Hora final')(value);

        case 'patientId':
          return validators.required('Paciente')(value);

        case 'professionalId':
          return validators.required('Profissional')(value);

        case 'serviceId':
          return validators.required('Serviço')(value);

        case 'roomId':
          // Room é opcional se profissional trabalhar sem sala
          return { error: null };

        case 'insuranceId':
          return validators.required('Convênio')(value);

        default:
          return { error: null };
      }
    }
  );

  // Carregar serviços quando profissional muda
  useEffect(() => {
    if (formik.values.professionalId) {
      loadCascade('services', 'professionalId', () =>
        fetchServicesByProfessional(formik.values.professionalId)
      );
      // Limpar serviço selecionado
      formik.setFieldValue('serviceId', '');
    }
  }, [formik.values.professionalId]);

  // Carregar planos quando convênio muda
  useEffect(() => {
    if (formik.values.insuranceId) {
      loadCascade('plans', 'insuranceId', () =>
        fetchPlansByInsurance(formik.values.insuranceId)
      );
      formik.setFieldValue('planId', '');
    }
  }, [formik.values.insuranceId]);

  // Opções de formato para selects
  const professionalOptions = professionals.map(p => ({
    value: p.id,
    label: p.name,
  }));

  const patientOptions = patients.map(p => ({
    value: p.id,
    label: `${p.name} (${p.cpf || 'S/CPF'})`,
  }));

  const roomOptions = rooms.map(r => ({
    value: r.id,
    label: r.name,
  }));

  const insuranceOptions = insurances.map(i => ({
    value: i.id,
    label: i.name,
  }));

  const serviceOptions = getCascadeOptions('services').map(s => ({
    value: s.id,
    label: s.name,
  }));

  const planOptions = getCascadeOptions('plans').map(p => ({
    value: p.id,
    label: p.name,
  }));

  const formFields = [
    {
      name: 'date',
      label: 'Data',
      type: 'date',
      required: true,
      help: 'Selecione a data do agendamento',
    },
    {
      name: 'startTime',
      label: 'Hora Inicial',
      type: 'time',
      required: true,
    },
    {
      name: 'endTime',
      label: 'Hora Final',
      type: 'time',
      required: true,
      help: 'Deve ser maior que a hora inicial',
    },
    {
      name: 'patientId',
      label: 'Paciente',
      type: 'select',
      options: patientOptions,
      required: true,
      placeholder: 'Selecione o paciente',
    },
    {
      name: 'professionalId',
      label: 'Profissional',
      type: 'select',
      options: professionalOptions,
      required: true,
      placeholder: 'Selecione o profissional',
    },
    {
      name: 'serviceId',
      label: 'Serviço',
      type: 'select',
      options: serviceOptions,
      required: true,
      placeholder: formik.validating.professionalId ? 'Carregando...' : 'Selecione um profissional primeiro',
      disabled: !formik.values.professionalId || formik.validating.serviceId,
    },
    {
      name: 'roomId',
      label: 'Sala',
      type: 'select',
      options: roomOptions,
      required: false,
      placeholder: 'Opcional - selecione uma sala',
    },
    {
      name: 'insuranceId',
      label: 'Convênio',
      type: 'select',
      options: insuranceOptions,
      required: true,
      placeholder: 'Selecione o convênio',
    },
    {
      name: 'planId',
      label: 'Plano',
      type: 'select',
      options: planOptions,
      required: false,
      placeholder: formik.validating.planId ? 'Carregando...' : 'Opcional - selecione um plano',
      disabled: !formik.values.insuranceId || formik.validating.planId,
    },
    {
      name: 'notes',
      label: 'Observações',
      type: 'textarea',
      maxLength: 500,
      placeholder: 'Adicione observações sobre o agendamento',
      rows: 3,
    },
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      // Validar todos os campos
      const isValid = await formik.validateAll();
      if (!isValid) {
        setSubmitError('Verifique os erros no formulário');
        return;
      }

      // Submeter dados
      await onSubmit(formik.values);
      setSubmitSuccess(true);
      setTimeout(() => {
        formik.resetForm();
        onClose();
      }, 1500);
    } catch (error) {
      setSubmitError(error.message || 'Erro ao salvar agendamento');
      console.error('Erro ao submeter:', error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialValues.id ? 'Editar Agendamento' : 'Novo Agendamento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Erros de submissão */}
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Erro ao salvar</p>
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            </div>
          )}

          {/* Sucesso */}
          {submitSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md flex gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900">Agendamento salvo com sucesso!</p>
              </div>
            </div>
          )}

          {/* Campos de Data e Hora */}
          <div className="grid grid-cols-3 gap-4">
            <ValidatedFormField
              label="Data"
              name="date"
              type="date"
              value={formik.values.date}
              error={formik.errors.date}
              touched={formik.touched.date}
              validating={formik.validating.date}
              onChange={formik.setFieldValue}
              onBlur={formik.setFieldTouched}
              required
            />
            <ValidatedFormField
              label="Início"
              name="startTime"
              type="time"
              value={formik.values.startTime}
              error={formik.errors.startTime}
              touched={formik.touched.startTime}
              validating={formik.validating.startTime}
              onChange={formik.setFieldValue}
              onBlur={formik.setFieldTouched}
              required
            />
            <ValidatedFormField
              label="Fim"
              name="endTime"
              type="time"
              value={formik.values.endTime}
              error={formik.errors.endTime}
              touched={formik.touched.endTime}
              validating={formik.validating.endTime}
              onChange={formik.setFieldValue}
              onBlur={formik.setFieldTouched}
              required
            />
          </div>

          {/* Campos de Seleção - Paciente, Profissional, Serviço */}
          <div className="grid grid-cols-1 gap-4">
            <ValidatedFormField
              label="Paciente"
              name="patientId"
              type="select"
              value={formik.values.patientId}
              error={formik.errors.patientId}
              touched={formik.touched.patientId}
              validating={formik.validating.patientId}
              onChange={formik.setFieldValue}
              onBlur={formik.setFieldTouched}
              options={patientOptions}
              placeholder="Buscar paciente..."
              required
            />
            <ValidatedFormField
              label="Profissional"
              name="professionalId"
              type="select"
              value={formik.values.professionalId}
              error={formik.errors.professionalId}
              touched={formik.touched.professionalId}
              validating={formik.validating.professionalId}
              onChange={formik.setFieldValue}
              onBlur={formik.setFieldTouched}
              options={professionalOptions}
              placeholder="Selecione o profissional"
              required
            />
            <ValidatedFormField
              label="Serviço"
              name="serviceId"
              type="select"
              value={formik.values.serviceId}
              error={formik.errors.serviceId}
              touched={formik.touched.serviceId}
              validating={formik.validating.serviceId}
              onChange={formik.setFieldValue}
              onBlur={formik.setFieldTouched}
              options={serviceOptions}
              placeholder={
                !formik.values.professionalId
                  ? 'Selecione um profissional primeiro'
                  : formik.validating.serviceId
                  ? 'Carregando serviços...'
                  : 'Selecione o serviço'
              }
              disabled={!formik.values.professionalId}
              required
            />
          </div>

          {/* Campos de Convênio e Sala */}
          <div className="grid grid-cols-2 gap-4">
            <ValidatedFormField
              label="Convênio"
              name="insuranceId"
              type="select"
              value={formik.values.insuranceId}
              error={formik.errors.insuranceId}
              touched={formik.touched.insuranceId}
              validating={formik.validating.insuranceId}
              onChange={formik.setFieldValue}
              onBlur={formik.setFieldTouched}
              options={insuranceOptions}
              placeholder="Selecione o convênio"
              required
            />
            <ValidatedFormField
              label="Sala"
              name="roomId"
              type="select"
              value={formik.values.roomId}
              error={formik.errors.roomId}
              touched={formik.touched.roomId}
              validating={formik.validating.roomId}
              onChange={formik.setFieldValue}
              onBlur={formik.setFieldTouched}
              options={roomOptions}
              placeholder="Opcional"
              required={false}
            />
          </div>

          {/* Plano (dependente de Convênio) */}
          {formik.values.insuranceId && (
            <ValidatedFormField
              label="Plano"
              name="planId"
              type="select"
              value={formik.values.planId}
              error={formik.errors.planId}
              touched={formik.touched.planId}
              validating={formik.validating.planId}
              onChange={formik.setFieldValue}
              onBlur={formik.setFieldTouched}
              options={planOptions}
              placeholder={formik.validating.planId ? 'Carregando...' : 'Opcional'}
              required={false}
            />
          )}

          {/* Observações */}
          <ValidatedFormField
            label="Observações"
            name="notes"
            type="textarea"
            value={formik.values.notes}
            error={formik.errors.notes}
            touched={formik.touched.notes}
            validating={formik.validating.notes}
            onChange={formik.setFieldValue}
            onBlur={formik.setFieldTouched}
            maxLength={500}
            placeholder="Adicione observações sobre o agendamento"
            rows={3}
          />

          {/* Indicador de Validade */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center gap-2">
              {formik.isValid ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">
                    ✅ Formulário válido - pronto para enviar
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <span className="text-sm text-orange-700">
                    {Object.keys(formik.touched).length === 0
                      ? 'Preencha todos os campos obrigatórios'
                      : 'Existem erros no formulário'}
                  </span>
                </>
              )}
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formik.isValid || formik.isValidating || isLoading || submitSuccess}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {submitSuccess
              ? '✅ Agendamento Criado'
              : formik.isValidating
              ? 'Validando...'
              : 'Criar Agendamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
