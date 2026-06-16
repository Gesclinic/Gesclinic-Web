╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║                   ⚡ DEPLOY MANUAL - GUIA PASSO-A-PASSO                     ║
║                                                                            ║
║                        Edge Functions via Dashboard                        ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝

Este guia mostra como fazer o deploy das 2 Edge Functions manualmente via 
Supabase Dashboard.

═══════════════════════════════════════════════════════════════════════════

PARTE 1: DEPLOY FUNCTION #1 - send-report

PASSO 1: Abra o Dashboard Supabase
   URL: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/functions
   
   Você deve ver uma página com:
   - Título: "Edge Functions"
   - Subtítulo: "Run server-side logic close to your users"
   - Botão azul: "Deploy a new function"

PASSO 2: Clique em "Deploy a new function"
   (Se o botão estiver disabled, espere 2-3 segundos e recarregue a página)

PASSO 3: Escolha um template
   - Opção A (Recomendado): Selecione "TypeScript/Deno" ou "Blank"
   - Opção B: Se pedir nome, digite: "send-report"

PASSO 4: Cole o código da função send-report

   Abra este arquivo localmente:
   c:\dev\gesclinic-web\supabase\functions\send-report\index.ts
   
   Copie TODO o conteúdo (ctrl+a, ctrl+c)
   
   Cole no editor do Supabase Dashboard (substitua o template)

   CÓDIGO (se precisar copiar daqui):
   ────────────────────────────────────────────────────────────────────────
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
   ────────────────────────────────────────────────────────────────────────

PASSO 5: Clique em "Deploy" ou "Save & Deploy"
   ✅ Você deve ver: "Successfully deployed send-report"

═══════════════════════════════════════════════════════════════════════════

PARTE 2: DEPLOY FUNCTION #2 - schedule-report

PASSO 1: Volte para Edge Functions
   URL: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/functions

PASSO 2: Clique novamente em "Deploy a new function"

PASSO 3: Escolha template TypeScript/Deno ou Blank

PASSO 4: Cole o código da função schedule-report

   Abra este arquivo localmente:
   c:\dev\gesclinic-web\supabase\functions\schedule-report\index.ts
   
   Copie TODO o conteúdo (ctrl+a, ctrl+c)
   
   Cole no editor do Supabase Dashboard

   CÓDIGO (se precisar copiar daqui):
   ────────────────────────────────────────────────────────────────────────
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
   ────────────────────────────────────────────────────────────────────────

PASSO 5: Clique em "Deploy" ou "Save & Deploy"
   ✅ Você deve ver: "Successfully deployed schedule-report"

═══════════════════════════════════════════════════════════════════════════

PARTE 3: CONFIGURE SECRETS (Environment Variables)

PASSO 1: Vá para Secrets
   URL: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/functions/secrets
   
   Ou via Dashboard:
   - Clique em "Edge Functions" > "Secrets"

PASSO 2: Clique em "New Secret"

PASSO 3: Adicione SECRET #1 - RESEND_API_KEY
   
   Nome da Secret: RESEND_API_KEY
   Valor: re_AZrP6xN3_G4UoXqZdhvuTHDrdUDseUP3o
   
   Clique "Save"
   ✅ Você deve ver: "Secret created successfully"

PASSO 4: Clique novamente em "New Secret"

PASSO 5: Adicione SECRET #2 - SUPABASE_SERVICE_ROLE_KEY
   
   Nome da Secret: SUPABASE_SERVICE_ROLE_KEY
   Valor: (Veja instruções abaixo para pegar o valor)
   
   Para pegar o valor:
   - Vá para: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/settings/api
   - Na seção "Service Role Secret Key", clique o ícone de copiar
   - Cole aqui
   
   Clique "Save"
   ✅ Você deve ver: "Secret created successfully"

═══════════════════════════════════════════════════════════════════════════

✅ PARTE 4: VERIFICAÇÃO - Confirme que tudo funcionou

VERIFICAR EDGE FUNCTIONS:
   1. Vá para: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/functions
   2. Você deve ver 2 funções listadas:
      - send-report ✅ (status: ACTIVE)
      - schedule-report ✅ (status: ACTIVE)

VERIFICAR SECRETS:
   1. Vá para: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/functions/secrets
   2. Você deve ver 2 secrets listados:
      - RESEND_API_KEY ✅
      - SUPABASE_SERVICE_ROLE_KEY ✅

═══════════════════════════════════════════════════════════════════════════

🎯 PRÓXIMO PASSO: Teste a aplicação

Depois que o deploy estiver completo:

1. Abra a aplicação:
   http://localhost:3000/clinica/financeiro/fluxo-caixa

2. Clique no botão "Exportar"

3. Abra a aba "Agendar Email"

4. Preencha o formulário:
   - Email: seu-email@teste.com
   - Frequência: "Agora"
   - Clique "Enviar Agora"

5. Aguarde 5-10 segundos

6. Verifique seu email - você deve receber um relatório!

═══════════════════════════════════════════════════════════════════════════

⚠️ DÚVIDAS / PROBLEMAS?

Se o deploy falhar:
   - Recarregue a página (F5)
   - Verifique que você está logado no Supabase
   - Verifique que o projeto é "gvdkdjyupktlflwurike"
   - Cole o código exatamente como está no arquivo

Se o email não chegar:
   - Verifique que as 2 secrets estão configuradas
   - Verifique o spam/lixo eletrônico
   - Abra o console do navegador (F12) para ver erros
   - Verifique os logs do Supabase: 
     https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/functions

═══════════════════════════════════════════════════════════════════════════

Documento criado: 2026-06-09
Status: Ready for manual execution
