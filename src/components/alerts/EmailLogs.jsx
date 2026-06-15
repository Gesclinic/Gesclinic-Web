// src/components/alerts/EmailLogs.jsx
// Componente para visualizar e gerenciar logs de email

import React, { useState, useEffect } from 'react'
import {
  Mail,
  MailCheck,
  MailX,
  Clock,
  RotateCcw,
  Filter,
  Calendar,
  TrendingUp,
  Eye,
} from 'lucide-react'
import { useAuth } from '@/contexts/SupabaseAuthContext'
import { useClinicContext } from '@/contexts/ClinicContext'
import emailService from '@/lib/emailService'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function EmailLogs() {
  const { user } = useAuth()
  const { clinicId, loadingClinic } = useClinicContext()

  const [emailLogs, setEmailLogs] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    pending: 0,
    bounced: 0,
    deliveryRate: 0,
  })
  const [trend, setTrend] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [showTrend, setShowTrend] = useState(false)

  // Carregar dados
  useEffect(() => {
    if (clinicId && !loadingClinic) {
      loadEmailData()
      
      // Auto-refresh a cada 30 segundos
      const interval = setInterval(loadEmailData, 30000)
      return () => clearInterval(interval)
    }
  }, [clinicId, loadingClinic])

  const loadEmailData = async () => {
    setIsLoading(true)
    try {
      // Carregar logs
      const logs = await emailService.getClinicEmailLogs(clinicId, {
        status: filterStatus === 'all' ? null : filterStatus,
        limit: 50,
      })
      setEmailLogs(logs)

      // Carregar estatísticas
      const emailStats = await emailService.getEmailStats(clinicId)
      setStats(emailStats)

      // Carregar tendência
      const emailTrend = await emailService.getEmailDeliveryTrend(clinicId, 7)
      setTrend(emailTrend)
    } catch (error) {
      console.error('Erro ao carregar dados de email:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendEmail = async (emailLogId) => {
    try {
      await emailService.resendEmail(emailLogId)
      await loadEmailData()
      alert('Email marcado para reenvio!')
    } catch (error) {
      console.error('Erro ao reenviar email:', error)
      alert('Erro ao reenviar email')
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <MailCheck className="w-4 h-4 text-blue-600" />
      case 'delivered':
        return <MailCheck className="w-4 h-4 text-green-600" />
      case 'failed':
        return <MailX className="w-4 h-4 text-red-600" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />
      case 'bounced':
        return <MailX className="w-4 h-4 text-orange-600" />
      default:
        return <Mail className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-50 border-l-4 border-blue-500'
      case 'delivered':
        return 'bg-green-50 border-l-4 border-green-500'
      case 'failed':
        return 'bg-red-50 border-l-4 border-red-500'
      case 'pending':
        return 'bg-yellow-50 border-l-4 border-yellow-500'
      case 'bounced':
        return 'bg-orange-50 border-l-4 border-orange-500'
      default:
        return 'bg-gray-50 border-l-4 border-gray-500'
    }
  }

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold">Logs de Email</h2>
            <p className="text-sm text-gray-600">Rastreamento de entrega de alertas por email</p>
          </div>
        </div>
        <button
          onClick={loadEmailData}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Carregando...' : 'Atualizar'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-xs text-gray-600">Total</div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
          <div className="text-xs text-gray-600">Entregues</div>
        </div>
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-xs text-gray-600">Pendentes</div>
        </div>
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          <div className="text-xs text-gray-600">Falhados</div>
        </div>
        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
          <div className="text-2xl font-bold text-orange-600">{stats.bounced}</div>
          <div className="text-xs text-gray-600">Rejeitados</div>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="text-2xl font-bold text-purple-600">{stats.deliveryRate}%</div>
          <div className="text-xs text-gray-600">Taxa Entrega</div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-gray-50 rounded-lg p-4">
        <button
          onClick={() => setShowTrend(!showTrend)}
          className="flex items-center gap-2 mb-4 text-blue-600 hover:text-blue-700 font-semibold"
        >
          <TrendingUp className="w-4 h-4" />
          {showTrend ? 'Ocultar' : 'Mostrar'} Tendência (7 dias)
        </button>

        {showTrend && trend.length > 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                name="Total Enviados"
              />
              <Line
                type="monotone"
                dataKey="delivered"
                stroke="#10b981"
                name="Entregues"
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#8b5cf6"
                name="Taxa (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'sent', 'delivered', 'failed', 'bounced'].map(status => (
          <button
            key={status}
            onClick={() => {
              setFilterStatus(status)
              setEmailLogs([])
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {status === 'all' ? 'Todos' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Email Logs Table */}
      <div className="space-y-2">
        {emailLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Mail className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Nenhum log de email encontrado</p>
          </div>
        ) : (
          emailLogs.map(log => (
            <div
              key={log.id}
              className={`p-4 rounded-lg ${getStatusColor(log.delivery_status)}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(log.delivery_status)}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {log.subject}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      Para: {log.recipient_email}
                    </p>
                    <p className="text-xs text-gray-600">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </p>
                    {log.error_message && (
                      <p className="text-xs text-red-600 mt-1">
                        Erro: {log.error_message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-1 bg-white rounded whitespace-nowrap">
                    {log.delivery_status === 'pending'
                      ? `Tentativa ${log.retry_count + 1}/${log.max_retries}`
                      : emailService.formatEmailStatus(log.delivery_status).split(' ')[0]}
                  </span>
                  {log.delivery_status === 'failed' && (
                    <button
                      onClick={() => handleResendEmail(log.id)}
                      className="p-2 hover:bg-white rounded-lg transition"
                      title="Reenviar"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
