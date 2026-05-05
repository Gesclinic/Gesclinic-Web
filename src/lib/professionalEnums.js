export const PROFESSIONAL_KIND_OPTIONS = [
  { value: 'medico', label: 'Médico(a)' },
  { value: 'dentista', label: 'Dentista' },
  { value: 'nutricionista', label: 'Nutricionista' },
  { value: 'fisioterapeuta', label: 'Fisioterapeuta' },
  { value: 'psicologo', label: 'Psicólogo(a)' },
  { value: 'enfermeiro', label: 'Enfermeiro(a)' },
  { value: 'fonoaudiologo', label: 'Fonoaudiólogo(a)' },
  { value: 'outro', label: 'Outro' },
];

export const getProfessionalKindLabel = (kind) => {
  if (!kind) {
    return '—';
  }
  return PROFESSIONAL_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? kind;
};
