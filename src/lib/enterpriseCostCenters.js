import { supabase } from '@/lib/customSupabaseClient';

const ENTERPRISE_COST_CENTER_TEMPLATE = [
  { code: '1', parent_code: null, name: 'ASSISTENCIAL', center_type: 'ASSISTENCIAL', unit_name: 'MATRIZ', color: '#0ea5e9', icon: 'stethoscope', responsible_name: 'Gerencia Assistencial', description: 'Area assistencial principal' },
  { code: '1.1', parent_code: '1', name: 'Consultorios', center_type: 'ASSISTENCIAL', unit_name: 'MATRIZ', color: '#0ea5e9', icon: 'door-open', responsible_name: 'Coordenacao Medica', description: 'Atendimentos ambulatoriais em consultorio' },
  { code: '1.2', parent_code: '1', name: 'Ambulatorio', center_type: 'ASSISTENCIAL', unit_name: 'MATRIZ', color: '#0ea5e9', icon: 'activity', responsible_name: 'Coordenacao Ambulatorial', description: 'Atendimentos e procedimentos ambulatoriais' },
  { code: '1.3', parent_code: '1', name: 'Centro Diagnostico', center_type: 'ASSISTENCIAL', unit_name: 'CENTRO DIAGNOSTICO', color: '#0ea5e9', icon: 'microscope', responsible_name: 'Coordenacao Diagnostica', description: 'Centro de diagnostico e apoio' },
  { code: '1.4', parent_code: '1', name: 'Exames', center_type: 'ASSISTENCIAL', unit_name: 'CENTRO DIAGNOSTICO', color: '#0ea5e9', icon: 'file-search', responsible_name: 'Coordenacao de Exames', description: 'Exames laboratoriais e complementares' },
  { code: '1.5', parent_code: '1', name: 'Laboratorio', center_type: 'ASSISTENCIAL', unit_name: 'CENTRO DIAGNOSTICO', color: '#0ea5e9', icon: 'flask-conical', responsible_name: 'Responsavel Tecnico Lab', description: 'Processamento laboratorial' },
  { code: '1.6', parent_code: '1', name: 'Neurofisiologia', center_type: 'ASSISTENCIAL', unit_name: 'CENTRO DIAGNOSTICO', color: '#0ea5e9', icon: 'brain', responsible_name: 'Coordenacao Neurofisiologia', description: 'EEG, EMG e estudos neurofisiologicos' },
  { code: '1.7', parent_code: '1', name: 'Imagem', center_type: 'ASSISTENCIAL', unit_name: 'CENTRO DIAGNOSTICO', color: '#0ea5e9', icon: 'scan-line', responsible_name: 'Coordenacao Imagem', description: 'Diagnostico por imagem' },
  { code: '1.8', parent_code: '1', name: 'Telemedicina', center_type: 'ASSISTENCIAL', unit_name: 'TELEMEDICINA', color: '#0ea5e9', icon: 'monitor-smartphone', responsible_name: 'Coordenacao Telemedicina', description: 'Consultas e monitoramento remoto' },
  { code: '1.9', parent_code: '1', name: 'Procedimentos', center_type: 'ASSISTENCIAL', unit_name: 'MATRIZ', color: '#0ea5e9', icon: 'syringe', responsible_name: 'Coordenacao Procedimentos', description: 'Procedimentos clinicos e terapeuticos' },
  { code: '1.10', parent_code: '1', name: 'Centro Cirurgico', center_type: 'ASSISTENCIAL', unit_name: 'HOSPITAL', color: '#0ea5e9', icon: 'scissors', responsible_name: 'Coord. Centro Cirurgico', description: 'Centro cirurgico e apoio perioperatorio' },
  { code: '1.11', parent_code: '1', name: 'Internacao', center_type: 'ASSISTENCIAL', unit_name: 'HOSPITAL', color: '#0ea5e9', icon: 'bed-double', responsible_name: 'Coord. Internacao', description: 'Leitos de internacao clinica e cirurgica' },
  { code: '1.12', parent_code: '1', name: 'UTI', center_type: 'ASSISTENCIAL', unit_name: 'HOSPITAL', color: '#0ea5e9', icon: 'heart-pulse', responsible_name: 'Coord. UTI', description: 'Unidade de terapia intensiva' },
  { code: '1.13', parent_code: '1', name: 'Recuperacao Pos-Anestesica', center_type: 'ASSISTENCIAL', unit_name: 'HOSPITAL', color: '#0ea5e9', icon: 'shield-plus', responsible_name: 'Coord. RPA', description: 'Recuperacao pos-anestesica e observacao' },

  { code: '2', parent_code: null, name: 'ESPECIALIDADES', center_type: 'ESPECIALIDADE', unit_name: 'MATRIZ', color: '#14b8a6', icon: 'stethoscope', responsible_name: 'Diretoria Medica', description: 'Especialidades medicas e linhas de cuidado' },
  { code: '2.1', parent_code: '2', name: 'Neurologia', center_type: 'ESPECIALIDADE', unit_name: 'MATRIZ', color: '#14b8a6', icon: 'brain', responsible_name: 'Coord. Neurologia', description: 'Linha neurologica clinica' },
  { code: '2.2', parent_code: '2', name: 'Neurocirurgia', center_type: 'ESPECIALIDADE', unit_name: 'HOSPITAL', color: '#14b8a6', icon: 'scissors', responsible_name: 'Coord. Neurocirurgia', description: 'Linha neurocirurgica' },
  { code: '2.3', parent_code: '2', name: 'Cardiologia', center_type: 'ESPECIALIDADE', unit_name: 'MATRIZ', color: '#14b8a6', icon: 'heart', responsible_name: 'Coord. Cardiologia', description: 'Linha cardiologica' },
  { code: '2.4', parent_code: '2', name: 'Pediatria', center_type: 'ESPECIALIDADE', unit_name: 'MATRIZ', color: '#14b8a6', icon: 'baby', responsible_name: 'Coord. Pediatria', description: 'Linha pediatrica' },
  { code: '2.5', parent_code: '2', name: 'Ortopedia', center_type: 'ESPECIALIDADE', unit_name: 'MATRIZ', color: '#14b8a6', icon: 'bone', responsible_name: 'Coord. Ortopedia', description: 'Linha ortopedica' },
  { code: '2.6', parent_code: '2', name: 'Psiquiatria', center_type: 'ESPECIALIDADE', unit_name: 'MATRIZ', color: '#14b8a6', icon: 'message-circle-heart', responsible_name: 'Coord. Psiquiatria', description: 'Linha psiquiatrica' },
  { code: '2.7', parent_code: '2', name: 'Clinica Medica', center_type: 'ESPECIALIDADE', unit_name: 'MATRIZ', color: '#14b8a6', icon: 'clipboard-stethoscope', responsible_name: 'Coord. Clinica Medica', description: 'Clinica medica geral' },
  { code: '2.8', parent_code: '2', name: 'Ginecologia', center_type: 'ESPECIALIDADE', unit_name: 'MATRIZ', color: '#14b8a6', icon: 'venus', responsible_name: 'Coord. Ginecologia', description: 'Linha ginecologica' },
  { code: '2.9', parent_code: '2', name: 'Dermatologia', center_type: 'ESPECIALIDADE', unit_name: 'MATRIZ', color: '#14b8a6', icon: 'sparkles', responsible_name: 'Coord. Dermatologia', description: 'Linha dermatologica' },
  { code: '2.10', parent_code: '2', name: 'Endocrinologia', center_type: 'ESPECIALIDADE', unit_name: 'MATRIZ', color: '#14b8a6', icon: 'flame', responsible_name: 'Coord. Endocrinologia', description: 'Linha endocrinologica' },
  { code: '2.11', parent_code: '2', name: 'Oftalmologia', center_type: 'ESPECIALIDADE', unit_name: 'MATRIZ', color: '#14b8a6', icon: 'eye', responsible_name: 'Coord. Oftalmologia', description: 'Linha oftalmologica' },
  { code: '2.12', parent_code: '2', name: 'Otorrinolaringologia', center_type: 'ESPECIALIDADE', unit_name: 'MATRIZ', color: '#14b8a6', icon: 'ear', responsible_name: 'Coord. Otorrino', description: 'Linha otorrinolaringologica' },

  { code: '3', parent_code: null, name: 'PRODUCAO MEDICA', center_type: 'PRODUCAO_MEDICA', unit_name: 'MATRIZ', color: '#6366f1', icon: 'bar-chart-3', responsible_name: 'Controladoria Medica', description: 'Producao medica por tipo de atendimento' },
  { code: '3.1', parent_code: '3', name: 'Consultas', center_type: 'PRODUCAO_MEDICA', unit_name: 'MATRIZ', color: '#6366f1', icon: 'user-round-check', responsible_name: 'Controladoria Medica', description: 'Producao de consultas' },
  { code: '3.2', parent_code: '3', name: 'Exames', center_type: 'PRODUCAO_MEDICA', unit_name: 'CENTRO DIAGNOSTICO', color: '#6366f1', icon: 'test-tube', responsible_name: 'Controladoria Medica', description: 'Producao de exames' },
  { code: '3.3', parent_code: '3', name: 'Procedimentos', center_type: 'PRODUCAO_MEDICA', unit_name: 'MATRIZ', color: '#6366f1', icon: 'badge-plus', responsible_name: 'Controladoria Medica', description: 'Producao de procedimentos' },
  { code: '3.4', parent_code: '3', name: 'Cirurgias', center_type: 'PRODUCAO_MEDICA', unit_name: 'HOSPITAL', color: '#6366f1', icon: 'scissors', responsible_name: 'Controladoria Medica', description: 'Producao cirurgica' },
  { code: '3.5', parent_code: '3', name: 'Internacoes', center_type: 'PRODUCAO_MEDICA', unit_name: 'HOSPITAL', color: '#6366f1', icon: 'bed-double', responsible_name: 'Controladoria Medica', description: 'Producao de internacoes' },
  { code: '3.6', parent_code: '3', name: 'Telemedicina', center_type: 'PRODUCAO_MEDICA', unit_name: 'TELEMEDICINA', color: '#6366f1', icon: 'monitor-smartphone', responsible_name: 'Controladoria Medica', description: 'Producao telemedicina' },
  { code: '3.7', parent_code: '3', name: 'Medicina Ocupacional', center_type: 'PRODUCAO_MEDICA', unit_name: 'MATRIZ', color: '#6366f1', icon: 'briefcase-medical', responsible_name: 'Controladoria Medica', description: 'Producao ocupacional' },

  { code: '4', parent_code: null, name: 'CONVENIOS', center_type: 'CONVENIO', unit_name: 'MATRIZ', color: '#22c55e', icon: 'shield-check', responsible_name: 'Gestao de Convenios', description: 'Gestao de receita por convenio e pagador' },
  { code: '4.1', parent_code: '4', name: 'Unimed', center_type: 'CONVENIO', unit_name: 'MATRIZ', color: '#22c55e', icon: 'heart-pulse', responsible_name: 'Gestao de Convenios', description: 'Operacoes com Unimed' },
  { code: '4.2', parent_code: '4', name: 'Bradesco', center_type: 'CONVENIO', unit_name: 'MATRIZ', color: '#22c55e', icon: 'wallet', responsible_name: 'Gestao de Convenios', description: 'Operacoes com Bradesco Saude' },
  { code: '4.3', parent_code: '4', name: 'Amil', center_type: 'CONVENIO', unit_name: 'MATRIZ', color: '#22c55e', icon: 'wallet', responsible_name: 'Gestao de Convenios', description: 'Operacoes com Amil' },
  { code: '4.4', parent_code: '4', name: 'SulAmerica', center_type: 'CONVENIO', unit_name: 'MATRIZ', color: '#22c55e', icon: 'wallet', responsible_name: 'Gestao de Convenios', description: 'Operacoes com SulAmerica' },
  { code: '4.5', parent_code: '4', name: 'Hapvida', center_type: 'CONVENIO', unit_name: 'MATRIZ', color: '#22c55e', icon: 'wallet', responsible_name: 'Gestao de Convenios', description: 'Operacoes com Hapvida' },
  { code: '4.6', parent_code: '4', name: 'Cassi', center_type: 'CONVENIO', unit_name: 'MATRIZ', color: '#22c55e', icon: 'wallet', responsible_name: 'Gestao de Convenios', description: 'Operacoes com Cassi' },
  { code: '4.7', parent_code: '4', name: 'Geap', center_type: 'CONVENIO', unit_name: 'MATRIZ', color: '#22c55e', icon: 'wallet', responsible_name: 'Gestao de Convenios', description: 'Operacoes com Geap' },
  { code: '4.8', parent_code: '4', name: 'Particular', center_type: 'CONVENIO', unit_name: 'MATRIZ', color: '#22c55e', icon: 'user-round', responsible_name: 'Gestao de Convenios', description: 'Receitas de pacientes particulares' },
  { code: '4.9', parent_code: '4', name: 'Empresas', center_type: 'CONVENIO', unit_name: 'MATRIZ', color: '#22c55e', icon: 'building-2', responsible_name: 'Gestao de Convenios', description: 'Contratos corporativos e B2B' },

  { code: '5', parent_code: null, name: 'UNIDADES', center_type: 'UNIDADE', unit_name: 'MATRIZ', color: '#f59e0b', icon: 'building', responsible_name: 'Diretoria Operacional', description: 'Consolidacao por unidade operacional' },
  { code: '5.1', parent_code: '5', name: 'Matriz', center_type: 'UNIDADE', unit_name: 'MATRIZ', color: '#f59e0b', icon: 'building-2', responsible_name: 'Gerencia Matriz', description: 'Unidade principal' },
  { code: '5.2', parent_code: '5', name: 'Filial 01', center_type: 'UNIDADE', unit_name: 'FILIAL 01', color: '#f59e0b', icon: 'building-2', responsible_name: 'Gerencia Filial 01', description: 'Unidade filial 01' },
  { code: '5.3', parent_code: '5', name: 'Filial 02', center_type: 'UNIDADE', unit_name: 'FILIAL 02', color: '#f59e0b', icon: 'building-2', responsible_name: 'Gerencia Filial 02', description: 'Unidade filial 02' },
  { code: '5.4', parent_code: '5', name: 'Hospital', center_type: 'UNIDADE', unit_name: 'HOSPITAL', color: '#f59e0b', icon: 'hospital', responsible_name: 'Gerencia Hospitalar', description: 'Operacao hospitalar' },
  { code: '5.5', parent_code: '5', name: 'Centro Diagnostico', center_type: 'UNIDADE', unit_name: 'CENTRO DIAGNOSTICO', color: '#f59e0b', icon: 'microscope', responsible_name: 'Gerencia Diagnostico', description: 'Operacao diagnostica' },
  { code: '5.6', parent_code: '5', name: 'Day Hospital', center_type: 'UNIDADE', unit_name: 'DAY HOSPITAL', color: '#f59e0b', icon: 'sun', responsible_name: 'Gerencia Day Hospital', description: 'Operacao day hospital' },

  { code: '6', parent_code: null, name: 'ADMINISTRATIVO', center_type: 'ADMINISTRATIVO', unit_name: 'MATRIZ', color: '#ef4444', icon: 'briefcase', responsible_name: 'Diretoria Administrativa', description: 'Centros administrativos e corporativos' },
  { code: '6.1', parent_code: '6', name: 'Diretoria', center_type: 'ADMINISTRATIVO', unit_name: 'MATRIZ', color: '#ef4444', icon: 'crown', responsible_name: 'Diretoria Executiva', description: 'Centro de diretoria' },
  { code: '6.2', parent_code: '6', name: 'Financeiro', center_type: 'ADMINISTRATIVO', unit_name: 'MATRIZ', color: '#ef4444', icon: 'circle-dollar-sign', responsible_name: 'Gerencia Financeira', description: 'Centro financeiro' },
  { code: '6.3', parent_code: '6', name: 'RH', center_type: 'ADMINISTRATIVO', unit_name: 'MATRIZ', color: '#ef4444', icon: 'users', responsible_name: 'Gerencia RH', description: 'Recursos humanos' },
  { code: '6.4', parent_code: '6', name: 'Comercial', center_type: 'ADMINISTRATIVO', unit_name: 'MATRIZ', color: '#ef4444', icon: 'handshake', responsible_name: 'Gerencia Comercial', description: 'Comercial e relacionamento' },
  { code: '6.5', parent_code: '6', name: 'Marketing', center_type: 'ADMINISTRATIVO', unit_name: 'MATRIZ', color: '#ef4444', icon: 'megaphone', responsible_name: 'Gerencia Marketing', description: 'Marketing e performance' },
  { code: '6.6', parent_code: '6', name: 'Compras', center_type: 'ADMINISTRATIVO', unit_name: 'MATRIZ', color: '#ef4444', icon: 'shopping-cart', responsible_name: 'Gerencia Compras', description: 'Compras e suprimentos' },
  { code: '6.7', parent_code: '6', name: 'Juridico', center_type: 'ADMINISTRATIVO', unit_name: 'MATRIZ', color: '#ef4444', icon: 'scale', responsible_name: 'Coordenacao Juridica', description: 'Assuntos juridicos' },
  { code: '6.8', parent_code: '6', name: 'Qualidade', center_type: 'ADMINISTRATIVO', unit_name: 'MATRIZ', color: '#ef4444', icon: 'badge-check', responsible_name: 'Coordenacao Qualidade', description: 'Qualidade e acreditacao' },
  { code: '6.9', parent_code: '6', name: 'Controladoria', center_type: 'ADMINISTRATIVO', unit_name: 'MATRIZ', color: '#ef4444', icon: 'line-chart', responsible_name: 'Controladoria', description: 'Controladoria e compliance' },

  { code: '7', parent_code: null, name: 'TECNOLOGIA', center_type: 'TECNOLOGIA', unit_name: 'MATRIZ', color: '#8b5cf6', icon: 'cpu', responsible_name: 'Gerencia de TI', description: 'Tecnologia e sistemas corporativos' },
  { code: '7.1', parent_code: '7', name: 'Infraestrutura', center_type: 'TECNOLOGIA', unit_name: 'MATRIZ', color: '#8b5cf6', icon: 'server', responsible_name: 'Coord. Infraestrutura', description: 'Infraestrutura on-premise e redes' },
  { code: '7.2', parent_code: '7', name: 'Sistemas', center_type: 'TECNOLOGIA', unit_name: 'MATRIZ', color: '#8b5cf6', icon: 'boxes', responsible_name: 'Coord. Sistemas', description: 'Sistemas de negocio e suporte' },
  { code: '7.3', parent_code: '7', name: 'Telecom', center_type: 'TECNOLOGIA', unit_name: 'MATRIZ', color: '#8b5cf6', icon: 'phone', responsible_name: 'Coord. Telecom', description: 'Telefonia e conectividade' },
  { code: '7.4', parent_code: '7', name: 'Seguranca', center_type: 'TECNOLOGIA', unit_name: 'MATRIZ', color: '#8b5cf6', icon: 'shield', responsible_name: 'Coord. Seguranca', description: 'Seguranca da informacao' },
  { code: '7.5', parent_code: '7', name: 'Cloud', center_type: 'TECNOLOGIA', unit_name: 'MATRIZ', color: '#8b5cf6', icon: 'cloud', responsible_name: 'Coord. Cloud', description: 'Infraestrutura cloud e observabilidade' },
  { code: '7.6', parent_code: '7', name: 'Desenvolvimento', center_type: 'TECNOLOGIA', unit_name: 'MATRIZ', color: '#8b5cf6', icon: 'code', responsible_name: 'Coord. Desenvolvimento', description: 'Desenvolvimento de produtos e automacoes' },

  { code: '8', parent_code: null, name: 'OPERACOES', center_type: 'OPERACOES', unit_name: 'MATRIZ', color: '#f97316', icon: 'workflow', responsible_name: 'Diretoria de Operacoes', description: 'Centros de operacao e atendimento' },
  { code: '8.1', parent_code: '8', name: 'Recepcao', center_type: 'OPERACOES', unit_name: 'MATRIZ', color: '#f97316', icon: 'front-desk', responsible_name: 'Coord. Recepcao', description: 'Recepcao e acolhimento' },
  { code: '8.2', parent_code: '8', name: 'Call Center', center_type: 'OPERACOES', unit_name: 'MATRIZ', color: '#f97316', icon: 'headphones', responsible_name: 'Coord. Call Center', description: 'Atendimento telefonico' },
  { code: '8.3', parent_code: '8', name: 'Atendimento', center_type: 'OPERACOES', unit_name: 'MATRIZ', color: '#f97316', icon: 'users-round', responsible_name: 'Coord. Atendimento', description: 'Atendimento geral' },
  { code: '8.4', parent_code: '8', name: 'Agendamento', center_type: 'OPERACOES', unit_name: 'MATRIZ', color: '#f97316', icon: 'calendar-clock', responsible_name: 'Coord. Agendamento', description: 'Agendamento e confirmacao' },
  { code: '8.5', parent_code: '8', name: 'Faturamento', center_type: 'OPERACOES', unit_name: 'MATRIZ', color: '#f97316', icon: 'receipt', responsible_name: 'Coord. Faturamento', description: 'Faturamento e contas medicas' },
  { code: '8.6', parent_code: '8', name: 'Auditoria', center_type: 'OPERACOES', unit_name: 'MATRIZ', color: '#f97316', icon: 'clipboard-check', responsible_name: 'Coord. Auditoria', description: 'Auditoria assistencial e financeira' },
  { code: '8.7', parent_code: '8', name: 'Regulacao', center_type: 'OPERACOES', unit_name: 'MATRIZ', color: '#f97316', icon: 'git-merge', responsible_name: 'Coord. Regulacao', description: 'Regulacao e autorizacoes' },
];

