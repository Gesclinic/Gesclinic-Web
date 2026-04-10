// === PACIENTES.JSX CORRIGIDO ===

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Filter, Trash2, Phone, Mail, MapPin, Pencil, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import PatientDialog from "@/components/pacientes/PatientDialog";
import { useAuth } from "@/contexts/SupabaseAuthContext.jsx";
import { listPatients, createPatient, updatePatient, deletePatient } from "@/lib/patientsApi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/ui/PageLayout";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";

export default function Pacientes() {
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const navigate = useNavigate();

  const breadcrumbs = useBreadcrumbs([
    { label: "Pacientes" },
    { label: "Cadastro" }
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [dlgOpen, setDlgOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  /** ==========================
   *  FORMAT ADDRESS
   * ========================== */
  function formatAddress(p) {
    const parts = [];

    if (p.street) parts.push(p.street);
    if (p.number) parts.push(p.number);
    if (p.neighborhood) parts.push(p.neighborhood); // <-- corrigido
    if (p.city) parts.push(p.city);
    if (p.state) parts.push(p.state);

    let line = parts.filter(Boolean).join(", ");

    if (p.zip_code) line += ` – CEP ${p.zip_code}`;

    return line || null;
  }

  /** ==========================
   *  LOAD LIST
   * ========================== */
  async function refresh() {
    if (!clinicId) return;
    setLoading(true);
    const data = await listPatients(clinicId, { q: searchTerm });
    setRows(data);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [clinicId, searchTerm]);

  function onKeyDown(e) {
    if (e.key === "Enter") refresh();
  }

  /** ==========================
   *  CRUD
   * ========================== */
  async function handleCreate(payload) {
    try {
      setLoading(true);
      await createPatient(clinicId, payload);
      toast({ title: "Paciente criado" });
      setDlgOpen(false);
      await refresh();
    } catch (e) {
      toast({ title: "Erro ao criar paciente", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(payload) {
    try {
      setLoading(true);
      await updatePatient(editing.id, payload);
      toast({ title: "Paciente atualizado" });
      setDlgOpen(false);
      await refresh();
    } catch (e) {
      toast({ title: "Erro ao atualizar paciente", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deletePatient(id);
      toast({ title: "Paciente arquivado" });
      await refresh();
    } catch (e) {
      toast({ title: "Erro ao arquivar", description: e.message, variant: "destructive" });
    }
  }

  async function handleSave(payload) {
    if (editing?.id) {
      await handleUpdate(payload);
    } else {
      await handleCreate(payload);
    }
  }

  function handleAddNew() {
    setEditing(null);
    setDlgOpen(true);
  }

  function handleEditPatient(row) {
    setEditing(row);
    setDlgOpen(true);
  }

  function handleEditButton(e, row) {
    e.stopPropagation();
    setEditing(row);
    setDlgOpen(true);
  }

  /** ==========================
   *  SEARCH + FILTER
   * ========================== */
  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    const q = searchTerm.toLowerCase();

    return rows.filter((p) => {
      return (
        p.full_name?.toLowerCase().includes(q) ||
        p.cpf?.includes(q) ||
        p.gender?.toLowerCase().includes(q)
      );
    });
  }, [rows, searchTerm]);

  /** ==========================
   *  RENDER
   * ========================== */
  return (
    <PageLayout
      title="Pacientes"
      subtitle="Gerencie o cadastro de pacientes."
      breadcrumbs={breadcrumbs}
      actions={
        <Button 
          onClick={handleAddNew}
          className="bg-primary text-white hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Paciente
        </Button>
      }
    >
      <Helmet>
        <title>Pacientes - Gesclinic</title>
      </Helmet>

      <div className="space-y-6">
        {/* BUSCA */}
        <Card className="medical-card">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por nome, CPF ou gênero..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={onKeyDown}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" disabled>
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* LISTAGEM */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="medical-card">
            <CardHeader>
              <CardTitle>Lista de Pacientes ({filteredRows.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">

                {filteredRows.map((p, index) => {
                  const address = formatAddress(p);

                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">

                        <div className="flex items-center space-x-4 cursor-pointer flex-1" onClick={() => handleEditPatient(p)}>

                          {/* Avatar */}
                          {p.photo_url ? (
                            <img
                              src={p.photo_url}
                              alt={p.full_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                              {p.full_name?.split(" ").map((n) => n[0]).join("").substring(0, 2)}
                            </div>
                          )}

                          <div className="flex-1">
                            
                            {/* Nome + STATUS + GÊNERO */}
                            <div className="flex items-center space-x-3">
                              <h3 className="font-semibold text-gray-900">{p.full_name}</h3>

                              {p.gender && (
                                <Badge className="bg-primary text-white">
                                  {p.gender}
                                </Badge>
                              )}

                              {p.status === "inativo" && (
                                <Badge className="bg-gray-400 text-white">Inativo</Badge>
                              )}
                            </div>

                              {/* Contatos */}
                              <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
                                {p.record_number && (
                                  <div className="flex items-center" title="Prontuário">
                                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                                    {p.record_number}
                                  </div>
                                )}
                                {p.cell_phone && (
                                  <div className="flex items-center">
                                    <Phone className="w-3.5 h-3.5 mr-1.5" />
                                    {p.cell_phone}
                                  </div>
                                )}
                                {p.email && (
                                  <div className="flex items-center">
                                    <Mail className="w-3.5 h-3.5 mr-1.5" />
                                    {p.email}
                                  </div>
                                )}
                                {address && (
                                  <div className="flex items-center">
                                    <MapPin className="w-3.5 h-3.5 mr-1.5" />
                                    {address}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Ações */}
                          <div className="flex items-center space-x-1">
                            <Button variant="ghost" size="icon" onClick={(e) => handleEditButton(e, p)} title="Editar Cadastro">
                              <Pencil className="w-4 h-4" />
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação irá arquivar o paciente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(p.id)}>
                                    Sim, arquivar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                          </div>
                        </div>
                    </motion.div>
                  );
                })}

              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* MODAL */}
        {dlgOpen && (
          <PatientDialog
            open={dlgOpen}
            onOpenChange={setDlgOpen}
            initialData={editing}
            onSubmit={handleSave}
          />
        )}

      </div>
    </PageLayout>
  );
}

