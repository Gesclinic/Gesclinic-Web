// Discount Approvals / Gestão Administrativa API
import { customSupabaseClient } from './customSupabaseClient';

const client = customSupabaseClient;

const discountApprovalsApi = {
  // ==================== DISCOUNT AUTHORIZATIONS ====================

  async createDiscountAuthorization(clinicId, appointmentId, discountAmount, reason, notes = '', userId) {
    try {
      // Verificar se tabela existe ou usar appointments
      const { data, error } = await client
        .from('appointments')
        .select('id, discount')
        .eq('id', appointmentId)
        .eq('clinic_id', clinicId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // Se tabela discount_authorizations existir, criar registro
      try {
        const { data: auth, error: authError } = await client
          .from('discount_authorizations')
          .insert([
            {
              clinic_id: clinicId,
              appointment_id: appointmentId,
              discount_amount: parseFloat(discountAmount),
              discount_reason: reason,
              notes,
              requested_by: userId,
              status: 'pending',
              created_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (!authError) return auth;
      } catch (e) {
        // Tabela pode não existir, continuar
      }

      // Atualizar appointment com desconto
      const { data: updated, error: updateError } = await client
        .from('appointments')
        .update({
          discount: parseFloat(discountAmount),
          discount_reason: reason,
          discount_authorized_by: null,  // ✅ Null indica PENDENTE
          discount_authorized_at: null,  // ✅ Sem data = ainda não aprovado
          updated_at: new Date().toISOString()
        }).eq('id', appointmentId).select();

if (!data || data.length === 0) { throw new Error('Record not found'); }
return data[0];

      if (updateError) throw updateError;
      return updated;
    } catch (err) {
      throw new Error(`Erro ao criar autorização de desconto: ${err.message}`);
    }
  },

  async listDiscountAuthorizations(clinicId, filters = {}) {
    try {
      // Tentar buscar de discount_authorizations se existir
      try {
        let query = client
          .from('discount_authorizations')
          .select('*')
          .eq('clinic_id', clinicId);

        if (filters.status) query = query.eq('status', filters.status);
        if (filters.from_date) query = query.gte('approved_at', filters.from_date);
        if (filters.to_date) query = query.lte('approved_at', filters.to_date);
        if (filters.appointment_id) query = query.eq('appointment_id', filters.appointment_id);

        const { data, error } = await query.order('approved_at', { ascending: false });

        if (!error && data) return data;
      } catch (e) {
        // Tabela não existe
      }

      // Fallback: buscar appointments com desconto
      const { data, error } = await client
        .from('appointments')
        .select(`
          id, 
          patient_id, 
          professional_id,
          service_id,
          payer_id,
          scheduled_date, 
          discount, 
          discount_reason, 
          discount_authorized_by, 
          discount_authorized_at, 
          created_at,
          patients(name),
          professionals(name),
          services(name),
          payers(name)
        `)
        .eq('clinic_id', clinicId)
        .gt('discount', 0)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('⚠️ Erro ao buscar com JOINs, tentando sem JOINs:', error.message);
        
        // Fallback final: buscar sem JOINs
        const { data: simpleData, error: simpleError } = await client
          .from('appointments')
          .select(`
            id, 
            patient_id, 
            professional_id,
            service_id,
            payer_id,
            scheduled_date, 
            discount, 
            discount_reason, 
            discount_authorized_by, 
            discount_authorized_at, 
            created_at
          `)
          .eq('clinic_id', clinicId)
          .gt('discount', 0)
          .order('created_at', { ascending: false });

        if (simpleError) throw simpleError;

        return (simpleData || []).map(apt => ({
          id: apt.id,
          appointment_id: apt.id,
          clinic_id: clinicId,
          discount_amount: apt.discount,
          discount_reason: apt.discount_reason || 'Sem motivo',
          patient_name: 'Paciente',
          professional_name: 'Profissional',
          service_name: 'Serviço',
          payer_name: 'Convênio',
          status: apt.discount_authorized_by ? 'approved' : 'pending',
          approved_at: apt.discount_authorized_at || apt.created_at,
          approved_by: apt.discount_authorized_by,
          notes: ''
        }));
      }

      return (data || []).map(apt => ({
        id: apt.id,
        appointment_id: apt.id,
        clinic_id: clinicId,
        discount_amount: apt.discount,
        discount_reason: apt.discount_reason || 'Sem motivo',
        patient_name: apt.patients?.name || 'Paciente',
        professional_name: apt.professionals?.name || 'Profissional',
        service_name: apt.services?.name || 'Serviço',
        payer_name: apt.payers?.name || 'Convênio',
        status: apt.discount_authorized_by ? 'approved' : 'pending',
        approved_at: apt.discount_authorized_at || apt.created_at,
        approved_by: apt.discount_authorized_by,
        notes: ''
      }));
    } catch (err) {
      throw new Error(`Erro ao listar autorizações de desconto: ${err.message}`);
    }
  },

  async getDiscountAuthorizationById(authorizationId) {
    try {
      try {
        const { data, error } = await client
          .from('discount_authorizations')
          .select('*')
          .eq('id', authorizationId);

if (!data || data.length === 0) { throw new Error('Record not found'); }
return data[0];

        if (!error && data) return data;
      } catch (e) {
        // Tabela não existe
      }

      const { data, error } = await client
        .from('appointments')
        .select('*')
        .eq('id', authorizationId)
        .gt('discount', 0);

if (!data || data.length === 0) { throw new Error('Record not found'); }
return data[0];

      if (error) throw error;

      return {
        id: data.id,
        appointment_id: data.id,
        discount_amount: data.discount,
        discount_reason: data.discount_reason,
        status: 'approved',
        approved_at: data.created_at
      };
    } catch (err) {
      throw new Error(`Erro ao obter autorização: ${err.message}`);
    }
  },

  async updateDiscountAuthorization(authorizationId, updates) {
    try {
      try {
        const { data, error } = await client
          .from('discount_authorizations')
          .update(updates).eq('id', authorizationId).select();

    if (!data || data.length === 0) {
      throw new Error('Record not found'); 
    }
    return data[0];

        if (!error && data) return data;
      } catch (e) {
        // Tabela não existe
      }

      // Fallback: atualizar appointment
      const { data, error } = await client
        .from('appointments')
        .update({
          discount: updates.discount_amount || 0,
          discount_reason: updates.discount_reason || null
        }).eq('id', authorizationId).select();

    if (!data || data.length === 0) {
      throw new Error('Record not found'); 
    }
    return data[0];

      if (error) throw error;
      return data;
    } catch (err) {
      throw new Error(`Erro ao atualizar autorização: ${err.message}`);
    }
  },

  async removeDiscount(appointmentId) {
    try {
      const { data, error } = await client
        .from('appointments')
        .update({
          discount: 0,
          discount_reason: null
        }).eq('id', appointmentId).select();

    if (!data || data.length === 0) {
      throw new Error('Record not found'); 
    }
    return data[0];

      if (error) throw error;
      return data;
    } catch (err) {
      throw new Error(`Erro ao remover desconto: ${err.message}`);
    }
  },

  async approveDiscount(appointmentId, userId) {
    try {
      // Tentar atualizar discount_authorizations
      try {
        const { error } = await client
          .from('discount_authorizations')
          .update({
            status: 'approved',
            approved_by: userId,
            approved_at: new Date().toISOString()
          })
          .eq('appointment_id', appointmentId);

        if (!error) return;
      } catch (e) {
        // Tabela não existe
      }

      // Fallback: atualizar appointments
      const { data, error } = await client
        .from('appointments')
        .update({
          discount_authorized_by: userId,
          discount_authorized_at: new Date().toISOString()
        })
        .eq('id', appointmentId).select();

if (!data || data.length === 0) { throw new Error('Record not found'); }
return data[0];

      if (error) throw error;
      return data;
    } catch (err) {
      throw new Error(`Erro ao aprovar desconto: ${err.message}`);
    }
  },

  async rejectDiscount(appointmentId) {
    try {
      // Tentar atualizar discount_authorizations
      try {
        const { error } = await client
          .from('discount_authorizations')
          .update({
            status: 'rejected',
            rejected_at: new Date().toISOString()
          })
          .eq('appointment_id', appointmentId);

        if (!error) return;
      } catch (e) {
        // Tabela não existe
      }

      // Fallback: remover desconto
      const { data, error } = await client
        .from('appointments')
        .update({
          discount: 0,
          discount_reason: null,
          discount_authorized_by: null,
          discount_authorized_at: null
        }).eq('id', appointmentId).select();

    if (!data || data.length === 0) {
      throw new Error('Record not found'); 
    }
    return data[0];

      if (error) throw error;
      return data;
    } catch (err) {
      throw new Error(`Erro ao rejeitar desconto: ${err.message}`);
    }
  },

  async cancelDiscount(appointmentId) {
    try {
      // Tentar atualizar discount_authorizations
      try {
        const { error } = await client
          .from('discount_authorizations')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
          })
          .eq('appointment_id', appointmentId);

        if (!error) return;
      } catch (e) {
        // Tabela não existe
      }

      // Fallback: remover desconto e dados de aprovação
      const { data, error } = await client
        .from('appointments')
        .update({
          discount: 0,
          discount_reason: null,
          discount_authorized_by: null,
          discount_authorized_at: null
        }).eq('id', appointmentId).select();

    if (!data || data.length === 0) {
      throw new Error('Record not found'); 
    }
    return data[0];

      if (error) throw error;
      return data;
    } catch (err) {
      throw new Error(`Erro ao cancelar desconto: ${err.message}`);
    }
  },

  // ==================== ANALYTICS ====================

  async getDiscountSummary(clinicId, startDate, endDate) {
    try {
      const { data, error } = await client
        .from('appointments')
        .select('discount, discount_reason, scheduled_date')
        .eq('clinic_id', clinicId)
        .gt('discount', 0)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate);

      if (error) throw error;

      const summary = {
        totalDiscounts: 0,
        countDiscounts: 0,
        averageDiscount: 0,
        byReason: {},
        topReasons: []
      };

      (data || []).forEach(apt => {
        const amount = parseFloat(apt.discount) || 0;
        summary.totalDiscounts += amount;
        summary.countDiscounts += 1;

        const reason = apt.discount_reason || 'Sem motivo';
        if (!summary.byReason[reason]) {
          summary.byReason[reason] = { count: 0, total: 0 };
        }
        summary.byReason[reason].count += 1;
        summary.byReason[reason].total += amount;
      });

      if (summary.countDiscounts > 0) {
        summary.averageDiscount = summary.totalDiscounts / summary.countDiscounts;
      }

      // Top 5 reasons
      summary.topReasons = Object.entries(summary.byReason)
        .map(([reason, data]) => ({ reason, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      return summary;
    } catch (err) {
      throw new Error(`Erro ao gerar resumo de descontos: ${err.message}`);
    }
  },

  // ==================== STATUS HELPERS ====================

  getStatusLabel(status) {
    const labels = {
      approved: 'Aprovado',
      pending: 'Pendente',
      rejected: 'Rejeitado',
      cancelled: 'Cancelado'
    };
    return labels[status] || status;
  },

  getStatusColor(status) {
    const colors = {
      approved: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  },

  // ==================== APPROVE/REJECT AUTHORIZATIONS ====================
  async approveDiscountAuthorization(authorizationId, appointmentId, approvedByUserId) {
    try {
      const now = new Date().toISOString();

      // Tentar atualizar em discount_authorizations se existir
      try {
        const { data, error } = await client
          .from('discount_authorizations')
          .update({
            status: 'approved',
            approved_at: now,
            approved_by: approvedByUserId
          })
          .eq('id', authorizationId)
          .select()
          .single();

        if (!error && data) {
          // Também atualizar appointment com a data de aprovação
          if (appointmentId) {
            await client
              .from('appointments')
              .update({
                discount_authorized_at: now,
                discount_authorized_by: approvedByUserId
              })
              .eq('id', appointmentId);
          }
          return data;
        }
      } catch (e) {
        // Tabela não existe
      }

      // Fallback: atualizar apenas appointment
      const { data, error } = await client
        .from('appointments')
        .update({
          discount_authorized_at: now,
          discount_authorized_by: approvedByUserId
        })
        .eq('id', appointmentId || authorizationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      throw new Error(`Erro ao aprovar autorização: ${err.message}`);
    }
  },

  async rejectDiscountAuthorization(authorizationId, appointmentId, rejectionReason = '') {
    try {
      const now = new Date().toISOString();

      // Tentar atualizar em discount_authorizations se existir
      try {
        const { data, error } = await client
          .from('discount_authorizations')
          .update({
            status: 'rejected',
            rejected_at: now,
            rejection_reason: rejectionReason
          })
          .eq('id', authorizationId)
          .select()
          .single();

        if (!error && data) {
          // Também limpar desconto no appointment
          if (appointmentId) {
            await client
              .from('appointments')
              .update({
                discount: 0,
                discount_reason: null,
                discount_authorized_by: null,
                discount_authorized_at: null
              })
              .eq('id', appointmentId);
          }
          return data;
        }
      } catch (e) {
        // Tabela não existe
      }

      // Fallback: limpar desconto no appointment
      const { data, error } = await client
        .from('appointments')
        .update({
          discount: 0,
          discount_reason: null,
          discount_authorized_by: null,
          discount_authorized_at: null
        })
        .eq('id', appointmentId || authorizationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      throw new Error(`Erro ao rejeitar autorização: ${err.message}`);
    }
  }
};

export default discountApprovalsApi;