const DESCRIPTION_BY_CODE = ENTERPRISE_COST_CENTER_TEMPLATE.reduce((acc, row) => {
  acc[row.code] = row.description;
  return acc;
}, {});

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function detectCostCenterCodeByContext(payload = {}, mode = 'receivable') {
  const text = normalizeText([
    payload.description,
    payload.service_description,
    payload.procedure_name,
    payload.specialty_name,
    payload.payer_name,
    payload.vendor_name,
    payload.unit_name,
    payload.notes,
    payload.linked_service,
  ].filter(Boolean).join(' '));

  if (mode === 'receivable') {
    if (text.includes('telemedicina') || text.includes('teleconsulta')) return '1.8';
    if (text.includes('uti')) return '1.12';
    if (text.includes('interna')) return '1.11';
    if (text.includes('cirurg')) return '1.10';
    if (text.includes('eeg') || text.includes('emg') || text.includes('neurofisi')) return '1.6';
    if (text.includes('imagem') || text.includes('resson') || text.includes('tomografia') || text.includes('ultra')) return '1.7';
    if (text.includes('laborat')) return '1.5';
    if (text.includes('diagnost') || text.includes('polissonografia')) return '1.3';
    if (text.includes('proced')) return '1.9';
    if (text.includes('ambulator')) return '1.2';
    if (text.includes('consult')) return '1.1';

    if (text.includes('neurolog')) return '2.1';
    if (text.includes('neurocir')) return '2.2';
    if (text.includes('cardio')) return '2.3';
    if (text.includes('pediatr')) return '2.4';
    if (text.includes('ortoped')) return '2.5';
    if (text.includes('psiquiatr')) return '2.6';
    if (text.includes('gineco')) return '2.8';
    if (text.includes('dermato')) return '2.9';
    if (text.includes('endocrino')) return '2.10';
    if (text.includes('oftalmo')) return '2.11';
    if (text.includes('otorrino')) return '2.12';

    if (text.includes('unimed')) return '4.1';
    if (text.includes('bradesco')) return '4.2';
    if (text.includes('amil')) return '4.3';
    if (text.includes('sulamerica')) return '4.4';
    if (text.includes('hapvida')) return '4.5';
    if (text.includes('cassi')) return '4.6';
    if (text.includes('geap')) return '4.7';
    if (text.includes('particular')) return '4.8';
    if (text.includes('empresa') || text.includes('corporativo')) return '4.9';

    if (text.includes('matriz')) return '5.1';
    if (text.includes('filial 01')) return '5.2';
    if (text.includes('filial 02')) return '5.3';
    if (text.includes('hospital')) return '5.4';
    if (text.includes('day hospital')) return '5.6';

    return '1.1';
  }

  if (text.includes('energia')) return '7.1';
  if (text.includes('internet') || text.includes('telefon') || text.includes('telecom')) return '7.3';
  if (text.includes('sistema') || text.includes('software') || text.includes('ti') || text.includes('cloud')) return '7.2';
  if (text.includes('seguranca')) return '7.4';
  if (text.includes('marketing')) return '6.5';
  if (text.includes('jurid')) return '6.7';
  if (text.includes('rh') || text.includes('folha') || text.includes('salario')) return '6.3';
  if (text.includes('compras') || text.includes('fornecedor')) return '6.6';
  if (text.includes('faturamento')) return '8.5';
  if (text.includes('recepcao')) return '8.1';
  if (text.includes('call center')) return '8.2';
  if (text.includes('agendamento')) return '8.4';
  if (text.includes('auditoria')) return '8.6';

  return '6.2';
}

