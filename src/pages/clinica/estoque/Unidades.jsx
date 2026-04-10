import React, { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet";
import { supabase } from "@/lib/customSupabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, PlusCircle, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch"; // Corrected import

export default function Unidades() {
  const { clinicId } = useAuth();
  const { toast } = useToast();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentUnit, setCurrentUnit] = useState(null);
  const [unitName, setUnitName] = useState("");
  const [unitSymbol, setUnitSymbol] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const fetchUnits = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("stock_units")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("name", { ascending: true });

    if (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar unidades.",
        variant: "destructive",
      });
      console.error("Erro ao carregar unidades:", error);
    } else {
      setUnits(data);
    }
    setLoading(false);
  }, [clinicId, toast]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const handleCreateUnit = async () => {
    setFormLoading(true);
    const { data, error } = await supabase
      .from("stock_units")
      .insert({
        clinic_id: clinicId,
        name: unitName,
        symbol: unitSymbol,
        is_active: true,
      })
      .select();

    if (error) {
      toast({
        title: "Erro",
        description: `Falha ao criar unidade: ${error.message}`,
        variant: "destructive",
      });
      console.error("Erro ao criar unidade:", error);
    } else {
      toast({
        title: "Sucesso",
        description: "Unidade criada com sucesso!",
      });
      setIsDialogOpen(false);
      fetchUnits();
    }
    setFormLoading(false);
  };

  const handleUpdateUnit = async () => {
    setFormLoading(true);
    const { data, error } = await supabase
      .from("stock_units")
      .update({
        name: unitName,
        symbol: unitSymbol,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentUnit.id)
      .select();

    if (error) {
      toast({
        title: "Erro",
        description: `Falha ao atualizar unidade: ${error.message}`,
        variant: "destructive",
      });
      console.error("Erro ao atualizar unidade:", error);
    } else {
      toast({
        title: "Sucesso",
        description: "Unidade atualizada com sucesso!",
      });
      setIsDialogOpen(false);
      fetchUnits();
    }
    setFormLoading(false);
  };

  const handleDeleteUnit = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta unidade?")) {
      return;
    }
    const { error } = await supabase
      .from("stock_units")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro",
        description: `Falha ao excluir unidade: ${error.message}`,
        variant: "destructive",
      });
      console.error("Erro ao excluir unidade:", error);
    } else {
      toast({
        title: "Sucesso",
        description: "Unidade excluída com sucesso!",
      });
      fetchUnits();
    }
  };

  const handleEditClick = (unit) => {
    setCurrentUnit(unit);
    setUnitName(unit.name);
    setUnitSymbol(unit.symbol);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleNewUnitClick = () => {
    setCurrentUnit(null);
    setUnitName("");
    setUnitSymbol("");
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (isEditing) {
      handleUpdateUnit();
    } else {
      handleCreateUnit();
    }
  };

  return (
    <>
      <Helmet>
        <title>Unidades de Medida - Gestão de Estoque - Gesclinic Web</title>
        <meta
          name="description"
          content="Gerencie as unidades de medida dos seus itens de estoque na Gesclinic Web."
        />
      </Helmet>

      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#0B63F6] flex items-center gap-2">
            <img alt="Icone de unidades de medida" src="https://images.unsplash.com/photo-1627898791127-fe32965ac37c" />
            Unidades de Medida
          </h1>
          <Button onClick={handleNewUnitClick}>
            <PlusCircle className="mr-2 h-4 w-4" /> Nova Unidade
          </Button>
        </div>

        <Card className="shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle>Lista de Unidades</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#0B63F6]" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Símbolo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">{unit.name}</TableCell>
                      <TableCell>{unit.symbol}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(unit)}
                        >
                          <Edit className="h-4 w-4 text-blue-500" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUnit(unit.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                          <span className="sr-only">Excluir</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="app-dialog-shell app-dialog-shell--compact">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Unidade" : "Nova Unidade"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="unitName" className="text-right">
                Nome
              </Label>
              <Input
                id="unitName"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="unitSymbol" className="text-right">
                Símbolo
              </Label>
              <Input
                id="unitSymbol"
                value={unitSymbol}
                onChange={(e) => setUnitSymbol(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={formLoading}>
                {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Salvar alterações" : "Criar Unidade"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

