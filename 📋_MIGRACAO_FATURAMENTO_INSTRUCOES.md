# 🔄 MIGRAÇÃO SUPABASE - CAMPOS NF-e, RPS E INTEGRAÇÃO

## 📋 Status: PRONTO PARA EXECUTAR

Arquivo de migração criado: `supabase/migrations/2026-05-22_add_faturamento_nfe_rps_fields.sql`

---

## 📊 O QUE SERÁ ADICIONADO

11 novos campos à tabela `health_insurances` para suportar:
- **NF-e (Notas Fiscais Eletrônicas)**: 4 campos
- **RPS (Recibos Provisórios - ISS)**: 4 campos  
- **Integração**: 3 campos

### Campos Específicos

#### NF-e Configuration
- `nfe_series` (text) - Série NF-e
- `cfm_code` (text) - Código de Formatação de Mensagem
- `is_simple_nacional` (boolean) - Optante Simples Nacional
- `icms_indicator` (text) - Indicador ICMS (0-3)

#### RPS Configuration
- `rps_series` (text) - Série RPS
- `rps_initial` (integer) - RPS Inicial (sequência numérica)
- `rps_type` (text) - Tipo RPS (1=Padrão, 2=Fax, 3=Email)
- `iss_retained` (boolean) - ISS Retido na Fonte

#### Integration Configuration
- `beneficiary_type` (text) - Tipo Beneficiário (operator/insurance/third_party/direct)
- `municipal_service_code` (text) - Código Serviço Municipal
- `enable_nfe_generation` (boolean) - Habilitar Geração NF-e

---

## 🚀 COMO EXECUTAR A MIGRAÇÃO

### OPÇÃO 1: VIA SUPABASE DASHBOARD (Recomendado)

1. **Abra o Supabase Dashboard:**
   ```
   https://app.supabase.com/project/gvdkdjyupktlflwurike/sql
   ```

2. **Faça Login** (use GitHub ou seu email)

3. **Copie o SQL:**
   - Abra: `supabase/migrations/2026-05-22_add_faturamento_nfe_rps_fields.sql`
   - Selecione todo o conteúdo (Ctrl+A)
   - Copie (Ctrl+C)

4. **Cole no SQL Editor do Supabase:**
   - Cole no editor (Ctrl+V)
   - Clique em "Run" (ou Ctrl+Enter)

5. **Confirme a execução:**
   - Aguarde a mensagem de sucesso
   - Você verá: "Migration completed: Added 11 columns..."

---

### OPÇÃO 2: VIA SUPABASE CLI (Alternativa)

#### Passo 1: Autenticar
```bash
supabase login
```
- Abre navegador para GitHub/SSO
- Confirma autorização

#### Passo 2: Link ao Projeto
```bash
supabase link --project-ref gvdkdjyupktlflwurike
```

#### Passo 3: Push da Migração
```bash
supabase db push
```

---

## ✅ VERIFICAÇÃO PÓS-MIGRAÇÃO

Após executar, verifique que os campos foram criados:

```sql
-- No SQL Editor do Supabase, execute:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'health_insurances'
  AND column_name IN (
    'nfe_series', 'cfm_code', 'is_simple_nacional', 'icms_indicator',
    'rps_series', 'rps_initial', 'rps_type', 'iss_retained',
    'beneficiary_type', 'municipal_service_code', 'enable_nfe_generation'
  )
ORDER BY ordinal_position;
```

Deve retornar 11 linhas com os novos campos.

---

## 🔗 RELAÇÃO COM CÓDIGO

O código React em `src/pages/clinica/base-sistema/ConveniosPage.jsx` **JÁ ESTÁ PRONTO** para:
- Ler estes campos ao carregar um convênio
- Salvar estes campos ao atualizar um convênio
- Exibir formulários na aba "Faturamento"

Após executar esta migração, todos os 11 novos campos funcionarão perfeitamente!

---

## 📝 DETALHES TÉCNICOS

### Arquivo SQL
- **Path:** `supabase/migrations/2026-05-22_add_faturamento_nfe_rps_fields.sql`
- **Tamanho:** 41 linhas
- **Tipo:** ALTER TABLE (não destrutivo)
- **Rollback:** Fácil (DROP COLUMN para cada campo)

### RLS (Row Level Security)
- Todos os campos herdam RLS da tabela
- Apenas usuários com `clinic_id` correto podem acessar
- Seguro para multi-tenant

### Índices
- Nenhum índice adicional necessário por enquanto
- `beneficiary_type` pode ser indexado em futuro se houver queries frequentes

---

## 🎯 PRÓXIMOS PASSOS

1. **Execute esta migração** ⬅️ Você está aqui
2. Reload da página do navegador
3. Teste salvando um novo convênio com os novos campos
4. Implemente XML generation logic (futuro)

---

## 🆘 TROUBLESHOOTING

**Erro: "Column already exists"**
- Migração já foi aplicada anteriormente
- Use `ALTER TABLE` com `IF NOT EXISTS` (já implementado)

**Erro: "Permission denied"**
- Use a service role key, não a anon key
- Alternativa: Execute via Supabase Dashboard (requer login)

**Erro: "Connection refused"**
- Verifique VITE_SUPABASE_URL no .env
- Verifique conectividade internet

---

## 📞 CONTATO & SUPORTE

Se tiver dúvidas:
1. Consulte `src/lib/healthInsurancesApi.js` para entender a API
2. Verifique `src/pages/clinica/base-sistema/ConveniosPage.jsx` para ver como os campos são usados
3. Leia comentários na SQL para documentação dos campos

---

**Criado em:** 2026-05-22  
**Versão:** 1.0  
**Status:** Pronto para Deploy ✅