function getLevelFromCode(code) {
  return String(code || '').split('.').filter(Boolean).length;
}

async function listCostCentersByClinic(clinicId) {
  const { data, error } = await supabase
    .from('financial_cost_centers')
    .select('id, clinic_id, parent_id, code, name, description, center_type, unit_name, responsible_name, color, icon, manager_id, is_active')
    .eq('clinic_id', clinicId)
    .order('code', { ascending: true });
  if (error) throw error;
  return data || [];
}

function normalizeValue(value) {
  if (value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  return value;
}

async function upsertEnterpriseCostCenters(clinicId, userId = null) {
  let actorId = userId;
  if (!actorId) {
    const { data: authData } = await supabase.auth.getUser();
    actorId = authData?.user?.id || null;
  }

  if (!actorId) {
    throw new Error('Usuário autenticado é obrigatório para aplicar o template de centro de custos.');
  }

  const existing = await listCostCentersByClinic(clinicId);
  const byCode = new Map(existing.map((item) => [String(item.code), item]));
  const sorted = [...ENTERPRISE_COST_CENTER_TEMPLATE].sort((a, b) => getLevelFromCode(a.code) - getLevelFromCode(b.code));
  const idByCode = new Map();

  for (const row of sorted) {
    const parentId = row.parent_code ? idByCode.get(row.parent_code) || byCode.get(row.parent_code)?.id || null : null;
    const payload = {
      clinic_id: clinicId,
      code: row.code,
      name: row.name,
      description: normalizeValue(row.description),
      center_type: normalizeValue(row.center_type),
      unit_name: normalizeValue(row.unit_name),
      responsible_name: normalizeValue(row.responsible_name),
      color: normalizeValue(row.color),
      icon: normalizeValue(row.icon),
      parent_id: parentId,
      is_active: true,
    };

    const existingRow = byCode.get(row.code);

    if (existingRow?.id) {
      const { data, error } = await supabase
        .from('financial_cost_centers')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRow.id)
        .select('id, code')
        .single();
      if (error) throw error;
      idByCode.set(row.code, data.id);
    } else {
      const { data, error } = await supabase
        .from('financial_cost_centers')
        .insert({
          ...payload,
          created_by: actorId,
        })
        .select('id, code')
        .single();
      if (error) throw error;
      idByCode.set(row.code, data.id);
      byCode.set(row.code, { id: data.id, code: row.code });
    }
  }

  return { insertedOrUpdated: sorted.length };
}

