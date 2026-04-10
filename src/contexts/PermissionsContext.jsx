import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./SupabaseAuthContext";

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    if (!user) {
      setPermissions([]);
      return;
    }

    async function load() {
      if (user.role === "admin") {
        // Admin tem todas as permissões
        setPermissions(["*"]);
        return;
      }

      // Aqui você pode futuramente puxar permissões reais via Supabase
      setPermissions(["clinic.read", "agenda.read"]);
    }

    load();
  }, [user]);

  function hasPermission(key) {
    if (permissions.includes("*")) return true;
    return permissions.includes(key);
  }

  return (
    <PermissionsContext.Provider value={{ permissions, hasPermission }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
