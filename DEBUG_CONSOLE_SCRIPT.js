// Copie e cole este código no console do navegador (F12) para debugar os dados

console.log('=== VERIFICAÇÃO DE DADOS DA AGENDA ===\n');

// Teste 1: Verificar se AppointmentsAPI está disponível
try {
  console.log('📦 Módulos disponíveis:');
  // Tentar importar é complicado, então vamos verificar window
  console.log('  window.appointmentsApi:', typeof window.appointmentsApi);
} catch (e) {
  console.log('  (módulos não estão globais, isso é normal)');
}

// Teste 2: Verificar dados no Redux/Store (se disponível)
try {
  const store = window.__REDUX_DEVTOOLS_EXTENSION__;
  if (store) {
    console.log('✅ Redux DevTools detectado');
  } else {
    console.log('⚠️ Redux DevTools não detectado');
  }
} catch (e) {
  console.log('⚠️ Sem Redux:', e.message);
}

// Teste 3: Inspecionar localStorage
console.log('\n🔍 Cache local:');
const cacheKeys = Object.keys(localStorage).filter(k => 
  k.includes('agenda') || k.includes('appointment') || k.includes('clinic')
);
console.log('  Chaves encontradas:', cacheKeys.length > 0 ? cacheKeys : 'nenhuma');

// Teste 4: Verificar se há query strings na URL
console.log('\n📍 URL atual:', window.location.href);

// Teste 5: Verificar React DevTools (se instalado)
console.log('\n🔧 DevTools:');
console.log('  React DevTools:', window.__REACT_DEVTOOLS_GLOBAL_HOOK__ ? '✅' : '⚠️ Não detectado');

// Teste 6: Exemplo de log para monitorar chamadas
console.log('\n📡 Para monitorar as chamadas de API:');
console.log(`
Abra a aba "Network" do F12 e filtre por:
  - "appointments" (chamadas de agendamentos)
  - "professionals" (para profissionais)
  - "services" (para serviços)

Verifique se as respostas JSON contêm os campos:
  - patientName / patient_name
  - professionalName / professional_name  
  - serviceName / service_name
`);

// Teste 7: Simular uma chamada (precisa estar logado)
console.log('\n⚡ Para testar a API diretamente:');
console.log(`
// No console, copie e cole (após fazer login):
// Nota: Isso só funciona se você tiver acesso à API

// 1. Obter clinicId do contexto (procure uma forma no seu app)
// 2. Fazer uma chamada manual
const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(new Date().getTime() + 24*60*60*1000).toISOString().split('T')[0];

// Se a API estiver acessível globalmente:
// const result = await window.api.listAppointments({
//   clinicId: 'SEU_CLINIC_ID',
//   start: today,
//   end: tomorrow
// });
// console.log('Resultado:', result);
`);

console.log('\n✅ Verificação concluída!');
