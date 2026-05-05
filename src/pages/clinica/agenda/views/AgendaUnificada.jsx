import { useEffect, useState, useMemo } from 'react';
import { format, parse } from 'date-fns';
import { listAppointments } from '@/lib/appointmentsApi';
import { mapAgendaItem } from '@/modules/agenda/services/agendaMapper';
import { atualizarAgendamento } from '@/modules/agenda/services/agenda.api.mutations';
import { useClinicContext } from '@/contexts/ClinicContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { AGENDA_TABS_COLORS } from '../config/agendaTabsColors.config';
import AgendaViewModeTabs from '../components/AgendaViewModeTabs';
import AgendamentoDetalhesModal from '../components/AgendamentoDetalhesModal';
import AgendaTimeSlotRow from '../components/AgendaTimeSlotRow';
import { listProfessionals } from '@/lib/professionalsApi';
import { listServices } from '@/lib/servicesApi';
import { listPayers } from '@/lib/payersApi';
import { generateTimeSlots } from '@/utils/helpers/generateTimeSlots';
import { getProfessionalSchedules } from '@/lib/professionalScheduleApi';
import AgendaFilters from '@/components/agenda/AgendaFilters';
import AgendaSlotCard from '@/components/agenda/AgendaSlotCard';
import ModalCriarAgendamento from '../components/ModalCriarAgendamento';
import { listRooms } from '@/lib/roomsApi';