async function backfillCostCenterDescriptions(clinicId) {
  const { data, error } = await supabase
    .from('financial_cost_centers')
    .select('id, code, name, description')
    .eq('clinic_id', clinicId)
    .or('description.is.null,description.eq.')
    .order('code', { ascending: true });

  if (error) throw error;
  const rows = (data || []).filter((row) => !String(row.description || '').trim());
  let fixed = 0;

  for (const row of rows) {
    const newDescription = DESCRIPTION_BY_CODE[row.code] || `Centro ${row.name || row.code} na estrutura ERP hospitalar`;
    const { error: updateError } = await supabase
      .from('financial_cost_centers')
      .update({ description: newDescription, updated_at: new Date().toISOString() })
      .eq('id', row.id);

    if (!updateError) fixed += 1;
  }

  return fixed;
}

export async function applyEnterpriseCostCenterTemplate(clinicId, userId = null) {
  if (!clinicId) throw new Error('clinicId é obrigatório');
  const seed = await upsertEnterpriseCostCenters(clinicId, userId);
  const fixed = await backfillCostCenterDescriptions(clinicId);
  return { ...seed, fixedDescriptions: fixed };
}

export async function repairCostCenterDescriptions(clinicId) {
  if (!clinicId) throw new Error('clinicId é obrigatório');
  const fixed = await backfillCostCenterDescriptions(clinicId);
  return { fixed };
}

export async function resolveEnterpriseCostCenterId(clinicId, payload = {}, mode = 'receivable') {
  if (!clinicId) return null;

  const direct = payload.centro_custo_id || payload.cost_center_id || null;
  if (direct) return direct;

  const code = detectCostCenterCodeByContext(payload, mode);

  try {
    const { data, error } = await supabase
      .from('financial_cost_centers')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle();

    if (!error && data?.id) return data.id;
  } catch {}

  try {
    const { data, error } = await supabase
      .from('financial_cost_centers')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .order('code', { ascending: true })
      .limit(1);
    if (!error && data?.[0]?.id) return data[0].id;
  } catch {}

  return null;
}

export {
  ENTERPRISE_COST_CENTER_TEMPLATE,
  DESCRIPTION_BY_CODE,
  detectCostCenterCodeByContext,
};
