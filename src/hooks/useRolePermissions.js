import { useState, useEffect } from "react";
import { supabase } from "@/lib/customSupabaseClient";

export function useRolePermissions(roleId) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleId) return;

    async function load() {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .eq("role_id", roleId);

      if (error) console.error("❌ useRolePermissions error:", error);

      setPermissions(data || []);
      setLoading(false);
    }

    load();
  }, [roleId]);

  return { permissions, loading };
}
