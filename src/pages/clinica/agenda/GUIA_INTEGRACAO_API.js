// GUIA PRÁTICO: COMPLETAR INTEGRAÇÃO SUPABASE
// ============================================

/**
 * Este arquivo contém instruções passo a passo para completar
 * a integração da Agenda com Supabase.
 *
 * Todos os "TODO" comentários no código apontam para estas seções.
 */

/**
 * 1️⃣ HANDLERS DE AÇÃO NO AgendaPage.jsx
 * ======================================
 *
 * Localização: src/pages/clinica/agenda/AgendaPage.jsx
 *
 * Implementar as 4 funções:
 *
 * a) handleSaveAppointment(formData)
 *    - Criar novo agendamento OU atualizar existente
 *    - API: appointmentsApi.createAppointment() ou updateAppointment()
 *    - Validar permissões (role não pode editar valor se recepcao)
 *    - Atualizar lista local com setAppointments()
 *    - Fechar modal após sucesso
 *
 * b) handleCancelAppointment(id)
 *    - Cancelar agendamento
 *    - Validar: role não pode cancelar se 'recepcao'
 *    - API: appointmentsApi.updateAppointment(id, { status: 'cancelado' })
 *    - Atualizar lista local
 *
 * c) handleConfirmAppointment(id)
 *    - Confirmar agendamento
 *    - API: appointmentsApi.updateAppointment(id, { status: 'confirmado' })
 *    - Atualizar lista local
 *
 * d) handleFittingAppointment(formData)
 *    - Criar encaixe (novo agendamento com status 'encaixe')
 *    - API: appointmentsApi.createAppointment({ ...formData, status: 'encaixe' })
 *    - Atualizar lista local
 *
 * Exemplo:
 *
 * const handleSaveAppointment = async (formData) => {
 *   try {
 *     // Validar permissões
 *     if (currentRole === 'recepcao' && formData.value !== undefined) {
 *       throw new Error('Recepção não pode editar valor');
 *     }
 *
 *     // Preparar dados
 *     const appointmentData = {
 *       clinic_id: clinicId,
 *       professional_id: formData.professional_id,
 *       room_id: formData.room_id,
 *       service_id: formData.service_id,
 *       patient_id: formData.patient_id,
 *       payer_id: formData.payer_id,
 *       start_time: `${formData.date}T${formData.time}:00`,
 *       status: formData.status,
 *       notes: formData.notes,
 *       value: formData.value,
 *     };
 *
 *     // Salvar
 *     if (agenda.selectedSlot?.id) {
 *       // Editar
 *       const updated = await appointmentsApi.updateAppointment(
 *         agenda.selectedSlot.id,
 *         appointmentData
 *       );
 *       agenda.updateAppointmentLocal(updated.id, updated);
 *     } else {
 *       // Criar
 *       const created = await appointmentsApi.createAppointment(appointmentData);
 *       agenda.addAppointmentLocal(created);
 *     }
 *   } catch (err) {
 *     console.error('Erro ao salvar:', err);
 *     throw err;
 *   }
 * };
 */

/**
 * 2️⃣ ATUALIZAR APPOINTMENTSAPI.JS
 * ================================
 *
 * Localização: src/lib/appointmentsApi.js
 *
 * A função listAppointments() já existe e funciona.
 * Adicionar estas funções:
 *
 * async function createAppointment(data)
 *   - Inserir novo agendamento
 *   - Validar clinic_id, professional_id, patient_id, date, time
 *   - Campos: clinic_id, professional_id, room_id, service_id, patient_id,
 *           payer_id, start_time, status, notes, value
 *   - Status default: 'a_confirmar'
 *   - Retornar agendamento criado com ID
 *
 * async function updateAppointment(id, updates)
 *   - Atualizar agendamento existente
 *   - Permitir atualizar: data, hora, profissional, sala, status, notas, etc
 *   - Validar que campo 'value' não é alterado se recepcao (no backend!)
 *   - Retornar agendamento atualizado
 *
 * async function deleteAppointment(id)
 *   - Deletar agendamento (ou soft-delete com is_active=false)
 *   - Retornar true/false
 *
 * Exemplo:
 *
 * export async function createAppointment(data) {
 *   if (!data.clinic_id || !data.patient_id) {
 *     throw new Error('clinic_id e patient_id são obrigatórios');
 *   }
 *
 *   const { data: result, error } = await supabase
 *     .from('appointments')
 *     .insert([{
 *       ...data,
 *       status: data.status || 'a_confirmar',
 *       created_at: new Date().toISOString(),
 *     }])
 *     .select()
 *     .single();
 *
 *   if (error) throw error;
 *   return result;
 * }
 */

