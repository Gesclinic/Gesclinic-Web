import { useEffect, useState } from 'react';
import { listAppointments } from '@/lib/appointmentsApi';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';

function AgendaUnificadaSimples() {
  const { clinic } = useClinicContext();
  const { user, currentRole } = useAuth();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clinic?.id) {
      setError('Clínica não carregada');
      return;
    }

    setLoading(true);
    setError(null);

    // ✅ CORRIGIDO: Usar date como string para evitar timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const dayStartUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const dayEndUTC = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));

    console.log('📍 [Agenda Debug] Buscando agendamentos:', {
      clinicId: clinic.id,
      date,
      start: dayStartUTC.toISOString(),
      end: dayEndUTC.toISOString(),
    });

    // 🔒 RBAC: Se for profissional, buscar seu professional_id
    const getRBACParams = async () => {
      let userProfessionalId = null;
      if (currentRole?.toLowerCase?.() === 'profissional' && user?.email) {
        const { supabase } = await import('@/lib/customSupabaseClient');
        const { data: profData } = await supabase
          .from('professionals')
          .select('id')
          .eq('email', user.email)
          .eq('clinic_id', clinic.id)
          .maybeSingle();
        if (profData?.id) {
          userProfessionalId = profData.id;
          console.log('✅ [RBAC] Profissional encontrado. Professional ID:', userProfessionalId);
        }
      }
      return userProfessionalId;
    };

    getRBACParams().then((userProfessionalId) => {
      listAppointments({
        clinicId: clinic.id,
        start: dayStartUTC.toISOString(),
        end: dayEndUTC.toISOString(),
        userRole: currentRole,
        userProfessionalId: userProfessionalId,
      })
        .then((result) => {
          console.log('✅ [Agenda Debug] Encontrados:', { count: result?.length, data: result });
          setAgendamentos(result || []);
          setLoading(false);
        })
        .catch((err) => {
          console.error('❌ [Agenda Debug] ERRO:', err);
          setError(String(err));
          setLoading(false);
        });
    });
  }, [clinic?.id, date, currentRole, user?.id]);

  return (
    <div style={{ padding: 24, background: '#fff', fontFamily: 'Arial' }}>
      <h1 style={{ color: '#1976d2', marginBottom: 16 }}>📋 Agenda - Debug Mode</h1>

      {/* INFO BAR */}
      <div
        style={{
          padding: 12,
          marginBottom: 16,
          background: '#e3f2fd',
          border: '3px solid #1976d2',
          borderRadius: 4,
          fontSize: 14,
          fontWeight: 'bold',
        }}
      >
        🏥 Clinic ID:{' '}
        <span style={{ color: clinic?.id ? '#00a000' : '#f00' }}>
          {clinic?.id || '❌ NÃO CARREGADA'}
        </span>{' '}
        | 📅 Data: {date} | 📊 Agendamentos:{' '}
        <span style={{ color: agendamentos.length > 0 ? '#00a000' : '#f00' }}>
          {agendamentos.length}
        </span>{' '}
        | ⏳ {loading ? 'CARREGANDO...' : error ? '❌ ERRO' : '✅ PRONTO'}
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            background: '#ffcdd2',
            border: '2px solid #c62828',
            borderRadius: 4,
            color: '#c62828',
            fontWeight: 'bold',
          }}
        >
          ❌ ERRO: {error}
        </div>
      )}

      {/* DATE PICKER */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>📅 Data:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ padding: 8, fontSize: 14, borderRadius: 4, border: '2px solid #1976d2' }}
        />
      </div>

      {/* RESULTS */}
      {loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: 32,
            color: '#666',
            fontSize: 16,
            fontWeight: 'bold',
          }}
        >
          ⏳⏳⏳ Carregando agendamentos... ⏳⏳⏳
        </div>
      ) : agendamentos.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 32,
            color: '#f00',
            fontWeight: 'bold',
            background: '#fff0f0',
            borderRadius: 4,
            border: '2px solid #f00',
          }}
        >
          ❌ NÃO HÁ AGENDAMENTOS PARA {date}
        </div>
      ) : (
        <div style={{ background: '#f0f0f0', padding: 16, borderRadius: 4 }}>
          <h3>✅ ENCONTRADOS {agendamentos.length} AGENDAMENTOS:</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
              <thead>
                <tr style={{ background: '#1976d2', color: '#fff' }}>
                  <th style={{ padding: 10, textAlign: 'left', border: '1px solid #ddd' }}>ID</th>
                  <th style={{ padding: 10, textAlign: 'left', border: '1px solid #ddd' }}>
                    Horário
                  </th>
                  <th style={{ padding: 10, textAlign: 'left', border: '1px solid #ddd' }}>
                    Paciente
                  </th>
                  <th style={{ padding: 10, textAlign: 'left', border: '1px solid #ddd' }}>
                    Profissional
                  </th>
                  <th style={{ padding: 10, textAlign: 'left', border: '1px solid #ddd' }}>
                    Serviço
                  </th>
                  <th style={{ padding: 10, textAlign: 'left', border: '1px solid #ddd' }}>Sala</th>
                  <th style={{ padding: 10, textAlign: 'left', border: '1px solid #ddd' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {agendamentos.map((apt, i) => (
                  <tr
                    key={i}
                    style={{
                      background: i % 2 === 0 ? '#fff' : '#f9f9f9',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    <td
                      style={{ padding: 10, border: '1px solid #eee', fontSize: 12, color: '#666' }}
                    >
                      {String(apt.id).substring(0, 8)}
                    </td>
                    <td
                      style={{
                        padding: 10,
                        border: '1px solid #eee',
                        fontWeight: 'bold',
                        color: '#1976d2',
                      }}
                    >
                      {apt.start_time || apt.scheduled_time || 'N/A'}
                    </td>
                    <td style={{ padding: 10, border: '1px solid #eee' }}>
                      {apt.patient_name || 'N/A'}
                    </td>
                    <td style={{ padding: 10, border: '1px solid #eee' }}>
                      {apt.professional_name || 'N/A'}
                    </td>
                    <td style={{ padding: 10, border: '1px solid #eee' }}>
                      {apt.service_name || 'N/A'}
                    </td>
                    <td style={{ padding: 10, border: '1px solid #eee' }}>
                      {apt.room_name || 'N/A'}
                    </td>
                    <td style={{ padding: 10, border: '1px solid #eee' }}>{apt.status || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RAW JSON */}
      {agendamentos.length > 0 && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: '#f5f5f5',
            borderRadius: 4,
            border: '2px solid #999',
          }}
        >
          <h4 style={{ marginTop: 0 }}>📋 JSON do primeiro agendamento:</h4>
          <pre
            style={{
              fontSize: 11,
              overflow: 'auto',
              maxHeight: 300,
              background: '#fff',
              padding: 10,
              borderRadius: 4,
              border: '1px solid #ddd',
            }}
          >
            {JSON.stringify(agendamentos[0], null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default AgendaUnificadaSimples;
