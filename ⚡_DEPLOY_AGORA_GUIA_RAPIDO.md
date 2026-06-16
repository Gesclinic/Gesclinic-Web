╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║                   ⚡ DEPLOY AGORA - 4 PASSOS (5 MINUTOS)                   ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝

VOCÊ TEM 2 OPÇÕES:

┌────────────────────────────────────────────────────────────────────────────┐
│ OPÇÃO 1: CLI DEPLOY (Automático - 30 segundos se funcionar)                │
│                                                                            │
│ Abra terminal PowerShell aqui e rode:                                      │
│                                                                            │
│   cd c:\dev\gesclinic-web                                                  │
│   supabase functions deploy send-report                                    │
│   supabase functions deploy schedule-report                                │
│                                                                            │
│ Se pedir login:                                                            │
│   supabase login                                                           │
│   (abrir browser, fazer login, voltar)                                     │
│                                                                            │
│ ✅ Se funcionar, você verá: "Function deployed successfully!"              │
└────────────────────────────────────────────────────────────────────────────┘

         OU

┌────────────────────────────────────────────────────────────────────────────┐
│ OPÇÃO 2: DASHBOARD MANUAL (Gráfico - 5 minutos)                            │
│                                                                            │
│ 1️⃣  Abra: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/functions
│                                                                            │
│ 2️⃣  Clique em: [Deploy a new function ▼] → Selecione [TypeScript]         │
│                                                                            │
│ 3️⃣  Nome: send-report                                                      │
│                                                                            │
│ 4️⃣  Copie TODO este código e cole na área de código:                       │
│                                                                            │
│ ───────────────────────────────────────────────────────────────────────   │
│                                                                            │
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface SendReportRequest {
  to: string;
  clinic_id: string;
  clinic_name: string;
  report_type: string;
  attach_pdf?: boolean;
  attach_excel?: boolean;
  dashboardData?: any;
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const body = (await req.json()) as SendReportRequest;
    const { to, clinic_id, clinic_name, report_type } = body;

    if (!to || !clinic_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500 });
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "relatorios@gesclinic.com",
        to: to,
        subject: `Relatorio Financeiro - ${clinic_name}`,
        html: `<h1>Relatorio Financeiro</h1><p>Seu relatorio foi gerado com sucesso!</p>`,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 500 });
    }

    const resendData = await resendResponse.json();
    return new Response(JSON.stringify({ success: true, email_id: resendData.id }), { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});
│                                                                            │
│ ───────────────────────────────────────────────────────────────────────   │
│                                                                            │
│ 5️⃣  Clique em [Deploy] e aguarde ✅                                         │
│                                                                            │
│ 6️⃣  Repita o processo para schedule-report (código abaixo):               │
│                                                                            │
│ ───────────────────────────────────────────────────────────────────────   │
│                                                                            │
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ScheduleReportRequest {
  to: string;
  recipient_name?: string;
  clinic_id: string;
  clinic_name: string;
  frequency: string;
  attach_pdf?: boolean;
  attach_excel?: boolean;
  action: "create" | "update" | "delete";
  schedule_id?: string;
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const body = (await req.json()) as ScheduleReportRequest;
    const { to, clinic_id, action, schedule_id } = body;

    if (!to || !clinic_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Supabase not configured" }), { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "delete" && schedule_id) {
      await supabase.from("email_schedules").delete().eq("id", schedule_id).eq("clinic_id", clinic_id);
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    const data = {
      clinic_id,
      recipient_email: to,
      recipient_name: body.recipient_name || to,
      frequency: body.frequency || "daily",
      attach_pdf: body.attach_pdf !== false,
      attach_excel: body.attach_excel !== false,
      status: "active",
      next_run: new Date().toISOString(),
    };

    if (action === "update" && schedule_id) {
      await supabase.from("email_schedules").update(data).eq("id", schedule_id);
    } else {
      await supabase.from("email_schedules").insert(data);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});
│                                                                            │
│ ───────────────────────────────────────────────────────────────────────   │
│                                                                            │
│ 7️⃣  Após ambas funções estarem deployed:                                  │
│     - send-report ✅                                                       │
│     - schedule-report ✅                                                   │
│                                                                            │
│ 8️⃣  Configure os secrets (Settings → Secrets):                            │
│     Key: RESEND_API_KEY                                                    │
│     Value: re_AZrP6xN3_G4UoXqZdhvuTHDrdUDseUP3o                             │
│                                                                            │
│     Key: SUPABASE_SERVICE_ROLE_KEY                                         │
│     Value: (encontre em Settings → API → Service Role Secret Key)          │
│                                                                            │
│ ✅ DEPLOY COMPLETO!                                                        │
└────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

✨ FASE 4.2 - VALIDAÇÃO FINAL (DEPOIS DE DEPLOY):

1. Vá para: http://localhost:3000/clinica/financeiro/fluxo-caixa

2. Clique em "Exportar"

3. Aba "Agendar Email"

4. Preencha:
   - Email: seu_email@example.com
   - Recipient Name: Seu Nome
   - Frequency: Diariamente

5. Clique "Enviar Agora"

6. Verifique se você recebeu o email (5-10 segundos)

7. Sucesso! ✅

═══════════════════════════════════════════════════════════════════════════════

📚 ARQUIVOS DE REFERÊNCIA:

   PHASE_4_DEPLOY_EDGE_FUNCTIONS.md  (documentação completa)
   PHASE_4_DEPLOY_VISUAL.txt  (instruções detalhadas)
   supabase/functions/send-report/index.ts  (código local)
   supabase/functions/schedule-report/index.ts  (código local)

⏱️  Tempo esperado: 5-10 minutos

Pronto para começar? Escolha Opção 1 (CLI) ou Opção 2 (Dashboard).
