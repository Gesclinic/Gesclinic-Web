import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useToast } from "@/components/ui/use-toast";

/**
 * Hook de proteção de rotas por função (RBAC)
 * @param {Array<string>} allowedRoles - lista de funções que podem acessar a rota
 * @returns {{authorized: boolean, loading: boolean, role: string|null}}
 */
export function useRoleGuard(allowedRoles = []) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, currentRole, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Só executa a lógica depois que a autenticação terminar de carregar
    if (authLoading) {
      return;
    }

    // Se não há sessão, redireciona para o login
    if (!session) {
      navigate("/login", { replace: true });
      return;
    }

    // Se não há roles permitidas, autoriza (só requer login)
    if (allowedRoles.length === 0) {
      setAuthorized(true);
      setLoading(false);
      return;
    }
    
    // Se a role do usuário ainda não carregou, espera
    if (!currentRole) {
       return; 
    }

    // Verifica se a role atual está na lista de permitidas
    const isAllowed = allowedRoles.map(r => r.toLowerCase()).includes(currentRole.toLowerCase());

    if (isAllowed) {
      setAuthorized(true);
    } else {
      setAuthorized(false);
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Você não tem permissão para acessar esta página.",
      });
      navigate("/nao-autorizado", { replace: true });
    }
    
    setLoading(false);

  }, [authLoading, session, currentRole, allowedRoles, navigate, toast]);

  return { authorized, loading: authLoading || loading, role: currentRole };
}