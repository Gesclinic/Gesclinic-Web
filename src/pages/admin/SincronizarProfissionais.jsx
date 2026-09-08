import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  GitMerge,
  Users,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SincronizarProfissionais() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const [step, setStep] = useState('detecting'); // detecting, review, merging, done
  const [duplicates, setDuplicates] = useState([]);
  const [selectedForMerge, setSelectedForMerge] = useState({});
  const [merging, setMerging] = useState(false);

  // Detectar duplicatas ao carregar
  useEffect(() => {
    if (step === 'detecting') {
      detectDuplicates();
    }
  }, []);

  const normalizeString = (str) => {
    if (!str) {
      return '';
    }
    return str.toLowerCase().trim().replace(/\s+/g, ' ');
  };

  const detectDuplicates = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🔍 [SINCRONIZAÇÃO] Procurando duplicatas...');

      // Buscar todos os usuários profissionais
      const { data: profUsers, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name, cpf, clinic_id')
        .eq('role', 'profissional');

      if (usersError) {
        throw usersError;
      }

      // Buscar todos os profissionais
      const { data: allProfessionals, error: profsError } = await supabase
        .from('professionals')
        .select('id, name, email, cpf, clinic_id')
        .order('name', { ascending: true });

      if (profsError) {
        throw profsError;
      }

      console.log('📊 [SINCRONIZAÇÃO] Dados coletados:', {
        profUsers: profUsers?.length || 0,
        professionals: allProfessionals?.length || 0,
      });

      // Agrupar profissionais por nome normalizado
      const grouped = {};

      allProfessionals?.forEach((prof) => {
        const nameKey = normalizeString(prof.name);
        if (!grouped[nameKey]) {
          grouped[nameKey] = [];
        }
        grouped[nameKey].push(prof);
      });

      // Encontrar duplicatas (mesmo nome ou email)
      const foundDuplicates = [];

      Object.entries(grouped).forEach(([nameKey, profs]) => {
        if (profs.length > 1) {
          foundDuplicates.push({
            name: profs[0].name,
            email: profs[0].email,
            count: profs.length,
            records: profs,
            selectedId: null, // Qual manter
          });
        }
      });

      // Também verificar email duplicado
      const emailGrouped = {};
      allProfessionals?.forEach((prof) => {
        if (prof.email) {
          const emailKey = prof.email.toLowerCase();
          if (!emailGrouped[emailKey]) {
            emailGrouped[emailKey] = [];
          }
          emailGrouped[emailKey].push(prof);
        }
      });

      Object.entries(emailGrouped).forEach(([email, profs]) => {
        if (profs.length > 1) {
          // Verificar se já foi adicionado por nome
          const exists = foundDuplicates.some((d) => d.records.some((r) => r.id === profs[0].id));
          if (!exists) {
            foundDuplicates.push({
              name: profs[0].name,
              email: email,
              count: profs.length,
              records: profs,
              selectedId: null,
            });
          }
        }
      });

      // Mapeamento de usuários profissionais para auxiliar na seleção
      const userMap = {};
      profUsers?.forEach((u) => {
        userMap[normalizeString(u.full_name)] = u;
      });

      setDuplicates(
        foundDuplicates.map((dup) => ({
          ...dup,
          relatedUser: userMap[normalizeString(dup.name)],
        })),
      );

      setStep(foundDuplicates.length > 0 ? 'review' : 'merging');

      console.log('✅ [SINCRONIZAÇÃO] Duplicatas encontradas:', foundDuplicates.length);
    } catch (err) {
      console.error('❌ Erro ao detectar duplicatas:', err);
      setError(err.message || 'Erro ao detectar duplicatas');
      toast({
        variant: 'destructive',
        title: 'Erro ao detectar duplicatas',
        description: err.message || 'Não foi possível analisar os profissionais agora.',
      });
    }

    setLoading(false);
  };

  const handleSelectForMerge = (dupIndex, profId) => {
    setSelectedForMerge((prev) => ({
      ...prev,
      [dupIndex]: profId,
    }));
  };

  const executeMerge = async () => {
    setMerging(true);
    setError('');

    try {
      console.log('🔗 [SINCRONIZAÇÃO] Iniciando mesclagem de duplicatas...');

      let mergedCount = 0;
      let deletedCount = 0;
      const operations = [];

      for (let i = 0; i < duplicates.length; i++) {
        const dup = duplicates[i];
        const selectedId = selectedForMerge[i];

        if (!selectedId) {
          console.warn(`⚠️ [SINCRONIZAÇÃO] Nenhum profissional selecionado para ${dup.name}`);
          continue;
        }

        const keepProf = dup.records.find((p) => p.id === selectedId);
        const deleteProfs = dup.records.filter((p) => p.id !== selectedId);

        console.log(`🔀 [SINCRONIZAÇÃO] Mantendo: ${keepProf.name} (${selectedId})`);
        console.log(`🗑️ [SINCRONIZAÇÃO] Deletando: ${deleteProfs.map((p) => p.id).join(', ')}`);

        // Mesclar dados: pegar informações empty do principal de outros registros
        const mergedData = {
          name: keepProf.name,
          email: keepProf.email || deleteProfs[0]?.email,
          cpf: keepProf.cpf || deleteProfs[0]?.cpf,
          phone: keepProf.phone || deleteProfs[0]?.phone,
          clinic_id: keepProf.clinic_id || deleteProfs[0]?.clinic_id,
        };

        // Atualizar registro principal com dados mesclados
        const { error: updateError } = await supabase
          .from('professionals')
          .update(mergedData)
          .eq('id', selectedId);

        if (updateError) {
          throw new Error(`Erro ao atualizar ${keepProf.name}: ${updateError.message}`);
        }

        mergedCount++;

        // Deletar registros duplicados
        for (const delProf of deleteProfs) {
          const { error: deleteError } = await supabase
            .from('professionals')
            .delete()
            .eq('id', delProf.id);

          if (deleteError) {
            console.warn(`⚠️ Erro ao deletar ${delProf.id}:`, deleteError);
          } else {
            deletedCount++;
          }
        }
      }

      setResults({
        merged: mergedCount,
        deleted: deletedCount,
        duplicatesProcessed: duplicates.length,
      });

      setStep('done');
      setMessage(
        `✅ Duplicatas mescladas! ${mergedCount} registros principais atualizados, ${deletedCount} deletados.`,
      );
      toast({
        title: 'Mesclagem concluída',
        description: `${mergedCount} registro(s) principal(is) atualizado(s) e ${deletedCount} duplicata(s) removida(s).`,
      });

      console.log('✅ [SINCRONIZAÇÃO] Mesclagem concluída:', {
        merged: mergedCount,
        deleted: deletedCount,
      });
    } catch (err) {
      console.error('❌ Erro na mesclagem:', err);
      setError(err.message || 'Erro ao mesclar duplicatas');
      toast({
        variant: 'destructive',
        title: 'Erro ao mesclar duplicatas',
        description: err.message || 'Revise as seleções e tente novamente.',
      });
    }

    setMerging(false);
  };

  const executeFullSync = async () => {
    setMerging(true);
    setError('');

    try {
      console.log('🔗 [SINCRONIZAÇÃO] Iniciando sincronização completa...');

      // Buscar usuários profissionais
      const { data: profUsers, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name, cpf, clinic_id')
        .eq('role', 'profissional');

      if (usersError) {
        throw usersError;
      }

      let created = 0;
      let updated = 0;
      const createdList = [];
      const updatedList = [];

      for (const user of profUsers || []) {
        const { data: existingProf } = await supabase
          .from('professionals')
          .select('id, name, email, cpf')
          .eq('email', user.email)
          .eq('clinic_id', user.clinic_id)
          .maybeSingle();

        if (existingProf?.id) {
          const { error: updateError } = await supabase
            .from('professionals')
            .update({
              name: user.full_name,
              cpf: user.cpf || null,
              active: true,
            })
            .eq('id', existingProf.id);

          if (!updateError) {
            updated++;
            updatedList.push({
              id: existingProf.id,
              name: user.full_name,
              email: user.email,
              cpf: user.cpf || null,
            });
          }
        } else {
          const { data: createdProf, error: createError } = await supabase
            .from('professionals')
            .insert({
              name: user.full_name,
              email: user.email,
              clinic_id: user.clinic_id,
              active: true,
              cpf: user.cpf || null,
            })
            .select();


          if (!createError && createdProf) {
            created++;
            createdList.push({
              id: createdProf.id,
              name: createdProf.name,
              email: createdProf.email,
              cpf: createdProf.cpf || null,
            });
          }
        }
      }

      setResults({
        ...results,
        synced: created,
        syncedUpdated: updated,
        createdList,
        updatedList,
      });

      setMessage(`✅ Sincronização completa! ${created} criados, ${updated} atualizados.`);
      setStep('done');
      toast({
        title: 'Sincronização concluída',
        description: `${created} profissional(is) criado(s) e ${updated} atualizado(s).`,
      });
    } catch (err) {
      console.error('❌ Erro na sincronização:', err);
      setError(err.message || 'Erro ao sincronizar');
      toast({
        variant: 'destructive',
        title: 'Erro ao sincronizar profissionais',
        description: err.message || 'Tente novamente em alguns instantes.',
      });
    }

    setMerging(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <Helmet>
        <title>Sincronizar Profissionais - Gesclinic</title>
        <meta
          name="description"
          content="Elimine duplicatas e sincronize usuários profissionais com a base de profissionais."
        />
      </Helmet>

      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-6 shadow-sm md:flex-row md:items-start md:justify-between">
          <button
            onClick={() => navigate('/clinica/administracao/usuarios')}
            className="inline-flex items-center gap-2 self-start rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="h-5 w-5" />
            Voltar
          </button>
          <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center rounded-full bg-[hsl(var(--primary))]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">
                Administração
              </span>
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-slate-950">
                  Sincronizar Profissionais
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Revise duplicatas, escolha o registro principal e mantenha usuários profissionais
                  alinhados com a tabela de profissionais.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 md:max-w-xs">
              A sincronização preserva o vínculo por clínica e prioriza dados já preenchidos no
              registro mantido.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Duplicatas
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-950">{duplicates.length}</p>
                </div>
                <GitMerge className="h-10 w-10 text-amber-500 opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Seleções feitas
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-950">
                    {Object.keys(selectedForMerge).length}
                  </p>
                </div>
                <Users className="h-10 w-10 text-[hsl(var(--primary))] opacity-25" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Etapa atual
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-950 capitalize">
                    {step === 'detecting'
                      ? 'Analisando'
                      : step === 'review'
                        ? 'Revisão'
                        : step === 'merging'
                          ? 'Sincronização'
                          : 'Concluído'}
                  </p>
                </div>
                <Sparkles className="h-10 w-10 text-emerald-500 opacity-25" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/80">
            <CardTitle className="text-2xl text-slate-950">
              Integração Inteligente de Profissionais
            </CardTitle>
            <CardDescription>
              O fluxo detecta registros repetidos, permite escolher qual manter e depois sincroniza
              a base com os usuários de perfil profissional.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {message && (
              <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                <p className="text-sm text-green-700">{message}</p>
              </div>
            )}

            {step === 'detecting' && (
              <div className="space-y-4">
                <div className="flex items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
                  <span className="ml-3 text-lg font-medium text-slate-700">
                    Detectando duplicatas...
                  </span>
                </div>
              </div>
            )}

            {step === 'review' && duplicates.length > 0 && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <h3 className="mb-2 font-semibold text-amber-900">
                    {duplicates.length} duplicata(s) encontrada(s)
                  </h3>
                  <p className="text-sm text-amber-800">
                    Selecione qual registro de profissional manter para cada grupo duplicado. Os
                    dados serão mesclados.
                  </p>
                </div>

                <div className="space-y-4">
                  {duplicates.map((dup, idx) => (
                    <div
                      key={idx}
                      className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <GitMerge className="h-5 w-5 text-amber-600" />
                        <h4 className="font-semibold text-slate-900">
                          {dup.name} ({dup.count} registros)
                        </h4>
                      </div>

                      {dup.relatedUser && (
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                          <strong>Usuário associado:</strong> {dup.relatedUser.full_name} (
                          {dup.relatedUser.email})
                        </div>
                      )}

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-700">Selecione qual manter:</p>
                        {dup.records.map((prof) => (
                          <label
                            key={prof.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${selectedForMerge[idx] === prof.id ? 'border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/5' : 'border-slate-200 hover:bg-slate-50'}`}
                          >
                            <input
                              type="radio"
                              name={`dup_${idx}`}
                              value={prof.id}
                              checked={selectedForMerge[idx] === prof.id}
                              onChange={() => handleSelectForMerge(idx, prof.id)}
                              className="h-4 w-4"
                            />
                            <div className="flex-1 text-sm">
                              <div className="font-medium text-slate-900">{prof.name}</div>
                              <div className="text-slate-500">
                                {prof.email || '-'} | CPF: {prof.cpf || '-'}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={executeMerge}
                    disabled={merging || Object.keys(selectedForMerge).length !== duplicates.length}
                    className="h-12 flex-1 rounded-2xl"
                  >
                    {merging ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Mesclando...
                      </>
                    ) : (
                      <>
                        <GitMerge className="h-5 w-5" />
                        Mesclar Duplicatas
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {(step === 'merging' || step === 'done') && duplicates.length === 0 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <h3 className="mb-2 font-semibold text-emerald-900">
                    Nenhuma duplicata encontrada
                  </h3>
                  <p className="text-sm text-green-800">
                    Agora você pode sincronizar usuários profissionais com a tabela de
                    profissionais.
                  </p>
                </div>

                <Button
                  onClick={executeFullSync}
                  disabled={merging}
                  className="h-12 w-full rounded-2xl"
                >
                  {merging ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      Sincronizar Usuários com Profissionais
                    </>
                  )}
                </Button>
              </div>
            )}

            {step === 'done' && results && (
              <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <h3 className="font-semibold text-blue-900">Resumo da Operação</h3>
                <div className="grid grid-cols-2 gap-4">
                  {results.merged !== undefined && (
                    <div>
                      <p className="text-sm text-blue-700">Registros mesclados</p>
                      <p className="text-2xl font-bold text-blue-900">{results.merged}</p>
                    </div>
                  )}
                  {results.deleted !== undefined && (
                    <div>
                      <p className="text-sm text-blue-700">Duplicatas deletadas</p>
                      <p className="text-2xl font-bold text-blue-900">{results.deleted}</p>
                    </div>
                  )}
                  {results.synced !== undefined && (
                    <div>
                      <p className="text-sm text-blue-700">Novos profissionais criados</p>
                      <p className="text-2xl font-bold text-blue-900">{results.synced}</p>
                    </div>
                  )}
                  {results.syncedUpdated !== undefined && (
                    <div>
                      <p className="text-sm text-blue-700">Profissionais atualizados</p>
                      <p className="text-2xl font-bold text-blue-900">{results.syncedUpdated}</p>
                    </div>
                  )}
                </div>

                {/* Lista de profissionais criados */}
                {results.createdList && results.createdList.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-green-800 mb-2">Profissionais Criados</h4>
                    <ul className="divide-y divide-blue-100">
                      {results.createdList.map((prof) => (
                        <li key={prof.id} className="py-2 text-sm">
                          <span className="font-medium text-blue-900">{prof.name}</span> —{' '}
                          <span className="text-blue-700">{prof.email}</span> | CPF:{' '}
                          <span className="text-blue-700">{prof.cpf || '-'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Lista de profissionais atualizados */}
                {results.updatedList && results.updatedList.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-amber-800 mb-2">Profissionais Atualizados</h4>
                    <ul className="divide-y divide-blue-100">
                      {results.updatedList.map((prof) => (
                        <li key={prof.id} className="py-2 text-sm">
                          <span className="font-medium text-blue-900">{prof.name}</span> —{' '}
                          <span className="text-blue-700">{prof.email}</span> | CPF:{' '}
                          <span className="text-blue-700">{prof.cpf || '-'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
