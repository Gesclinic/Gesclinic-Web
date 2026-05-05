// Exam Request System API
import { customSupabaseClient } from './customSupabaseClient';

const client = customSupabaseClient;

// Available exams catalog
const EXAM_CATALOG = [
  // Laboratorial
  { code: 'HEMOGRAMA', name: 'Hemograma', category: 'Laboratorial' },
  { code: 'GLICOSE', name: 'Glicose de Jejum', category: 'Laboratorial' },
  { code: 'TRIGLICERIDEOS', name: 'Triglicerídeos', category: 'Laboratorial' },
  { code: 'COLESTEROL', name: 'Colesterol Total', category: 'Laboratorial' },
  { code: 'TSH', name: 'TSH', category: 'Laboratorial' },
  { code: 'ACIDO_URICO', name: 'Ácido Úrico', category: 'Laboratorial' },
  { code: 'CREATININA', name: 'Creatinina', category: 'Laboratorial' },
  { code: 'SODIO_POTASSIO', name: 'Sódio/Potássio', category: 'Laboratorial' },
  { code: 'PROTEINA_C', name: 'Proteína C Reativa', category: 'Laboratorial' },
  { code: 'ALBUMINA', name: 'Albumina', category: 'Laboratorial' },
  { code: 'HEPATOGRAMA', name: 'Hepatograma', category: 'Laboratorial' },

  // Imagem
  { code: 'RAIO_X_TORAX', name: 'Raio-X de Tórax', category: 'Imagem' },
  { code: 'RAIO_X_COLUNA', name: 'Raio-X de Coluna', category: 'Imagem' },
  { code: 'ULTRASSOM_ABD', name: 'Ultrassom Abdominal', category: 'Imagem' },
  { code: 'ULTRASSOM_PELV', name: 'Ultrassom Pélvico', category: 'Imagem' },
  { code: 'ULTRASSOM_TIRO', name: 'Ultrassom Tireoide', category: 'Imagem' },
  { code: 'RESSONANCIA', name: 'Ressonância Magnética', category: 'Imagem' },
  { code: 'TOMOGRAFIA', name: 'Tomografia Computadorizada', category: 'Imagem' },
  { code: 'DENSITOMETRIA', name: 'Densitometria Óssea', category: 'Imagem' },
];

