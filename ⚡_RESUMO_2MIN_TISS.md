# ⚡ RESUME 2 MIN - TISS ESTRUTURADO

## O que mudou?

### Aba "Liberação" 
**Novo padrão TISS**

| Antes | Agora |
|-------|-------|
| Nº Carteirinha (opcional) | Matrícula (obrigatório) |
| Nº Autorização (sempre pede) | Requer Autorização? (Sim/Não) |
| Sem status | Status da Autorização (Aprovada/Parcial/Pendente/Negada) |

### Aba "Faturamento"
**Novo padrão TISS XM**

| Novo Campo | O quê? |
|-----------|--------|
| Tipo de Guia TISS | Consulta / Procedimento / Internação / Urgência / Exame |
| Tipo de Código | TUSS / CBHPM / CPT |
| Código Procedimento | Código numérico (ex: 30101020) |
| Data do Atendimento | Data (preenchida automática) |
| Local de Atendimento | Onde foi feito (Consultório, Hospital, etc) |
| Nº Guia TISS | Sequencial de 9 dígitos (OBRIGATÓRIO) |
| Valor Solicitado | R$ que você cobra |
| Valor Autorizado | R$ que a operadora aceita pagar |

---

## 🗄️ Banco de Dados

**Novas colunas para `appointments`:**
- `billing_data` (JSON) → Estrutura TISS completa
- `billing_status` (TEXT) → Status (pending/structured/sent/approved/denied)
- `billing_xml` (TEXT) → XML gerado (opcional)

---

## 🚀 AÇÕES AGORA

### 1. Executar SQL (Supabase → SQL Editor)
Copiar conteúdo de:
```
supabase\migrations\2026-02-20_add_tiss_fields.sql
```

### 2. Testar no Frontend
```
Recepção → Registrar chegada → Abrir atendimento
→ Dados Cadastrais → Liberação Nova → Faturamento Nova
```

### 3. Verificar Dados Salvos
Os dados são salvos em `appointments.billing_data` como JSON estruturado

---

## 🎯 Compatibilidade

✅ Unimed  
✅ Fundação Copele  
✅ Fundação Sanepar  
✅ Itamed  
✅ PAM  
✅ SUS  
✅ Consórcios Intermunicipais  

Todas as operadoras usam o mesmo padrão TISS, apenas com variações pequenas que podem ser customizadas por operadora no JSON.

---

## 📖 Documentação Completa

👉 Ver arquivo: `⚡_GUIA_TISS_ESTRUTURADO.md`
