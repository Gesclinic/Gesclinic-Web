// src/lib/emailService.js
// Serviço para gerenciar logs de email e rastreamento de entrega

import { customSupabaseClient } from './customSupabaseClient'

const supabase = customSupabaseClient

/**
 * Obter histórico de emails de um alerta
 */
export const getAlertEmailLogs = async (notificationId) => {
  try {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .eq('notification_id', notificationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao buscar logs de email:', error)
    return []
  }
}

/**
 * Obter logs de email por clínica (para analytics)
 */
export const getClinicEmailLogs = async (clinicId, options = {}) => {
  try {
    const {
      status = null,
      limit = 100,
      offset = 0,
      startDate = null,
      endDate = null,
    } = options

    let query = supabase
      .from('email_logs')
      .select('*')
      .eq('clinic_id', clinicId)

    if (status) {
      query = query.eq('delivery_status', status)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Erro ao buscar logs de email da clínica:', error)
    return []
  }
}

/**
 * Obter estatísticas de email
 */
export const getEmailStats = async (clinicId) => {
  try {
    const { data, error } = await supabase
      .from('email_logs')
      .select('delivery_status')
      .eq('clinic_id', clinicId)

    if (error) throw error

    const stats = {
      total: data?.length || 0,
      sent: data?.filter(e => e.delivery_status === 'sent').length || 0,
      delivered: data?.filter(e => e.delivery_status === 'delivered').length || 0,
      failed: data?.filter(e => e.delivery_status === 'failed').length || 0,
      pending: data?.filter(e => e.delivery_status === 'pending').length || 0,
      bounced: data?.filter(e => e.delivery_status === 'bounced').length || 0,
    }

    stats.deliveryRate =
      stats.total > 0 ? Math.round(((stats.delivered / stats.total) * 100)) : 0

    return stats
  } catch (error) {
    console.error('Erro ao buscar estatísticas de email:', error)
    return {
      total: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      bounced: 0,
      deliveryRate: 0,
    }
  }
}

/**
 * Obter templates de email
 */
export const getEmailTemplates = async (clinicId = null) => {
  try {
    let query = supabase
      .from('email_templates')
      .select('*')
      .eq('is_active', true)

    if (clinicId) {
      // Templates personalizados + globais
      const { data, error } = await query
        .or(`clinic_id.eq.${clinicId},clinic_id.is.null`)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } else {
      // Apenas templates globais
      const { data, error } = await query
        .is('clinic_id', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    }
  } catch (error) {
    console.error('Erro ao buscar templates de email:', error)
    return []
  }
}

/**
 * Criar template de email personalizado
 */
export const createEmailTemplate = async (clinicId, templateData) => {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .insert([
        {
          clinic_id: clinicId,
          template_name: templateData.template_name,
          subject_template: templateData.subject_template,
          body_html: templateData.body_html,
          body_text: templateData.body_text,
          variables: templateData.variables,
          is_active: true,
        },
      ])
      .select()

    if (error) throw error
    return data?.[0]
  } catch (error) {
    console.error('Erro ao criar template de email:', error)
    return null
  }
}

/**
 * Atualizar template de email
 */
export const updateEmailTemplate = async (templateId, updates) => {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .select()

    if (error) throw error
    return data?.[0]
  } catch (error) {
    console.error('Erro ao atualizar template de email:', error)
    return null
  }
}

/**
 * Disparar processamento de emails pendentes via Edge Function
 */
export const triggerEmailProcessing = async () => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-alert-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.auth.session?.access_token || ''}`,
        },
      }
    )

    const result = await response.json()
    console.log('Email processing triggered:', result)
    return result.success
  } catch (error) {
    console.error('Erro ao disparar processamento de emails:', error)
    return false
  }
}

/**
 * Obter taxa de entrega de emails por dia (para gráfico)
 */
export const getEmailDeliveryTrend = async (clinicId, days = 7) => {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('email_logs')
      .select('created_at, delivery_status')
      .eq('clinic_id', clinicId)
      .gte('created_at', startDate.toISOString())

    if (error) throw error

    // Agrupar por data
    const trend = {}
    data?.forEach(log => {
      const date = new Date(log.created_at).toLocaleDateString('pt-BR')
      if (!trend[date]) {
        trend[date] = { total: 0, delivered: 0 }
      }
      trend[date].total += 1
      if (log.delivery_status === 'delivered') {
        trend[date].delivered += 1
      }
    })

    // Converter para array e calcular taxa
    return Object.entries(trend).map(([date, stats]) => ({
      date,
      total: stats.total,
      delivered: stats.delivered,
      rate: Math.round((stats.delivered / stats.total) * 100),
    }))
  } catch (error) {
    console.error('Erro ao buscar tendência de entrega:', error)
    return []
  }
}

/**
 * Resend email (retry manual)
 */
export const resendEmail = async (emailLogId) => {
  try {
    const { data, error } = await supabase
      .from('email_logs')
      .update({
        delivery_status: 'pending',
        retry_count: 0,
        next_retry_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', emailLogId)
      .select()

    if (error) throw error

    // Disparar reprocessamento
    await triggerEmailProcessing()

    return data?.[0]
  } catch (error) {
    console.error('Erro ao reenviar email:', error)
    return null
  }
}

/**
 * Formatação de status para exibição
 */
export const formatEmailStatus = (status) => {
  const statusMap = {
    pending: '⏳ Pendente',
    sent: '✉️ Enviado',
    delivered: '✅ Entregue',
    failed: '❌ Falha',
    bounced: '↩️ Rejeitado',
  }
  return statusMap[status] || status
}

/**
 * Subscribe to email status updates via Realtime
 */
export const subscribeToEmailStatus = (clinicId, callback) => {
  const subscription = supabase
    .channel(`email-status:${clinicId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'email_logs',
        filter: `clinic_id=eq.${clinicId}`,
      },
      callback
    )
    .subscribe()

  return () => subscription.unsubscribe()
}

