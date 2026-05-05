import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/customSupabaseClient';
import { listPortalPatientLaudos } from '@/lib/patientLaudosApi';
import { getLaudoTypeLabel } from '@/lib/patientLaudoTemplates';
import { useToast } from '@/components/ui/use-toast';
import {
  Calendar,
  Key,
  Loader2,
  Pill,
  Video,
  Download,
  LogIn,
  FileText,
  Stethoscope,
} from 'lucide-react';
import { Helmet } from 'react-helmet';
import LaudoLetterhead from '@/components/laudos/LaudoLetterhead';

const HistoryItem = ({ item }) => (
  <Card className="hover:shadow-lg transition-shadow duration-300">
    <CardHeader>
      <CardTitle className="text-base font-semibold flex items-center justify-between">
        <span>
          <Stethoscope className="inline-block mr-2 text-primary" />
          {item.professional_name}
        </span>
        <span className="text-sm font-normal text-muted-foreground">
          {new Date(item.start_time).toLocaleDateString('pt-BR')}
        </span>
      </CardTitle>
      <p className="text-xs text-muted-foreground">{item.clinic_name}</p>
    </CardHeader>
    <CardContent className="space-y-3">
      {item.resumo_atendimento && (
        <div className="bg-slate-50 p-3 rounded-md">
          <p className="font-medium text-sm">Resumo do Atendimento</p>
          <p className="text-xs text-slate-600">{item.resumo_atendimento}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {/* memed_rx_url removido */}
        {item.telemed_link && (
          <Button asChild variant="outline" size="sm">
            <a href={item.telemed_link} target="_blank" rel="noopener noreferrer">
              <Video className="mr-2 h-4 w-4 text-green-500" /> Acessar Teleconsulta
            </a>
          </Button>
        )}
        {item.gravacao_url && (
          <Button asChild variant="outline" size="sm">
            <a href={item.gravacao_url} target="_blank" rel="noopener noreferrer">
              <Download className="mr-2 h-4 w-4" /> Baixar Gravação
            </a>
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
);

const ReportItem = ({ item }) => (
  <Card className="hover:shadow-lg transition-shadow duration-300 border-sky-100">
    <CardHeader>
      <CardTitle className="text-base font-semibold flex items-center justify-between gap-3">
        <span>
          <FileText className="inline-block mr-2 text-sky-600" />
          {item.title}
        </span>
        <span className="text-sm font-normal text-muted-foreground">
          {item.exam_date
            ? new Date(item.exam_date).toLocaleDateString('pt-BR')
            : new Date(item.created_at).toLocaleDateString('pt-BR')}
        </span>
      </CardTitle>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{getLaudoTypeLabel(item.laudo_type)}</span>
        <span>•</span>
        <span>{item.professional_name || 'Profissional nao informado'}</span>
      </div>
    </CardHeader>
    <CardContent>
      {item.metadata?.letterhead ? (
        <div className="mb-4">
          <LaudoLetterhead letterhead={item.metadata.letterhead} compact />
        </div>
      ) : null}
      <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 whitespace-pre-wrap text-slate-700">
        {item.content}
      </div>
    </CardContent>
  </Card>
);

export default function PatientPortal() {
  const { toast } = useToast();
  const [auth, setAuth] = useState({ token: null, patient: null });
  const [history, setHistory] = useState([]);
  const [laudos, setLaudos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState({ cpf: '', birthDate: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error: funcError } = await supabase.functions.invoke('patient-portal-login', {
        body: JSON.stringify({ cpf: credentials.cpf, birth_date: credentials.birthDate }),
      });

      if (funcError || data.error) {
        throw new Error(data?.error || funcError?.message || 'Credenciais inválidas.');
      }

      setAuth({ token: data.token, patient: data.patient });
      toast({ title: `Bem-vindo(a), ${data.patient.full_name.split(' ')[0]}!` });
      await fetchPortalData(data.patient.id);
    } catch (error) {
      console.error('Login failed:', error);
      toast({ title: 'Erro de Acesso', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPortalData = async (patientId) => {
    setLoading(true);
    try {
      const historyQuery = supabase
        .from('view_patient_portal_history')
        .select('*')
        .eq('patient_id', patientId);

      const [{ data, error }, laudosData] = await Promise.all([
        historyQuery,
        listPortalPatientLaudos(patientId),
      ]);

      if (error) {
        throw error;
      }

      setHistory(data || []);
      setLaudos(laudosData || []);
    } catch (error) {
      toast({
        title: 'Erro ao carregar portal',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Portal do Paciente - Gesclinic Web</title>
      </Helmet>
      <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="text-center">
            <FileText className="mx-auto h-12 w-12 text-primary opacity-80" />
            <h1 className="text-3xl font-bold text-slate-800 mt-2">Portal do Paciente</h1>
            <p className="text-muted-foreground">Seu histórico de saúde em um só lugar.</p>
          </header>

          {!auth.token ? (
            <Card className="max-w-md mx-auto shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="text-primary" /> Acesso Seguro
                </CardTitle>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <label htmlFor="cpf" className="text-sm font-medium">
                      CPF
                    </label>
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      type="text"
                      value={credentials.cpf}
                      onChange={(e) => setCredentials({ ...credentials, cpf: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="birth" className="text-sm font-medium">
                      Data de Nascimento
                    </label>
                    <Input
                      id="birth"
                      type="date"
                      value={credentials.birthDate}
                      onChange={(e) =>
                        setCredentials({ ...credentials, birthDate: e.target.value })
                      }
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (
                      <Loader2 className="animate-spin mr-2" />
                    ) : (
                      <LogIn className="mr-2 h-4 w-4" />
                    )}
                    Entrar
                  </Button>
                </CardFooter>
              </form>
            </Card>
          ) : (
            <main className="space-y-8">
              {loading && (
                <div className="flex justify-center">
                  <Loader2 className="animate-spin text-primary" />
                </div>
              )}

              {!loading ? (
                <section className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">
                      Historico de atendimentos
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Consultas, receitas e registros relacionados ao seu cuidado.
                    </p>
                  </div>
                  {history.length === 0 ? (
                    <p className="text-center text-muted-foreground">
                      Nenhum historico encontrado.
                    </p>
                  ) : (
                    history.map((item) => <HistoryItem key={item.appointment_id} item={item} />)
                  )}
                </section>
              ) : null}

              {!loading ? (
                <section className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">Laudos liberados</h2>
                    <p className="text-sm text-muted-foreground">
                      Resultados e pareceres publicados pela clinica para consulta online.
                    </p>
                  </div>
                  {laudos.length === 0 ? (
                    <Card>
                      <CardContent className="py-10 text-center text-muted-foreground">
                        Nenhum laudo foi liberado no portal ate o momento.
                      </CardContent>
                    </Card>
                  ) : (
                    laudos.map((item) => <ReportItem key={item.id} item={item} />)
                  )}
                </section>
              ) : null}
            </main>
          )}
        </div>
      </div>
    </>
  );
}
