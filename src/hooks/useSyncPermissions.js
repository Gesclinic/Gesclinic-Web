import { useEffect } from "react";
import { syncUserWithRole } from "@/api/permissions/syncUserWithRole";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useClinic } from "@/contexts/useClinicContext";

export function useSyncPermissions(roleId) {
  const { session } = useAuth();
  const { clinic } = useClinic();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!roleId || !userId || !clinic?.id) return;

    syncUserWithRole({
      userId,
      clinicId: clinic.id,
      roleId,
    });
  }, [roleId, userId, clinic]);
}
