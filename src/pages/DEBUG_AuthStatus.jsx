import React from "react";
import { useAuth } from "@/contexts/SupabaseAuthContext";

export default function DebugAuthStatus() {
  const auth = useAuth();

  return (
    <div style={{ padding: "20px", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
      <h1>🔍 DEBUG: Auth Status</h1>
      <p><strong>User:</strong> {JSON.stringify(auth.user, null, 2)}</p>
      <p><strong>ClinicId:</strong> {auth.clinicId || "❌ NULL"}</p>
      <p><strong>CurrentRole:</strong> {auth.currentRole || "❌ NULL"}</p>
      <p><strong>Loading:</strong> {auth.loading ? "true" : "false"}</p>
      <p><strong>IsAuthenticated:</strong> {auth.isAuthenticated ? "✅ true" : "❌ false"}</p>
    </div>
  );
}