/**
 * 3️⃣ VERIFICAR OUTRAS APIS
 * ==========================
 *
 * Verificar se estas APIs já existem e funcionam:
 *
 * ✅ appointmentsApi.listAppointments()     - JÁ EXISTE
 * ⭕ professionalsApi.list()                 - Verificar
 * ⭕ servicesApi.list()                      - Verificar
 * ⭕ payersApi.list()                        - Verificar
 * ⭕ patientsApi.list()                      - Verificar
 * ✅ roomsApi.list()                        - NOVO (criado)
 *
 * Se alguma não existir, criar seguindo padrão:
 * - Usar supabase.from('table').select().eq('clinic_id', clinicId)
 * - Ordenar por 'name'
 * - Retornar [] se erro
 */

/**
 * 4️⃣ VALIDAÇÃO DE PERMISSÕES
 * ============================
 *
 * Implementar nas APIs ANTES de salvar no banco:
 *
 * // No backend (Supabase RPC ou trigger):
 * IF (auth.jwt()->>'role' = 'recepcao' AND data.value IS NOT NULL)
 *   RAISE EXCEPTION 'Recepção não pode editar valor';
 * END IF;
 *
 * // No frontend (AppointmentModal.jsx):
 * canEdit = currentRole !== 'profissional'
 * canEditValue = currentRole !== 'recepcao' AND currentRole !== 'profissional'
 * canCancel = currentRole !== 'recepcao'
 */

/**
 * 5️⃣ FLUXO COMPLETO DE TESTE
 * ============================
 *
 * 1. Acessar /clinica/agenda
 * 2. Verificar se agendamentos carregam
 * 3. Verificar se indicadores calculam corretamente
 * 4. Mudar de aba (geral -> profissional -> sala)
 * 5. Aplicar filtros e verificar se agendamentos filtraram
 * 6. Clicar em slot vazio e abrir modal
 * 7. Preencher formulário e clicar "Salvar"
 * 8. Verificar se agendamento aparece na lista
 * 9. Clicar em agendamento existente
 * 10. Editar e salvar
 * 11. Testar "Confirmar" (deve mudar status)
 * 12. Testar "Cancelar" (deve mudar status)
 * 13. Testar com diferentes roles (recepcao, profissional, gestor, admin)
 * 14. Verificar se permissões são respeitadas
 */

/**
 * 6️⃣ ESTRUTURA DE DADOS ESPERADA
 * ================================
 *
 * Agendamento (appointments table):
 * {
 *   id: string (UUID),
 *   clinic_id: string,
 *   patient_id: string,
 *   professional_id: string,
 *   room_id: string,
 *   service_id: string,
 *   payer_id: string,
 *   start_time: timestamp,
 *   end_time: timestamp,
 *   status: enum ('confirmado', 'a_confirmar', 'faltou', 'encaixe', 'cancelado'),
 *   notes: text,
 *   value: decimal,
 *   created_at: timestamp,
 *   updated_at: timestamp,
 *   created_by: string,
 *   updated_by: string,
 * }
 *
 * View: view_agenda_completa_v6 (já existe)
 * Deve retornar todos os campos acima + nomes:
 * - patient_name
 * - professional_name
 * - service_name
 * - room_name
 */

/**
 * 7️⃣ PRÓXIMOS PASSOS APÓS CONCLUSÃO
 * ==================================
 *
 * 1. Adicionar notificações (toast) para ações
 * 2. Implementar histórico de alterações (Histórico tab)
 * 3. Adicionar busca avançada com mais filtros
 * 4. Implementar agendamento recorrente (semanal, mensal)
 * 5. Adicionar sincronização com calendários externos (Google Calendar, Outlook)
 * 6. Implementar SMS/Email de confirmação
 * 7. Dashboard com relatórios de agendamentos
 * 8. Mobile app com sincronização em tempo real
 */

export {};
