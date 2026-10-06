import { createClient } from '@supabase/supabase-js';

const required = [
  'HML_SUPABASE_URL', 'HML_SUPABASE_ANON_KEY', 'HML_PROJECT_REF',
  'HML_CLINIC_A_CODE', 'HML_ADMIN_A_USER', 'HML_ADMIN_A_PASSWORD',
  'HML_ADMIN_A_ID', 'HML_CLINIC_B_ID',
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Variáveis ausentes: ${missing.join(', ')}`);

const url = new URL(process.env.HML_SUPABASE_URL);
if (url.protocol !== 'https:' || url.hostname !== `${process.env.HML_PROJECT_REF}.supabase.co` ||
    process.env.HML_ASSERT_NON_PRODUCTION !== 'YES_I_VERIFIED_HOMOLOGATION') {
  throw new Error('Confirme o project ref e que este é um projeto isolado de homologação.');
}

const client = createClient(url.href, process.env.HML_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anonymous = createClient(url.href, process.env.HML_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const login = async (password) => client.functions.invoke('secure-login', {
  body: {
    clinicCode: process.env.HML_CLINIC_A_CODE,
    username: process.env.HML_ADMIN_A_USER,
    password,
  },
});

const wrong = await login(`wrong-${crypto.randomUUID()}`);
assert(wrong.error || !wrong.data?.access_token, 'Senha incorreta foi aceita');
console.log('OK: senha incorreta recusada');

const publicUsers = await anonymous.from('users').select('id').limit(1);
assert(publicUsers.error || publicUsers.data?.length === 0,
  'Acesso anônimo retornou usuários');
console.log('OK: consulta anônima de usuários sem dados');

const { data, error } = await login(process.env.HML_ADMIN_A_PASSWORD);
assert(!error && data?.access_token && data?.refresh_token, 'Login de homologação falhou');
const { error: sessionError } = await client.auth.setSession(data);
assert(!sessionError, 'Sessão não foi estabelecida');
const { data: identity, error: identityError } = await client.auth.getUser();
assert(!identityError && identity.user?.id === process.env.HML_ADMIN_A_ID,
  'Identidade Auth não corresponde ao perfil fictício');
console.log('OK: login e identidade Auth');

const own = await client.from('users').select('id, role, status')
  .eq('id', identity.user.id).maybeSingle();
assert(!own.error && own.data?.id === identity.user.id && own.data.role === 'admin',
  'Perfil ou papel do administrador não corresponde');
console.log('OK: perfil e papel lidos pelo próprio usuário');

const verifier = await client.from('users').select('password_hash').eq('id', identity.user.id);
assert(verifier.error, 'Coluna legada password_hash exposta ao cliente');
console.log('OK: verificador de senha inacessível ao navegador');

const safeInsurance = await client.from('health_insurances').select('id, name').limit(1);
assert(!safeInsurance.error, 'Consulta normal de convênios indisponível');
for (const column of ['tiss_password', 'portal_password', 'portal_api_key', 'certificate_password']) {
  const secretRead = await client.from('health_insurances').select(column).limit(1);
  assert(secretRead.error, `Credencial ${column} acessível ao navegador`);
}
const allInsurance = await client.from('health_insurances').select('*').limit(1);
assert(allInsurance.error, 'SELECT * de convênios expôs colunas confidenciais');
console.log('OK: credenciais de convênios inacessíveis ao navegador');

const other = await client.from('clinics').select('id')
  .eq('id', process.env.HML_CLINIC_B_ID);
assert(!other.error && other.data?.length === 0,
  'Isolamento falhou: clínica B visível ao usuário da clínica A');
console.log('OK: clínica B invisível ao usuário da clínica A');

if (process.env.HML_PATIENT_B_ID) {
  const patient = await client.from('patients').select('id')
    .eq('id', process.env.HML_PATIENT_B_ID);
  assert(!patient.error && patient.data?.length === 0,
    'Isolamento falhou: paciente da clínica B visível para A');
  console.log('OK: paciente fictício da clínica B invisível');
}

const { error: signOutError } = await client.auth.signOut({ scope: 'global' });
assert(!signOutError, 'Logout falhou');
const after = await client.auth.getUser();
assert(after.error || !after.data.user, 'Sessão local ainda está ativa após logout');
console.log('OK: logout encerrou a sessão local');

if (process.env.HML_BLOCKED_A_USER && process.env.HML_BLOCKED_A_PASSWORD) {
  const denied = await client.functions.invoke('secure-login', {
    body: {
      clinicCode: process.env.HML_CLINIC_A_CODE,
      username: process.env.HML_BLOCKED_A_USER,
      password: process.env.HML_BLOCKED_A_PASSWORD,
    },
  });
  assert(denied.error || !denied.data?.access_token, 'Usuário inativo conseguiu entrar');
  console.log('OK: usuário inativo recusado');
}