function AgendaUnificada() {
  const { clinic } = useClinicContext();
  const { user, currentRole } = useAuth();

  // ===== STATES =====
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [currentViewMode, setCurrentViewMode] = useState('dia'); // Dia, Semana, Mês
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [professionals, setProfessionals] = useState([]);
  const [services, setServices] = useState([]);
  const [payers, setPayers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [rooms, setRooms] = useState([]);

  // Filtros individuais padronizados
  const [professionalId, setProfessionalId] = useState(undefined);
  const [roomId, setRoomId] = useState(undefined);
  const [status, setStatus] = useState(undefined);
  const [patientId, setPatientId] = useState(undefined);

  // Modal states
  const [novoAgendamento, setNovoAgendamento] = useState(false);
  const [modalDetalhesId, setModalDetalhesId] = useState(null);
  const [modalDetalhesDados, setModalDetalhesDados] = useState(null);
  const [modalDetalhesLoading, setModalDetalhesLoading] = useState(false);
  const [modalDetalhesError, setModalDetalhesError] = useState(null);

  // ===== FUNÇÕES AUXILIARES =====

  const carregarAgendamentos = async () => {
    if (!clinic?.id) {
      console.log('[AgendaUnificada] Clinic não carregada ainda');
      return;
    }

    setLoading(true);
    const [year, month, day] = date.split('-').map(Number);
    const dayStartUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const dayEndUTC = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));

    console.log('[AgendaUnificada] Carregando agenda para:', {
      clinic_id: clinic.id,
      date,
      start: dayStartUTC.toISOString(),
      end: dayEndUTC.toISOString(),
    });

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

    try {
      const userProfessionalId = await getRBACParams();
      const result = await listAppointments({
        clinicId: clinic.id,
        start: dayStartUTC.toISOString(),
        end: dayEndUTC.toISOString(),
        userRole: currentRole,
        userProfessionalId: userProfessionalId,
      });

      console.log('[AgendaUnificada] Resultado de listAppointments:', {
        result,
        length: result?.length,
      });
      const mapped = (result || []).map(mapAgendaItem);
      console.log('[AgendaUnificada] Agendamentos mapeados:', mapped.length);
      setAgendamentos(mapped);
    } catch (err) {
      console.error('[AgendaUnificada] Erro ao listar agenda:', err);
      setAgendamentos([]);
    } finally {
      setLoading(false);
    }
  };

  // ===== TIME CONFIGURATION =====
  const startHour = 8;
  const endHour = 17;
  const slotMinutes = 30;

  // ===== EFFECTS =====

  // Carrega schedules dos profissionais
  useEffect(() => {
    if (!clinic?.id) {
      return;
    }
    getProfessionalSchedules(clinic.id)
      .then((data) => {
        console.log('[DEBUG] Schedules carregados:', data);
        setSchedules(data);
      })
      .catch((err) => {
        console.error('[DEBUG] Erro ao carregar schedules:', err);
        setSchedules([]);
      });
  }, [clinic?.id]);

  // Carrega agendamentos do dia
  useEffect(() => {
    carregarAgendamentos();

    // Carregar dados de profissionais, serviços e pagadores
    if (clinic?.id) {
      listProfessionals(clinic.id).then(setProfessionals);
      listServices(clinic.id).then(setServices);
      listPayers(clinic.id).then(setPayers);
      listRooms(clinic.id)
        .then(setRooms)
        .catch(() => setRooms([]));
    }
  }, [clinic?.id, date, currentRole, user?.id]);

  // Filtros únicos
  // Para Radix Select, precisamos arrays de objetos {id, name}
  const profissionais = useMemo(
    () =>
      Array.from(
        new Set(
          agendamentos
            .map((a) =>
              a.professionalId && a.professional
                ? JSON.stringify({ id: a.professionalId, name: a.professional })
                : null,
            )
            .filter(Boolean),
        ),
      ).map((str) => JSON.parse(str)),
    [agendamentos],
  );
  const salas = useMemo(
    () =>
      Array.from(
        new Set(
          agendamentos
            .map((a) =>
              a.roomId && a.sala ? JSON.stringify({ id: a.roomId, name: a.sala }) : null,
            )
            .filter(Boolean),
        ),
      ).map((str) => JSON.parse(str)),
    [agendamentos],
  );
  const pacientes = useMemo(
    () =>
      Array.from(
        new Set(
          agendamentos
            .map((a) =>
              a.patientId && a.paciente
                ? JSON.stringify({ id: a.patientId, name: a.paciente })
                : null,
            )
            .filter(Boolean),
        ),
      ).map((str) => JSON.parse(str)),
    [agendamentos],
  );

  // ===== MEMOS & COMPUTED VALUES =====

  // Bloqueio absoluto: se profissional filtrado e não houver disponibilidade, retorna só a mensagem
  const disponibilidadeProfissional = useMemo(() => {
    if (professionalId && professionalId !== 'all') {
      const [year, month, day] = date.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      const dayOfWeek = dateObj.getDay();
      const disp = schedules.filter(
        (s) =>
          String(s.professional_id) === String(professionalId) &&
          s.day_of_week === dayOfWeek &&
          s.active !== false &&
          !s.blocked,
      );
      if (!disp || disp.length === 0) {
        return false;
      }
    }
    return true;
  }, [professionalId, schedules, date]);

  // Função para obter horários disponíveis para um profissional em um dia da semana
  function getHorariosDisponiveis(profId, dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const diaSemana = dateObj.getDay();
    const profSchedules = schedules.filter(
      (s) =>
        String(s.professional_id) === String(profId) &&
        s.day_of_week === diaSemana &&
        s.active !== false &&
        !s.blocked,
    );
    if (profSchedules.length === 0) {
      return null;
    } // agenda bloqueada
    const slots = [];
    profSchedules.forEach((sch) => {
      // Gera slots para cada intervalo cadastrado
      const inicio = sch.start_time;
      const fim = sch.end_time;
      const dur = sch.duration_minutes || slotMinutes;
      let curr = inicio;
      while (curr < fim) {
        slots.push(curr);
        // Soma duração
        const [h, m] = curr.split(':').map(Number);
        const mins = h * 60 + m + dur;
        const nh = String(Math.floor(mins / 60)).padStart(2, '0');
        const nm = String(mins % 60).padStart(2, '0');
        curr = `${nh}:${nm}`;
        if (curr >= fim) {
          break;
        }
      }
    });
    // Remove duplicados e ordena
    return Array.from(new Set(slots)).sort();
  }

  // Gera horários filtrados conforme disponibilidade do profissional selecionado
  const horarios = useMemo(() => {
    if (professionalId && professionalId !== 'all') {
      const disp = getHorariosDisponiveis(professionalId, date);
      // Se não houver disponibilidade, retorna null
      if (!disp || disp.length === 0) {
        return null;
      }
      return disp;
    }
    // Se não houver filtro, mostra todos os horários cadastrados de todos profissionais
    const allSlots = [];
    professionals.forEach((prof) => {
      const disp = getHorariosDisponiveis(prof.id, date);
      if (disp) {
        allSlots.push(...disp);
      }
    });
    // Se nenhum profissional tem disponibilidade, retorna null
    if (allSlots.length === 0) {
      return null;
    }
    // Remove duplicados e ordena
    return Array.from(new Set(allSlots)).sort();
  }, [startHour, endHour, slotMinutes, professionalId, schedules, date, professionals]);

  // Unifica horários + agendamentos, respeitando disponibilidade
  const linhas = useMemo(() => {
    // Se não houver horários, retorna [{ bloqueada: true }]
    if (!horarios || horarios.length === 0) {
      return [{ bloqueada: true }];
    }
    return horarios
      .map((horario) => {
        const agendamento = agendamentos.find((a) => {
          if (!a.startTime) {
            return false;
          }
          const hora = format(a.startTime, 'HH:mm');
          // Comparação robusta de IDs
          const agProfId = String(a.professionalId || a.professional_id);
          const filtroProfId =
            professionalId && professionalId !== 'all' ? String(professionalId) : null;
          if (filtroProfId) {
            return hora === horario && agProfId === filtroProfId;
          }
          return hora === horario;
        });
        // Filtros locais padronizados
        if (agendamento) {
          if (
            (professionalId &&
              professionalId !== 'all' &&
              String(agendamento.professionalId || agendamento.professional_id) !==
                String(professionalId)) ||
            (roomId && roomId !== 'all' && agendamento.roomId !== roomId) ||
            (status && status !== 'all' && agendamento.status !== status) ||
            (patientId && patientId !== 'all' && agendamento.patientId !== patientId)
          ) {
            return null;
          }
        } else {
          // Se filtro ativo, só mostra horários livres se não houver filtro restritivo
          if (
            (professionalId && professionalId !== 'all') ||
            (roomId && roomId !== 'all') ||
            (status && status !== 'all') ||
            (patientId && patientId !== 'all')
          ) {
            return null;
          }
        }
        return { horario, agendamento };
      })
      .filter(Boolean);
  }, [horarios, agendamentos, professionalId, roomId, status, patientId, schedules, date]);

  // Se profissional filtrado e não há horários disponíveis, retorna só a mensagem de agenda bloqueada
  if (professionalId && professionalId !== 'all' && (!horarios || horarios.length === 0)) {
    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Agenda Unificada</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <AgendaViewModeTabs
              currentViewMode={currentViewMode}
              onViewModeChange={setCurrentViewMode}
            />

            <button
              style={{
                padding: '6px 14px',
                background: '#1976d2',
                color: '#fff',
                border: 0,
                borderRadius: 4,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => setNovoAgendamento(true)}
            >
              Novo Agendamento
            </button>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ border: '1px solid #ccc', borderRadius: 4, padding: '4px 8px' }}
            />
          </div>
        </div>
        {/* Só renderiza os filtros principais (profissional, data), não os extras */}
        <p
          style={{
            textAlign: 'center',
            color: '#b00',
            padding: 32,
            fontWeight: 600,
            background: '#fff0f0',
          }}
        >
          Agenda bloqueada para este profissional neste dia
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Agenda Unificada</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <AgendaViewModeTabs
            currentViewMode={currentViewMode}
            onViewModeChange={setCurrentViewMode}
          />

          <button
            style={{
              padding: '6px 14px',
              background: '#1976d2',
              color: '#fff',
              border: 0,
              borderRadius: 4,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => setNovoAgendamento(true)}
          >
            Novo Agendamento
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ border: '1px solid #ccc', borderRadius: 4, padding: '4px 8px' }}
          />
        </div>
      </div>

      {/* DEBUG: Show appointment count */}
      <div
        style={{
          padding: '8px 12px',
          marginBottom: '16px',
          background: '#f0f0f0',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#666',
          border: '1px solid #ddd',
        }}
      >
        🔍 Debug: Clinic ID: {clinic?.id} | Date: {date} | Appointments loaded:{' '}
        {agendamentos.length} | {loading ? '⏳ Loading...' : 'Done'}
      </div>

      <AgendaFilters
        professionalId={professionalId}
        setProfessionalId={setProfessionalId}
        professionals={profissionais}
        roomId={roomId}
        setRoomId={setRoomId}
        rooms={salas}
        status={status}
        setStatus={setStatus}
        patientId={patientId}
        setPatientId={setPatientId}
        patients={pacientes}
      />
      {/* LOG VISUAL DE DEBUG: horários disponíveis para o profissional selecionado */}
      {/* LOG VISUAL DE DEBUG: todos os schedules carregados e dia da semana atual */}
      <div
        style={{
          background: '#eef',
          color: '#333',
          padding: 8,
          margin: '8px 0',
          fontSize: 13,
          border: '1px solid #dde',
          borderRadius: 4,
        }}
      >
        <b>Schedules carregados:</b> {JSON.stringify(schedules)}
        <br />
        <b>Dia da semana atual:</b> {new Date(date).getDay()}
        <br />
        {professionalId && professionalId !== 'all' && (
          <div
            style={{
              background: '#ffe',
              color: '#333',
              padding: 8,
              margin: '8px 0',
              fontSize: 13,
              border: '1px solid #eed',
              borderRadius: 4,
            }}
          >
            <b>Horários disponíveis para o profissional selecionado:</b>{' '}
            {JSON.stringify(getHorariosDisponiveis(professionalId, date))}
          </div>
        )}
      </div>
      {loading ? (
        <p style={{ textAlign: 'center', color: '#888', padding: 24 }}>
          Carregando agendamentos...
        </p>
      ) : professionalId && professionalId !== 'all' && (!horarios || horarios.length === 0) ? (
        <p
          style={{
            textAlign: 'center',
            color: '#b00',
            padding: 32,
            fontWeight: 600,
            background: '#fff0f0',
          }}
        >
          Agenda bloqueada para este profissional neste dia
        </p>
      ) : linhas[0]?.bloqueada ? (
        <p style={{ textAlign: 'center', color: '#888', padding: 24 }}>
          Nenhum horário disponível.
        </p>
      ) : (
        <div
          style={{
            overflowX: 'auto',
            border: '1px solid #d0d0d0',
            borderRadius: '6px',
            backgroundColor: '#f9f9f9',
            width: '100%',
          }}
        >
          {/* Agenda Unificada: cada linha é um card horizontal interativo */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              minWidth: '1450px',
              background: '#fff',
            }}
          >
            <div
              className="bg-gray-100 text-xs font-bold"
              style={{
                display: 'flex',
                fontWeight: 700,
                borderBottom: '2px solid #999',
                padding: '12px 0',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                backgroundColor: '#f0f0f0',
                color: '#333',
              }}
            >
              <div
                style={{
                  width: 90,
                  paddingRight: 12,
                  paddingLeft: 12,
                  textAlign: 'center',
                  flexShrink: 0,
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                HORÁRIO
              </div>
              <div
                style={{
                  width: 140,
                  paddingRight: 12,
                  textAlign: 'left',
                  flexShrink: 0,
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                PACIENTE
              </div>
              <div
                style={{
                  width: 40,
                  paddingRight: 8,
                  textAlign: 'left',
                  flexShrink: 0,
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                CONTATO
              </div>
              <div
                style={{
                  width: 160,
                  paddingRight: 12,
                  textAlign: 'left',
                  flexShrink: 0,
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                SERVIÇO
              </div>
              <div
                style={{
                  width: 50,
                  paddingRight: 8,
                  textAlign: 'left',
                  flexShrink: 0,
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                CONVÊNIO
              </div>
              <div
                style={{
                  minWidth: 120,
                  paddingRight: 12,
                  flex: 1,
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                PLANO/OBS
              </div>
              <div
                style={{
                  width: 130,
                  paddingRight: 12,
                  textAlign: 'left',
                  flexShrink: 0,
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                PROFISSIONAL
              </div>
              <div
                style={{
                  width: 200,
                  paddingRight: 12,
                  paddingLeft: 8,
                  textAlign: 'center',
                  flexShrink: 0,
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                STATUS
              </div>
            </div>
            <div style={{ minWidth: '1450px', display: 'flex', flexDirection: 'column' }}>
              {linhas.map(({ horario, agendamento, id, data, profissionalId, salaId }) => (
                <AgendaSlotCard
                  key={agendamento?.id || id || horario}
                  id={agendamento?.id || id || horario}
                  data={data || date}
                  horario={horario}
                  profissionalId={agendamento?.professionalId || profissionalId}
                  salaId={agendamento?.salaId || salaId}
                  agendamento={agendamento}
                  onClick={async () => {
                    if (!agendamento) {
                      setNovoAgendamento({ horario, date });
                    } else if (agendamento && agendamento.id) {
                      setModalDetalhesId(agendamento.id);
                      setModalDetalhesLoading(true);
                      setModalDetalhesError(null);
                      setModalDetalhesDados(null);
                      try {
                        const { data, error } = await buscarAgendamentoPorId(agendamento.id);
                        if (error) {
                          throw error;
                        }
                        setModalDetalhesDados(mapAgendaItem(data));
                      } catch (err) {
                        setModalDetalhesError('Erro ao buscar detalhes do agendamento.');
                      } finally {
                        setModalDetalhesLoading(false);
                      }
                    }
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalhes real */}
      {modalDetalhesId && (
        <AgendamentoDetalhesModal
          agendamentoId={modalDetalhesId}
          dados={modalDetalhesDados}
          loading={modalDetalhesLoading}
          error={modalDetalhesError}
          servicos={services}
          payers={payers}
          profissionais={professionals}
          pacientes={pacientes}
          onClose={() => {
            setModalDetalhesId(null);
            setModalDetalhesDados(null);
            setModalDetalhesError(null);
            setModalDetalhesLoading(false);
          }}
          onEditSuccess={async (form) => {
            // Chama a função de atualização do agendamento
            const payload = {
              date: form?.startTime ? form.startTime.slice(0, 10) : '',
              startTime: form?.startTime ? form.startTime.slice(11, 16) : '',
              endTime: form?.endTime || null,
              pacienteId: form?.patient || '',
              profissionalId: form?.professional || '',
              servicoId: form?.service || '',
              salaId: form?.room || '',
              convenioId: form?.payer || '',
              planoId: form?.plan || '',
              status: form?.status || '',
              observacoes: form?.notes || '',
              observacoesInternas: form?.internalNotes || '',
            };
            await atualizarAgendamento(modalDetalhesId, payload);
            // Atualiza a agenda após salvar
            setModalDetalhesId(null);
            setModalDetalhesDados(null);
            setModalDetalhesError(null);
            setModalDetalhesLoading(false);
            // Recarrega agendamentos do dia
            listarAgenda({ clinicId: clinic.id, date }).then((result) => {
              let ags = [];
              if (Array.isArray(result)) {
                ags = result;
              } else if (result && Array.isArray(result.data)) {
                ags = result.data;
              }
              const mapped = Array.isArray(ags) ? ags.map(mapAgendaItem) : [];
              setAgendamentos(mapped);
            });
          }}
        />
      )}
      {/* Modal de novo agendamento - NOVO Modal Unificado */}
      <ModalCriarAgendamento
        isOpen={novoAgendamento}
        onClose={() => setNovoAgendamento(false)}
        mode="new"
        professionals={professionals}
        services={services}
        payers={payers}
        rooms={rooms}
        onSuccess={async () => {
          setNovoAgendamento(false);
          // Recarregar agendamentos
          await carregarAgendamentos();
        }}
      />
      {/* {novoAgendamento && (
        <NovoAgendamentoModal horario={novoAgendamento.horario} date={novoAgendamento.date} onClose={() => setNovoAgendamento(null)} />
      )} */}
    </div>
  );
}

export default AgendaUnificada;
