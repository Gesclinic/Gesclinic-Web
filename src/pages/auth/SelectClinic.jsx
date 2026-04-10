
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useClinicContext } from "@/contexts/useClinicContext";
import { Card } from "@/components/ui/card";

export default function SelectClinic() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const clinicContext = useClinicContext();
  const changeClinic = clinicContext?.changeClinic;

  const [loading, setLoading] = useState(true);
  const [clinics, setClinics] = useState([]);

  useEffect(() => {
    console.log("[SelectClinic] session:", session);
    if (!session?.user?.id) {
      console.warn("[SelectClinic] Usuário não autenticado ou id ausente.");
      setLoading(false);
      return;
    }

    async function loadClinics() {
      const { data, error } = await supabase
        .from("user_clinics")
        .select("clinic_id, clinics(name, code)")
        .eq("user_id", session.user.id)
        .eq("status", "active");
      console.log("[SelectClinic] Supabase clinics data:", data, error);
      if (error) {
        console.error("[SelectClinic] Erro ao buscar clínicas:", error.message);
      }
      if (data && data.length) {
        setClinics(data);
      }
      setLoading(false);
    }

    loadClinics();
  }, [session]);

  const handleSelect = async (clinicRow) => {
    const clinic = {
      id: clinicRow.clinic_id,
      code: clinicRow.clinics.code,
      name: clinicRow.clinics.name,
    };

    clinicContext?.updateClinicDirectly?.(clinic);

    navigate("/dashboard");
  };

  if (loading)
    return <div className="p-8 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-xl w-full space-y-6">
        <h1 className="text-3xl font-bold text-center">Selecione a Clínica</h1>

        {clinics.map((c) => (
          <Card
            key={c.clinic_id}
            onClick={() => handleSelect(c)}
            className="p-4 border cursor-pointer hover:bg-gray-100 transition rounded-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{c.clinics.name}</h2>
                <p className="text-gray-500">{c.clinics.code}</p>
              </div>
              <span className="text-blue-600 font-semibold">Selecionar →</span>
            </div>
          </Card>
        ))}

        {clinics.length === 0 && (
          <div className="text-center text-gray-600">
            Nenhuma clínica vinculada à sua conta.
          </div>
        )}
      </div>
    </div>
  );
}
