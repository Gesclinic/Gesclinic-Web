import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/customSupabaseClient";
import RolesTable from "@/components/roles/RolesTable";
import EditRoleModal from "@/components/roles/EditRoleModal";
import { Button } from "@/components/ui/button";

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [editingRole, setEditingRole] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadRoles() {
    const { data } = await supabase
      .from("roles")
      .select("*")
      .order("role_name");

    setRoles(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadRoles();
  }, []);

  function openCreate() {
    setEditingRole({ isNew: true, role_name: "", description: "" });
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Papéis do Sistema</h1>

      <div className="text-right mt-4 mb-4">
        <Button onClick={openCreate}>+ Criar Papel</Button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <RolesTable roles={roles} onEdit={setEditingRole} />
      )}

      {editingRole && (
        <EditRoleModal
          role={editingRole}
          onClose={() => setEditingRole(null)}
          onSaved={loadRoles}
        />
      )}
    </div>
  );
}