// ========== EMAIL REPORTING & SCHEDULING ==========

/**
 * Email scheduling configuration (localStorage)
 */
const EMAIL_SCHEDULE_STORAGE_KEY = 'gesclinic_email_schedules'

export const getEmailSchedules = () => {
  const stored = localStorage.getItem(EMAIL_SCHEDULE_STORAGE_KEY)
  return stored ? JSON.parse(stored) : []
}

export const saveEmailSchedule = (schedule) => {
  const schedules = getEmailSchedules()
  const newSchedule = {
    id: Date.now(),
    ...schedule,
    created_at: new Date().toISOString(),
    status: 'active',
  }
  schedules.push(newSchedule)
  localStorage.setItem(EMAIL_SCHEDULE_STORAGE_KEY, JSON.stringify(schedules))
  return newSchedule
}

export const deleteEmailSchedule = (scheduleId) => {
  const schedules = getEmailSchedules()
  const filtered = schedules.filter((s) => s.id !== scheduleId)
  localStorage.setItem(EMAIL_SCHEDULE_STORAGE_KEY, JSON.stringify(filtered))
  return filtered
}

export const updateEmailSchedule = (scheduleId, updates) => {
  const schedules = getEmailSchedules()
  const updated = schedules.map((s) =>
    s.id === scheduleId ? { ...s, ...updates } : s
  )
  localStorage.setItem(EMAIL_SCHEDULE_STORAGE_KEY, JSON.stringify(updated))
  return updated.find((s) => s.id === scheduleId)
}

/**
 * Send report email via Supabase Edge Function
 */
export const sendReportEmail = async (emailConfig) => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-report`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          to: emailConfig.to,
          recipient_name: emailConfig.recipient_name,
          clinic_id: emailConfig.clinic_id,
          clinic_name: emailConfig.clinic_name,
          report_type: emailConfig.report_type || 'financial',
          attach_pdf: emailConfig.attach_pdf !== false,
          attach_excel: emailConfig.attach_excel !== false,
          dashboardData: emailConfig.dashboardData,
        }),
      }
    )

    if (!response.ok) {
      const result = await response.json().catch(() => null)
      throw new Error(result?.error || `Edge Function error: ${response.status}`)
    }

    const result = await response.json()
    return { success: true, email_id: result.email_id, message: 'Email enviado com sucesso' }
  } catch (error) {
    console.error('[sendReportEmail] Erro:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Schedule recurring email reports via Supabase Edge Function
 */
export const scheduleEmailReport = async (scheduleConfig) => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    const response = await fetch(
      `${supabaseUrl}/functions/v1/schedule-report`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          to: scheduleConfig.to,
          recipient_name: scheduleConfig.recipient_name,
          clinic_id: scheduleConfig.clinic_id,
          clinic_name: scheduleConfig.clinic_name,
          frequency: scheduleConfig.frequency,
          attach_pdf: scheduleConfig.attach_pdf !== false,
          attach_excel: scheduleConfig.attach_excel !== false,
          action: 'create',
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Edge Function error: ${response.status}`)
    }

    const result = await response.json()
    return {
      success: true,
      schedule_id: result.schedule?.[0]?.id,
      message: `Relatório agendado para ${scheduleConfig.frequency}`,
    }
  } catch (error) {
    console.error('[scheduleEmailReport] Erro:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Email frequency presets
 */
export const EMAIL_FREQUENCIES = {
  daily: { label: 'Diariamente', cron: '0 8 * * *' },
  weekly: { label: 'Semanalmente (Segunda)', cron: '0 8 * * 1' },
  biweekly: { label: 'Quinzenalmente', cron: '0 8 1,15 * *' },
  monthly: { label: 'Mensalmente (1º dia)', cron: '0 8 1 * *' },
  custom: { label: 'Customizado', cron: null },
}
export const subscribeToEmailLogs = (clinicId, callback) => {
  try {
    const channel = supabase
      .channel(`email_logs:clinic_id=eq.${clinicId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_logs',
          filter: `clinic_id=eq.${clinicId}`,
        },
        payload => {
          console.log('Email log updated:', payload)
          callback(payload)
        }
      )
      .subscribe()

    return channel
  } catch (error) {
    console.error('Erro ao inscrever em atualizações de email:', error)
    return null
  }
}

export default {
  getAlertEmailLogs,
  getClinicEmailLogs,
  getEmailStats,
  getEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  triggerEmailProcessing,
  getEmailDeliveryTrend,
  resendEmail,
  formatEmailStatus,
  subscribeToEmailLogs,
}
