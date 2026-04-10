// src/utils/agendaStatusStyles.js
// Função utilitária para obter estilos de cor conforme status do agendamento

export function getStatusStyles(status) {
  // Cores podem ser customizadas por clínica futuramente
  const map = {
    agendado:      { background: '#e3f0ff', color: '#174ea6' }, // azul claro
    confirmado:    { background: '#d1f7d6', color: '#1b5e20' }, // verde claro
    em_atendimento:{ background: '#fff9db', color: '#b28704' }, // amarelo claro
    atendido:      { background: '#ececec', color: '#444' },    // cinza claro
    cancelado:     { background: '#ffe3e3', color: '#b71c1c' }, // vermelho claro
    faltou:        { background: '#ffeacc', color: '#b26a00' }, // laranja claro
    bloqueado:     { background: '#b0b0b0', color: '#fff' },    // cinza escuro
  };
  return map[status] || { background: '#f8fafc', color: '#222' };
}
