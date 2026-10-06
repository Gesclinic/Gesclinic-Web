# Homologação de login, sessões e permissões

Use um projeto Supabase exclusivo para homologação, com dados fictícios. Nada nesta pasta foi executado contra um banco. Não copie chaves `service_role` para arquivos `VITE_*` nem para o navegador.

## Preparação

1. Confira o esquema real de homologação com `security/inspect_rls.sql`. Revise `security/rls_hardening_candidate.sql` nesse esquema antes de aplicá-lo **somente em homologação**. O login seguro depende da função `gesclinic_consume_login_attempt` desse SQL; sem ela, responde 503.
2. Configure as Edge Functions `secure-login` e `manage-user-auth` no projeto de homologação e seus segredos de servidor (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). A criação de usuários pela interface depende de `manage-user-auth`.
3. Copie `.env.example` para `.env.local` e preencha apenas a URL e a chave pública do projeto de homologação, `VITE_APP_ENV=homologation` e a URL local do aplicativo. Use `npm install`, `npm run dev -- --port 3000` para abrir o frontend.
4. Crie duas clínicas fictícias no projeto, por exemplo `HML-ALFA` e `HML-BETA`, com `clinic_code` diferentes. Cada uma deve ter um tenant, uma company e uma filial conforme a migração multiempresa. Verifique o esquema antes de inserir: os campos obrigatórios variam entre instalações.
5. No Supabase Auth de homologação, crie contas confirmadas com e-mails fictícios, por exemplo `admin.alfa@example.test`, `recepcao.alfa@example.test`, `admin.beta@example.test` e `bloqueado.alfa@example.test`. Crie as linhas de `public.users` com **o mesmo UUID** de cada conta Auth, `username` único, `clinic_id` correto, papel e `status='ativo'`. Crie `user_companies` para as respectivas empresas, com `is_active=true`, exceto a conta bloqueada, que deve ter `is_active=false`. Use senhas fictícias fortes exclusivas de homologação.

## Verificação automática, somente leitura de dados clínicos

Defina `HML_SUPABASE_URL`, `HML_SUPABASE_ANON_KEY`, `HML_PROJECT_REF`, `HML_CLINIC_A_CODE`, `HML_ADMIN_A_USER`, `HML_ADMIN_A_PASSWORD`, `HML_ADMIN_A_ID`, `HML_CLINIC_B_ID` e `HML_ASSERT_NON_PRODUCTION=YES_I_VERIFIED_HOMOLOGATION` no ambiente local. Opcionalmente, defina `HML_PATIENT_B_ID` com um paciente fictício da clínica B, `HML_BLOCKED_A_USER` e `HML_BLOCKED_A_PASSWORD`. Execute `node security/homologation/verify-auth.mjs`. O script não imprime senhas ou tokens. Ele testa login, leitura do próprio perfil, bloqueio de leitura anônima de usuários e de `password_hash`, isolamento da clínica B e do paciente fictício, e logout. Ele gera uma tentativa de login inválida para validar recusa e consumir um crédito do limitador.

## Roteiro no navegador

1. Entre em `localhost:3000/login` com `HML-ALFA` e `admin.alfa`. Confira a navegação administrativa e o `clinic_id` exibido.
2. Feche/reabra a aba, recarregue e confirme que a sessão válida persiste. Faça logout e confirme que `/clinica` redireciona para login.
3. Entre como `recepcao.alfa`. Acesse diretamente uma rota administrativa e confirme bloqueio; confirme que as telas permitidas carregam.
4. Entre como `admin.beta`. Confira que pacientes, usuários e clínica A não aparecem em consultas nem na interface.
5. Tente entrar como `bloqueado.alfa` com a senha correta. O login deve ser recusado. Repita com um perfil `status='inativo'`.
6. Durante uma sessão aberta, revogue a associação em `user_companies`, retorne o foco à aba e confira que o acesso à clínica é removido. Teste a troca de papel e confirme as permissões após recarga.
7. Tente senha errada, token vencido, atualização da página e redefinição de senha. Verifique que a interface não contém tokens, hashes ou chaves privadas em mensagens e logs.

## Convênios e integrações fictícias

Depois de confirmar as políticas RLS de `health_insurances`, revise e teste `security/20260923_health_insurance_secret_columns_candidate.sql` no banco isolado. A alteração retira leitura de quatro colunas de segredo para `anon` e `authenticated`; o servidor TISS usa `service_role` para ler a credencial. Verifique, com contas fictícias de ambas as clínicas, que `SELECT` das colunas de segredo e `SELECT *` falham, que os campos normais continuam sujeitos ao isolamento por clínica e que uma edição com senha vazia preserva a credencial anterior. Use apenas endpoint TISS de teste com `TISS_ALLOWED_HOSTS` restrito; não envie dados clínicos reais.

O fluxo Stripe requer chaves de teste, webhook de teste e a migração candidata `security/20260923_stripe_event_idempotency.sql` antes de exercitar eventos repetidos. Confirme que uma clínica não consegue criar ou confirmar a sessão da outra e que um evento repetido não duplica pagamento. Nenhuma dessas migrações foi aplicada por este trabalho.

O script não substitui os testes de RLS com pacientes fictícios de homologação; crie dois pacientes de teste distintos e tente consultas cruzadas sob cada conta.
