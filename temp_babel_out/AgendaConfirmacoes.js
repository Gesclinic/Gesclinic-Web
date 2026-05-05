import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import { supabase } from '@/lib/customSupabaseClient';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
export default function AgendaConfirmacoes() {
  const {
    user
  } = useAuth();
  const {
    clinicId
  } = useClinicContext();
  const [loading, setLoading] = useState(true);
  const [confirmations, setConfirmations] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    rejected: 0
  });
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'confirmed', 'rejected'

  // Buscar dados de confirmações
  useEffect(() => {
    if (!clinicId) return;
    const loadConfirmations = async () => {
      setLoading(true);
      try {
        // 1. Buscar confirmações
        const {
          data: confirmationsData,
          error: confirmError
        } = await supabase.from('appointment_confirmations').select(`
            id,
            appointment_id,
            clinic_id,
            confirmation_token,
            message_sent_at,
            confirmed,
            confirmed_at,
            created_at
          `).eq('clinic_id', clinicId).order('created_at', {
          ascending: false
        });
        if (confirmError) throw confirmError;

        // 2. Buscar dados dos agendamentos
        const appointmentIds = (confirmationsData || []).map(c => c.appointment_id);
        let appointmentsData = [];
        if (appointmentIds.length > 0) {
          const {
            data: appts,
            error: apptError
          } = await supabase.from('appointments').select(`
              id,
              patient_name,
              appointment_date,
              appointment_time,
              professional_id,
              status,
              phone
            `).in('id', appointmentIds);
          if (apptError) throw apptError;
          appointmentsData = appts || [];
        }

        // 3. Buscar dados dos profissionais
        const profIds = appointmentsData.map(a => a.professional_id).filter(Boolean);
        let professionalsData = [];
        if (profIds.length > 0) {
          const {
            data: profs,
            error: profError
          } = await supabase.from('professionals').select('id, name').in('id', profIds);
          if (profError) throw profError;
          professionalsData = profs || [];
        }

        // 4. Combinar dados
        const combined = (confirmationsData || []).map(conf => {
          const apt = appointmentsData.find(a => a.id === conf.appointment_id);
          const prof = professionalsData.find(p => p.id === apt?.professional_id);
          return {
            ...conf,
            patient_name: apt?.patient_name || 'N/A',
            appointment_date: apt?.appointment_date || '',
            appointment_time: apt?.appointment_time || '',
            professional_name: prof?.name || 'N/A',
            phone: apt?.phone || 'N/A',
            status: apt?.status || 'unknown'
          };
        });

        // 5. Calcular estatísticas
        const total = combined.length;
        const pending = combined.filter(c => c.confirmed === null).length;
        const confirmed = combined.filter(c => c.confirmed === true).length;
        const rejected = combined.filter(c => c.confirmed === false).length;
        setConfirmations(combined);
        setStats({
          total,
          pending,
          confirmed,
          rejected
        });
      } catch (error) {
        console.error('❌ Erro ao carregar confirmações:', error);
      } finally {
        setLoading(false);
      }
    };
    loadConfirmations();
  }, [clinicId]);

  // Filtrar confirmações
  const filtered = confirmations.filter(c => {
    if (filter === 'pending') return c.confirmed === null;
    if (filter === 'confirmed') return c.confirmed === true;
    if (filter === 'rejected') return c.confirmed === false;
    return true;
  });
  const formatDate = dateStr => {
    if (!dateStr) return 'N/A';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', {
        locale: ptBR
      });
    } catch {
      return dateStr;
    }
  };
  const getStatusBadge = confirmed => {
    if (confirmed === null) {
      return /*#__PURE__*/React.createElement("span", {
        className: "px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium"
      }, "\u23F3 Pendente");
    }
    if (confirmed === true) {
      return /*#__PURE__*/React.createElement("span", {
        className: "px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
      }, "\u2705 Confirmado");
    }
    return /*#__PURE__*/React.createElement("span", {
      className: "px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium"
    }, "\u274C Rejeitado");
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-7xl mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-8"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3"
  }, "\u2705 Confirma\xE7\xF5es de Agendamento"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "Hist\xF3rico de todas as confirma\xE7\xF5es enviadas via WhatsApp")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 text-sm font-medium"
  }, "Total"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold text-gray-900 mt-2"
  }, stats.total)), /*#__PURE__*/React.createElement("div", {
    className: "text-4xl"
  }, "\uD83D\uDCCA"))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 text-sm font-medium"
  }, "Pendentes"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold text-yellow-600 mt-2"
  }, stats.pending)), /*#__PURE__*/React.createElement("div", {
    className: "text-4xl"
  }, "\u23F3"))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 text-sm font-medium"
  }, "Confirmadas"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold text-green-600 mt-2"
  }, stats.confirmed)), /*#__PURE__*/React.createElement("div", {
    className: "text-4xl"
  }, "\u2705"))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 text-sm font-medium"
  }, "Rejeitadas"), /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-bold text-red-600 mt-2"
  }, stats.rejected)), /*#__PURE__*/React.createElement("div", {
    className: "text-4xl"
  }, "\u274C")))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3 mb-6"
  }, [{
    id: 'all',
    label: 'Todas',
    color: 'bg-gray-100 text-gray-700'
  }, {
    id: 'pending',
    label: '⏳ Pendentes',
    color: 'bg-yellow-100 text-yellow-700'
  }, {
    id: 'confirmed',
    label: '✅ Confirmadas',
    color: 'bg-green-100 text-green-700'
  }, {
    id: 'rejected',
    label: '❌ Rejeitadas',
    color: 'bg-red-100 text-red-700'
  }].map(f => /*#__PURE__*/React.createElement("button", {
    key: f.id,
    onClick: () => setFilter(f.id),
    className: `px-4 py-2 rounded-lg font-medium transition ${filter === f.id ? f.color + ' ring-2 ring-offset-2 ring-' + f.color.split(' ')[0] : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
  }, f.label))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg shadow overflow-hidden"
  }, loading ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center h-64"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "Carregando confirma\xE7\xF5es..."))) : filtered.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center h-64"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 text-lg"
  }, "Nenhuma confirma\xE7\xE3o encontrada"))) : /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full"
  }, /*#__PURE__*/React.createElement("thead", {
    className: "bg-gray-50 border-b"
  }, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "px-6 py-3 text-left text-sm font-semibold text-gray-900"
  }, "Paciente"), /*#__PURE__*/React.createElement("th", {
    className: "px-6 py-3 text-left text-sm font-semibold text-gray-900"
  }, "Profissional"), /*#__PURE__*/React.createElement("th", {
    className: "px-6 py-3 text-left text-sm font-semibold text-gray-900"
  }, "Data"), /*#__PURE__*/React.createElement("th", {
    className: "px-6 py-3 text-left text-sm font-semibold text-gray-900"
  }, "Hora"), /*#__PURE__*/React.createElement("th", {
    className: "px-6 py-3 text-left text-sm font-semibold text-gray-900"
  }, "Enviado em"), /*#__PURE__*/React.createElement("th", {
    className: "px-6 py-3 text-left text-sm font-semibold text-gray-900"
  }, "Status"))), /*#__PURE__*/React.createElement("tbody", {
    className: "divide-y"
  }, filtered.map(conf => /*#__PURE__*/React.createElement("tr", {
    key: conf.id,
    className: "hover:bg-gray-50"
  }, /*#__PURE__*/React.createElement("td", {
    className: "px-6 py-4 text-sm text-gray-900 font-medium"
  }, conf.patient_name), /*#__PURE__*/React.createElement("td", {
    className: "px-6 py-4 text-sm text-gray-600"
  }, conf.professional_name), /*#__PURE__*/React.createElement("td", {
    className: "px-6 py-4 text-sm text-gray-600"
  }, formatDate(conf.appointment_date)), /*#__PURE__*/React.createElement("td", {
    className: "px-6 py-4 text-sm text-gray-600"
  }, conf.appointment_time || 'N/A'), /*#__PURE__*/React.createElement("td", {
    className: "px-6 py-4 text-sm text-gray-600"
  }, conf.message_sent_at ? format(parseISO(conf.message_sent_at), 'dd/MM/yyyy HH:mm', {
    locale: ptBR
  }) : 'N/A'), /*#__PURE__*/React.createElement("td", {
    className: "px-6 py-4 text-sm"
  }, getStatusBadge(conf.confirmed))))))))));
}