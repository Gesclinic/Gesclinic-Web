
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PatientTabs from "@/components/pacientes/PatientTabs";
import { supabase } from "@/lib/customSupabaseClient";
import { useToast } from "@/components/ui/use-toast";

export default function PatientProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPatient() {
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setPatient(data);
      } catch (error) {
        console.error("Error fetching patient:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar os dados do paciente.",
        });
        navigate("/clinica/pacientes");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchPatient();
    }
  }, [id, navigate, toast]);

  if (loading) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  if (!patient) {
    return <div className="p-8 text-center">Paciente não encontrado.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <h1 className="text-2xl font-semibold">Prontuário do Paciente</h1>
        </div>
      </div>

      <PatientTabs 
        paciente={patient} 
        setPaciente={setPatient} 
        isNew={false} 
      />
    </div>
  );
}
  