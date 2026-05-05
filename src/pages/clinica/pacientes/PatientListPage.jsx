/**
 * ============================================
 * PatientListPage - Lista de Pacientes
 * ============================================
 * /clinica/pacientes
 * Página principal com busca e criação rápida
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { listPatients, deletePatient } from '@/lib/patientsApi';
import { usePagination } from '@/hooks/usePagination';
import PageLayout from '@/components/ui/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Helmet } from 'react-helmet-async';
import {
  Plus,
  Search,
  Trash2,
  Phone,
  Mail,
  Edit2,
  Calendar,
  FileText,
  Eye,
  Users,
  TrendingUp,
  Filter,
  MapPin,
  Download,
  X,
  ChevronDown,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Memoized PatientCard component - redesigned with modern styling
const PatientCard = React.memo(
  ({ patient, idx, handleOpenPatient, navigate, setPatientToDelete, setDeleteDialogOpen }) => {
    const isRecent =
      patient.created_at && new Date() - new Date(patient.created_at) < 7 * 24 * 60 * 60 * 1000;

    // Calcular dias desde a última consulta
    const lastConsultationDays = patient.last_appointment_at
      ? Math.floor((new Date() - new Date(patient.last_appointment_at)) / (1000 * 60 * 60 * 24))
      : null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.05 }}
      >
        <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              {/* Foto - Coluna 1 */}
              <div className="flex-shrink-0">
                {patient.photo_url ? (
                  <img
                    src={patient.photo_url}
                    alt={patient.name}
                    className="w-16 h-20 rounded-lg object-cover border-2 border-blue-200 group-hover:border-blue-400 transition-colors"
                    style={{ aspectRatio: '3/4' }}
                  />
                ) : (
                  <div className="w-16 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg border-2 border-dashed border-blue-300 flex items-center justify-center">
                    <Users size={24} className="text-blue-400" />
                  </div>
                )}
              </div>

              {/* Informações principais - Coluna 2 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate text-base group-hover:text-blue-600 transition-colors">
                      {patient.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {patient.prontuario_numero
                          ? `Proc. ${patient.prontuario_numero}`
                          : 'Sem prontuário'}
                      </Badge>
                      {isRecent && (
                        <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                          Novo
                        </Badge>
                      )}
                      {lastConsultationDays !== null && (
                        <Badge
                          className={`text-xs ${
                            lastConsultationDays <= 30
                              ? 'bg-blue-100 text-blue-700 border-blue-300'
                              : 'bg-yellow-100 text-yellow-700 border-yellow-300'
                          }`}
                        >
                          {lastConsultationDays === 0 ? 'Hoje' : `Há ${lastConsultationDays}d`}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dados de contato - Grid 2 colunas */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 mb-3">
                  {/* CPF */}
                  <div className="flex items-center gap-1.5 text-sm">
                    <FileText size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600 truncate">{patient.document_id || '—'}</span>
                  </div>

                  {/* Telefone */}
                  {patient.phone && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <Phone size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600">{patient.phone}</span>
                    </div>
                  )}

                  {/* Localização */}
                  {(patient.city || patient.state) && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <MapPin size={14} className="text-red-400 flex-shrink-0" />
                      <span className="text-gray-600 truncate">
                        {patient.city}
                        {patient.state ? `, ${patient.state}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Email */}
                  {patient.email && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <Mail size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600 truncate">{patient.email}</span>
                    </div>
                  )}
                </div>

                {/* Convênio se existir */}
                {patient.convenios && patient.convenios.length > 0 && (
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <span className="text-gray-500 text-xs font-medium">Convênios:</span>
                    <div className="flex gap-1 flex-wrap">
                      {patient.convenios.slice(0, 2).map((c, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {c}
                        </Badge>
                      ))}
                      {patient.convenios.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{patient.convenios.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Ações - Coluna 3 */}
              <div className="flex gap-1.5 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenPatient(patient.id)}
                  title="Abrir prontuário"
                  className="hover:bg-blue-50 hover:border-blue-300"
                >
                  <Eye size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/clinica/pacientes/${patient.id}`)}
                  title="Editar"
                  className="hover:bg-emerald-50 hover:border-emerald-300"
                >
                  <Edit2 size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPatientToDelete(patient);
                    setDeleteDialogOpen(true);
                  }}
                  title="Deletar"
                  className="hover:bg-red-50 hover:border-red-300 text-red-600"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.patient.id === nextProps.patient.id &&
      prevProps.patient.name === nextProps.patient.name &&
      prevProps.patient.email === nextProps.patient.email &&
      prevProps.patient.phone === nextProps.patient.phone
    );
  },
);

PatientCard.displayName = 'PatientCard';

