// src/pages/admin/JobMonitor.jsx
// Dashboard para monitorar tarefas agendadas

import React, { useState, useEffect } from 'react'
import { Clock, Play, RotateCw, CheckCircle, AlertCircle, Zap } from 'lucide-react'
import { useAuth } from '@/contexts/SupabaseAuthContext'
import { useClinicContext } from '@/contexts/ClinicContext'
import { customSupabaseClient } from '@/lib/customSupabaseClient'

export default function JobMonitor() {
  const { user } = useAuth()
  const { clinicId, loadingClinic } = useClinicContext()

  const [jobs, setJobs] = useState([])
  const [jobRuns, setJobRuns] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedJob, setSelectedJob] = useState(null)

  // Carregar tarefas ao montar o componente
  useEffect(() => {
    if (clinicId && !loadingClinic) {
      loadJobs()
    }
  }, [clinicId, loadingClinic])

  // Auto-atualizar a cada 10 segundos
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadJobs()
    }, 10000)

    return () => clearInterval(interval)
  }, [autoRefresh])

  const loadJobs = async () => {
    setIsLoading(true)
    try {
      // Buscar status das tarefas
      const { data: jobsData, error: jobsError } = await customSupabaseClient
        .from('v_job_status')
        .select('*')
        .order('job_name', { ascending: true })

      if (jobsError) throw jobsError
      setJobs(jobsData || [])

      // Buscar execuções recentes de cada tarefa
      if (jobsData && jobsData.length > 0) {
        const jobIds = jobsData.map(j => j.id)
        const { data: runsData, error: runsError } = await customSupabaseClient
          .from('job_runs')
          .select('*')
          .in('scheduled_job_id', jobIds)
          .order('started_at', { ascending: false })
          .limit(100)

        if (runsError) throw runsError

        // Agrupar por ID da tarefa
        const grouped = {}
        runsData?.forEach(run => {
          if (!grouped[run.scheduled_job_id]) {
            grouped[run.scheduled_job_id] = []
          }
          grouped[run.scheduled_job_id].push(run)
        })
        setJobRuns(grouped)
      }
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualTrigger = async (jobId) => {
    try {
      const { data, error } = await customSupabaseClient.rpc(
        'execute_scheduled_job',
        { p_job_id: jobId }
      )
      if (error) throw error

      console.log('Tarefa executada:', data)
      // Recarregar tarefas imediatamente
      await new Promise(resolve => setTimeout(resolve, 500))
      loadJobs()
    } catch (error) {
      console.error('Erro ao executar tarefa:', error)
      alert(`Erro: ${error.message}`)
    }
  }

  const getHealthIcon = (status) => {
    if (status.includes('Saudável')) return <CheckCircle className="w-5 h-5 text-green-600" />
    if (status.includes('Instável')) return <AlertCircle className="w-5 h-5 text-yellow-600" />
    if (status.includes('Falhando')) return <AlertCircle className="w-5 h-5 text-red-600" />
    return <Clock className="w-5 h-5 text-gray-400" />
  }

  // Mapear nomes de jobs em inglês para português
  const jobNameTranslations = {
    'check_alerts_every_15min': 'Verificar Alertas a Cada 15min',
    'process_emails_every_5min': 'Processar Emails a Cada 5min',
    'process_webhooks_every_10min': 'Processar Webhooks a Cada 10min',
    'process_sms_every_5min': 'Processar SMS a Cada 5min',
    'auto_resolve_alerts_daily': 'Resolver Alertas Automaticamente (Diariamente)'
  }

  const translateJobName = (name) => {
    return jobNameTranslations[name] || name
  }

  const formatTime = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('pt-BR')
  }

  const formatDuration = (ms) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Clock className="w-8 h-8 text-blue-600" />
            Monitor de Tarefas
          </h1>
          <p className="text-gray-600">Monitorar e controlar tarefas agendadas</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition ${
              autoRefresh
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <RotateCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-atualizar ATIVADO' : 'Auto-atualizar DESATIVADO'}
          </button>

          <button
            onClick={loadJobs}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400"
          >
            <Zap className="w-4 h-4 inline mr-1" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Grade de Tarefas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {jobs.map(job => (
          <div key={job.id} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            {/* Cabeçalho da Tarefa */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">{translateJobName(job.job_name)}</h3>
                <p className="text-sm text-gray-500">{job.job_type}</p>
              </div>
              <div className="flex items-center gap-2">
                {getHealthIcon(job.health_status)}
                <span className={`text-sm font-medium ${
                  job.health_status.includes('Saudável') ? 'text-green-600' :
                  job.health_status.includes('Instável') ? 'text-yellow-600' :
                  job.health_status.includes('Falhando') ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {job.health_status}
                </span>
              </div>
            </div>

            {/* Detalhes da Tarefa */}
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Cron:</span>
                <code className="font-mono bg-gray-100 px-2 py-1 rounded">{job.cron_expression}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Próxima execução:</span>
                <span className="font-mono">{formatTime(job.next_run_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Última execução:</span>
                <span className="font-mono">{formatTime(job.last_run_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-mono ${
                  job.last_status === 'success' ? 'text-green-600' :
                  job.last_status === 'failed' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {job.last_status || 'Nunca executado'}
                </span>
              </div>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-3 gap-2 mb-4 text-center p-3 bg-gray-50 rounded">
              <div>
                <p className="text-xs text-gray-600">Total</p>
                <p className="text-lg font-bold">{job.run_count}</p>
              </div>
              <div>
                <p className="text-xs text-green-600">Sucesso</p>
                <p className="text-lg font-bold text-green-600">{job.success_count}</p>
              </div>
              <div>
                <p className="text-xs text-red-600">Falha</p>
                <p className="text-lg font-bold text-red-600">{job.failure_count}</p>
              </div>
            </div>

            {/* Ações */}
            <button
              onClick={() => handleManualTrigger(job.id)}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Executar Agora
            </button>

            {/* Execuções Recentes */}
            {jobRuns[job.id] && jobRuns[job.id].length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-semibold text-gray-600 mb-2">Últimas Execuções:</p>
                <div className="space-y-1 max-h-32 overflow-y-auto text-xs">
                  {jobRuns[job.id].slice(0, 5).map(run => (
                    <div
                      key={run.id}
                      className={`p-2 rounded flex justify-between items-center ${
                        run.status === 'success'
                          ? 'bg-green-50 text-green-700'
                          : run.status === 'failed'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}
                    >
                      <span>{run.status.toUpperCase()}</span>
                      <span>{formatDuration(run.duration_ms)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Nenhuma Tarefa */}
      {jobs.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Nenhum job encontrado</p>
        </div>
      )}
    </div>
  )
}
