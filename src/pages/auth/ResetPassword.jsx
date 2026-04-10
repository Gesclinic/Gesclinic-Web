import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/customSupabaseClient";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthenticated(!!data?.user);
    });
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    if (!password || password.length < 6) {
      setMsg("A senha deve ter pelo menos 6 caracteres.");
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    setMsg(error ? error.message : "Senha atualizada com sucesso! Faça login novamente.");
    setLoading(false);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded shadow max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4">Redefinir Senha</h2>
          <p>Você precisa acessar este link pelo email de recuperação enviado pelo sistema.<br/>Se não recebeu, utilize a opção <b>"Esqueci minha senha"</b> na tela de login.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleUpdate} className="bg-white p-8 rounded shadow max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">Redefinir Senha</h2>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Nova senha"
          className="w-full p-2 border rounded mb-4"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded font-semibold"
        >
          {loading ? "Atualizando..." : "Atualizar senha"}
        </button>
        {msg && <p className="mt-4 text-center text-red-600">{msg}</p>}
      </form>
    </div>
  );
}