export default function PatientListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clinicId } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCity, setFilterCity] = useState('all-cities');
  const [filterStatus, setFilterStatus] = useState('all');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Carregar pacientes ao montar
  useEffect(() => {
    loadPatientsList();
  }, [clinicId]);

  async function loadPatientsList() {
    if (!clinicId) {
      return;
    }
    setLoading(true);
    try {
      const data = await listPatients(clinicId);
      setPatients(data || []);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a lista de pacientes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  // Extrair cidades únicas
  const uniqueCities = useMemo(() => {
    return [...new Set(patients.map((p) => p.city).filter(Boolean))].sort();
  }, [patients]);

  // Função de exportação CSV
  function exportToCSV() {
    if (filteredPatients.length === 0) {
      toast({
        title: 'Aviso',
        description: 'Nenhum paciente para exportar',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['Prontuário', 'Nome', 'CPF', 'Telefone', 'Email', 'Cidade', 'Estado'];
    const rows = filteredPatients.map((p) => [
      p.prontuario_numero || '—',
      p.name,
      p.document_id || '—',
      p.phone || '—',
      p.email || '—',
      p.city || '—',
      p.state || '—',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pacientes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Sucesso',
      description: `${filteredPatients.length} pacientes exportados em CSV`,
    });
  }

  // Calcular estatísticas
  const stats = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPatients = patients.filter(
      (p) => p.created_at && new Date(p.created_at) > thirtyDaysAgo,
    ).length;

    return {
      total: patients.length,
      recent: recentPatients,
    };
  }, [patients]);

  // Filtro de busca, tipo e avançado
  const filteredPatients = useMemo(() => {
    let result = patients;

    // Filtro por tipo
    if (filterType === 'recent') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      result = result.filter((p) => p.created_at && new Date(p.created_at) > thirtyDaysAgo);
    }

    // Filtro por cidade
    if (filterCity && filterCity !== 'all-cities') {
      result = result.filter((p) => p.city === filterCity);
    }

    // Filtro por status
    if (filterStatus === 'active') {
      result = result.filter((p) => p.active !== false);
    } else if (filterStatus === 'inactive') {
      result = result.filter((p) => p.active === false);
    }

    // Filtro por busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(term) ||
          p.document_id?.includes(term) ||
          p.email?.toLowerCase().includes(term) ||
          p.phone?.includes(term),
      );
    }

    return result;
  }, [patients, searchTerm, filterType, filterCity, filterStatus]);

  // Pagination: 50 patients per page
  const {
    items: paginatedPatients,
    pageNum,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
  } = usePagination(filteredPatients, 50);

  // Abrir paciente
  function handleOpenPatient(patientId) {
    navigate(`/clinica/pacientes/${patientId}`);
  }

  // Deletar paciente
  async function handleDeletePatient() {
    if (!patientToDelete) {
      return;
    }

    try {
      await deletePatient(patientToDelete.id);
      setPatients((prev) => prev.filter((p) => p.id !== patientToDelete.id));
      toast({
        title: 'Sucesso',
        description: 'Paciente removido com sucesso',
      });
      setDeleteDialogOpen(false);
      setPatientToDelete(null);
    } catch (error) {
      console.error('Erro ao deletar paciente:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o paciente',
        variant: 'destructive',
      });
    }
  }

  // Limpar filtros
  function clearFilters() {
    setSearchTerm('');
    setFilterType('all');
    setFilterCity('all-cities');
    setFilterStatus('all');
  }

  const hasActiveFilters =
    searchTerm || filterType !== 'all' || filterCity !== 'all-cities' || filterStatus !== 'all';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <>
      <Helmet>
        <title>Pacientes - Gesclinic</title>
      </Helmet>

      <PageLayout title="Pacientes" breadcrumbs={[]}>
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          {/* Header com ações */}
          <motion.div variants={itemVariants} className="flex flex-col gap-4 mb-6">
            <div className="flex justify-between items-center">
              <Button
                onClick={() => navigate('/clinica/pacientes/novo')}
                className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
              >
                <Plus size={18} />
                Novo Paciente
              </Button>
            </div>

            {/* Barra de busca e filtro */}
            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-[250px] relative">
                <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <Input
                  placeholder="Buscar por nome, CPF, email ou telefone..."
                  className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Botões de filtro rápido */}
              <div className="flex gap-2">
                <Button
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('all')}
                  className={filterType === 'all' ? 'bg-blue-600' : ''}
                >
                  Todos
                </Button>
                <Button
                  variant={filterType === 'recent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('recent')}
                  className={filterType === 'recent' ? 'bg-emerald-600' : ''}
                >
                  <TrendingUp size={16} className="mr-1" />
                  Últimos 30d
                </Button>
              </div>

              {/* Filtros avançados */}
              <Popover open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
                <PopoverTrigger asChild>
                  <Button
                    variant={hasActiveFilters ? 'default' : 'outline'}
                    size="sm"
                    className={hasActiveFilters ? 'bg-purple-600' : ''}
                  >
                    <Filter size={16} className="mr-1" />
                    Filtros
                    {hasActiveFilters && (
                      <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded">✓</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Filtros Avançados</h3>

                    {/* Filtro por Cidade */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Cidade</label>
                      <Select value={filterCity} onValueChange={setFilterCity}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas as cidades" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all-cities">Todas as cidades</SelectItem>
                          {uniqueCities.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filtro por Status */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="inactive">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Botão de limpar */}
                    {hasActiveFilters && (
                      <Button onClick={clearFilters} variant="outline" size="sm" className="w-full">
                        <X size={14} className="mr-1" />
                        Limpar filtros
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Botão de exportação */}
              <Button
                onClick={exportToCSV}
                variant="outline"
                size="sm"
                className="hover:bg-green-50 hover:border-green-300"
                title="Exportar em CSV"
              >
                <Download size={16} className="mr-1" />
                Exportar
              </Button>
            </div>

            {/* Stats Cards - Modernizadas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total de Pacientes */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-gradient-to-br from-blue-500 to-blue-600 pb-4 text-white">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
                      <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur">
                        <Users size={20} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 pb-6">
                    <motion.p
                      className="text-4xl font-bold text-blue-600"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 100 }}
                    >
                      {stats.total}
                    </motion.p>
                    <p className="text-xs text-gray-500 mt-2">Cadastrados no sistema</p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Pacientes Recentes */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-gradient-to-br from-emerald-500 to-emerald-600 pb-4 text-white">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Últimos 30 dias</CardTitle>
                      <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur">
                        <TrendingUp size={20} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 pb-6">
                    <motion.p
                      className="text-4xl font-bold text-emerald-600"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 100 }}
                    >
                      {stats.recent}
                    </motion.p>
                    <p className="text-xs text-gray-500 mt-2">Novo(s) paciente(s)</p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Resultados da busca */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-gradient-to-br from-purple-500 to-purple-600 pb-4 text-white">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Resultados</CardTitle>
                      <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur">
                        <Search size={20} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 pb-6">
                    <motion.p
                      className="text-4xl font-bold text-purple-600"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 100 }}
                    >
                      {filteredPatients.length}
                    </motion.p>
                    <p className="text-xs text-gray-500 mt-2">Pacientes encontrados</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>

          {/* Lista de pacientes */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity }}
                className="rounded-full h-12 w-12 border-b-2 border-blue-600"
              />
            </div>
          ) : filteredPatients.length === 0 ? (
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-12 pb-12">
                  <div className="text-center">
                    <motion.div
                      className="text-6xl mb-4"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      👥
                    </motion.div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Nenhum paciente encontrado
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {searchTerm
                        ? 'Tente refinar sua busca'
                        : 'Comece criando o primeiro paciente'}
                    </p>
                    {!searchTerm && (
                      <Button
                        onClick={() => navigate('/clinica/pacientes/novo')}
                        className="bg-gradient-to-r from-blue-600 to-blue-700"
                      >
                        Criar Primeiro Paciente
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div variants={containerVariants} className="grid grid-cols-1 gap-4">
              {paginatedPatients.map((patient, idx) => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  idx={idx}
                  handleOpenPatient={handleOpenPatient}
                  navigate={navigate}
                  setPatientToDelete={setPatientToDelete}
                  setDeleteDialogOpen={setDeleteDialogOpen}
                />
              ))}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <motion.div variants={itemVariants} className="mt-6">
                  <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="text-sm text-gray-600">
                      Página <span className="font-semibold">{pageNum + 1}</span> de{' '}
                      <span className="font-semibold">{totalPages}</span> ({filteredPatients.length}{' '}
                      pacientes)
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={prevPage}
                        disabled={pageNum === 0}
                      >
                        ← Anterior
                      </Button>
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const start = Math.max(0, pageNum - 2);
                          const pageNumber = start + i;
                          if (pageNumber >= totalPages) {
                            return null;
                          }
                          return (
                            <Button
                              key={pageNumber}
                              variant={pageNum === pageNumber ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => goToPage(pageNumber)}
                              className="w-8 h-8 p-0"
                            >
                              {pageNumber + 1}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={nextPage}
                        disabled={pageNum >= totalPages - 1}
                      >
                        Próximo →
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </motion.div>
      </PageLayout>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Paciente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{patientToDelete?.name}</strong>? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePatient}
              className="bg-red-600 hover:bg-red-700"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