export const examRequestsApi = {
  // ==================== EXAM CATALOGS ====================

  getExamCatalog() {
    return EXAM_CATALOG;
  },

  getExamsByCategory(category) {
    return EXAM_CATALOG.filter((exam) => exam.category === category);
  },

  // ==================== TEMPLATES ====================

  async createTemplate(clinicId, templateName, exams, description = '', instructions = '', userId) {
    try {
      const { data, error } = await client
        .from('exam_request_templates')
        .insert([
          {
            clinic_id: clinicId,
            template_name: templateName,
            description,
            exams: exams, // array of exam codes
            instructions,
            is_active: true,
            created_by: userId,
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }
      return data;
    } catch (err) {
      throw new Error(`Erro ao criar template: ${err.message}`);
    }
  },

  async listTemplates(clinicId, onlyActive = true) {
    try {
      let query = client.from('exam_request_templates').select('*').eq('clinic_id', clinicId);

      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query.order('template_name');

      if (error) {
        throw error;
      }
      return data || [];
    } catch (err) {
      throw new Error(`Erro ao listar templates: ${err.message}`);
    }
  },

  async getTemplate(templateId) {
    try {
      const { data, error } = await client
        .from('exam_request_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) {
        throw error;
      }
      return data;
    } catch (err) {
      throw new Error(`Erro ao obter template: ${err.message}`);
    }
  },

  async deleteTemplate(templateId) {
    try {
      const { error } = await client
        .from('exam_request_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) {
        throw error;
      }
      return true;
    } catch (err) {
      throw new Error(`Erro ao deletar template: ${err.message}`);
    }
  },

  // ==================== EXAM REQUESTS ====================

  async createExamRequest(clinicId, patientId, exams, clinicalIndication, details = {}, userId) {
    try {
      const { data, error } = await client
        .from('exam_requests')
        .insert([
          {
            clinic_id: clinicId,
            patient_id: patientId,
            appointment_id: details.appointmentId || null,
            professional_id: details.professionalId || null,
            template_id: details.templateId || null,
            exams: exams,
            clinical_indication: clinicalIndication,
            priority: details.priority || 'normal',
            status: 'draft',
            created_by: userId,
          },
        ])
        .select();

      if (!data || data.length === 0) {
        throw new Error('Record not found');
      }
      return data[0];

      if (error) {
        throw error;
      }
      return data;
    } catch (err) {
      throw new Error(`Erro ao criar solicitação: ${err.message}`);
    }
  },

  async updateExamRequest(requestId, updates) {
    try {
      const { data, error } = await client
        .from('exam_requests')
        .update(updates)
        .eq('id', requestId)
        .select();

      if (!data || data.length === 0) {
        throw new Error('Record not found');
      }
      return data[0];

      if (error) {
        throw error;
      }
      return data;
    } catch (err) {
      throw new Error(`Erro ao atualizar solicitação: ${err.message}`);
    }
  },

  async getExamRequest(requestId) {
    try {
      const { data, error } = await client.from('exam_requests').select('*').eq('id', requestId);

      if (!data || data.length === 0) {
        throw new Error('Record not found');
      }
      return data[0];

      if (error) {
        throw error;
      }
      return data;
    } catch (err) {
      throw new Error(`Erro ao obter solicitação: ${err.message}`);
    }
  },

  async listExamRequests(clinicId, filters = {}) {
    try {
      let query = client.from('exam_requests').select('*').eq('clinic_id', clinicId);

      if (filters.patient_id) {
        query = query.eq('patient_id', filters.patient_id);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.appointment_id) {
        query = query.eq('appointment_id', filters.appointment_id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      return data || [];
    } catch (err) {
      throw new Error(`Erro ao listar solicitações: ${err.message}`);
    }
  },

  async sendExamRequest(requestId, sentToLab = '', labProtocol = '') {
    try {
      const { data, error } = await client
        .from('exam_requests')
        .update({
          status: 'sent',
          sent_date: new Date().toISOString(),
          sent_to_lab: sentToLab,
          lab_protocol: labProtocol,
        })
        .eq('id', requestId)
        .select();

      if (!data || data.length === 0) {
        throw new Error('Record not found');
      }
      return data[0];

      if (error) {
        throw error;
      }
      return data;
    } catch (err) {
      throw new Error(`Erro ao enviar solicitação: ${err.message}`);
    }
  },

  async completeExamRequest(requestId) {
    try {
      const { data, error } = await client
        .from('exam_requests')
        .update({
          status: 'completed',
          completed_date: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select();

      if (!data || data.length === 0) {
        throw new Error('Record not found');
      }
      return data[0];

      if (error) {
        throw error;
      }
      return data;
    } catch (err) {
      throw new Error(`Erro ao completar solicitação: ${err.message}`);
    }
  },

  async cancelExamRequest(requestId) {
    try {
      const { data, error } = await client
        .from('exam_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .select();

      if (!data || data.length === 0) {
        throw new Error('Record not found');
      }
      return data[0];

      if (error) {
        throw error;
      }
      return data;
    } catch (err) {
      throw new Error(`Erro ao cancelar solicitação: ${err.message}`);
    }
  },

  async recordPrint(requestId) {
    try {
      const { data: request } = await this.getExamRequest(requestId);
      const printedCount = (request?.printed_count || 0) + 1;

      const { data, error } = await client
        .from('exam_requests')
        .update({
          printed_count: printedCount,
          last_printed_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select();

      if (!data || data.length === 0) {
        throw new Error('Record not found');
      }
      return data[0];

      if (error) {
        throw error;
      }
      return data;
    } catch (err) {
      throw new Error(`Erro ao registrar impressão: ${err.message}`);
    }
  },

  async deleteExamRequest(requestId) {
    try {
      const { error } = await client.from('exam_requests').delete().eq('id', requestId);

      if (error) {
        throw error;
      }
      return true;
    } catch (err) {
      throw new Error(`Erro ao deletar solicitação: ${err.message}`);
    }
  },

  // ==================== STATUS HELPERS ====================

  getStatusLabel(status) {
    const labels = {
      draft: 'Rascunho',
      created: 'Criada',
      sent: 'Enviada',
      completed: 'Concluída',
      cancelled: 'Cancelada',
    };
    return labels[status] || status;
  },

  getStatusColor(status) {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      created: 'bg-blue-100 text-blue-800',
      sent: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  },

  getPriorityLabel(priority) {
    const labels = {
      low: 'Baixa',
      normal: 'Normal',
      high: 'Alta',
      urgent: 'Urgente',
    };
    return labels[priority] || priority;
  },
};

export default examRequestsApi;
