# 📋 Incluir CBHPM e Serviços na Base

## 📌 O que será inserido

✅ **50 Procedimentos CBHPM** com:
- 10 Consultas (Clínico Geral, Cardio, Derma, Orto, Oftalmologia, Ginecologia, Urologia, Pediatria, Pneumologia, Gastroenterologia)
- 14 SADT (ECG, Testes, Ultrassonografias, Radiografias, Tomografias, EEG, Espirometria)
- 10 Procedimentos (Suturas, Curativos, Infiltrações, Injeções, etc)
- 5 Internações (Diárias e Taxas Operatórias)
- 11 Outros (Coletas, Testes, Vacinas, etc)

✅ **50 Serviços Correspondentes** com:
- Duração estimada por tipo
- Valores base conforme CBHPM
- TUSS Code mapeado
- Categoria configurada

---

## 🔧 Como executar

### Opção 1: Via Supabase SQL Editor (Recomendado)

#### 1️⃣ **Inserir CBHPM**
```
1. Acesse: https://app.supabase.com
2. Selecione projeto "Gesclinic"
3. Navegue até: SQL Editor
4. Clique em: "New Query"
5. Copie o conteúdo de: supabase/migrations/20260216_insert_cbhpm_procedures.sql
6. Execute a query (Ctrl+Enter ou clique em ▶️ Run)
7. Aguarde confirmar: "50 procedimentos inseridos"
```

#### 2️⃣ **Criar Serviços**
```
1. Nova query no SQL Editor
2. Copie o conteúdo de: supabase/migrations/20260216_create_services_from_cbhpm.sql
3. Execute a query
4. Aguarde confirmar: "50 serviços criados"
```

---

### Opção 2: Via PowerShell Script

```powershell
# Na raiz do projeto Gesclinic Web:
.\scripts\insert-cbhpm-services.ps1
```

O script irá:
- ✅ Verificar integridade dos arquivos
- ✅ Exibir instruções passo a passo
- ✅ Oferecer abrir a pasta de migrations

---

## ✔️ Verificar se foi inserido

No Supabase SQL Editor, execute:

```sql
-- Verificar CBHPM
SELECT 
  COUNT(*) as total,
  COUNT(DISTINCT categoria) as categorias
FROM cbhpm_procedures 
WHERE ativo = true;

-- Verificar Serviços
SELECT 
  COUNT(*) as total,
  COUNT(DISTINCT service_category) as categorias
FROM services 
WHERE active = true;

-- Listar alguns exemplos
SELECT name, tuss_code, base_value, service_category 
FROM services 
WHERE active = true 
LIMIT 10;
```

---

## 📊 Estrutura de Dados

### Tabela: cbhpm_procedures
```
├── codigo_cbhpm (ex: 1.01.01.01-2)
├── descricao_completa (ex: Consulta - Clínico Geral)
├── codigo_tuss (ex: 0101010112)
├── valor_minimo, valor_maximo, valor_base
├── tipo_guia (consulta, sadt, procedimento, internacao)
├── categoria (Consultas, SADT, Procedimentos, Internações, Outros)
└── ativo
```

### Tabela: services
```
├── name (código + descrição do CBHPM)
├── tuss_code (mapeado de cbhpm_procedures.codigo_tuss)
├── code (CBHPM code)
├── base_value (valor base do CBHPM)
├── default_duration_minutes (30-120 conforme tipo)
├── service_category (consultation, exam, procedure, hospitalization)
└── active
```

---

## 🔗 Chave de Relacionamento

Depois de inserir, você pode relacionar em:

1. **Agenda** → Selecionar serviço ao criar consulta
2. **Faturamento** → Usar TISS Code para gerar guias
3. **Profissionais** → Associar serviços a cada profissional
4. **Preços** → Definir preços por convênio

---

## ❓ Dúvidas?

Se algum erro ocorrer:

1. **Erro de clinic_id**: Verifique se existe clínica cadastrada
   ```sql
   SELECT id FROM clinics LIMIT 1;
   ```

2. **Erro de duplicata**: Remover CBHPMs antigos
   ```sql
   DELETE FROM cbhpm_procedures WHERE ativo = false;
   ```

3. **Erro de foreign key**: Verificar integridade
   ```sql
   DELETE FROM services WHERE tuss_code IS NULL;
   ```

---

## 📞 Próximas Etapas

Após inserir com sucesso:

- [ ] Verificar dados na página **Services** (Base > Serviços)
- [ ] Verificar dados na página **CBHPM** (Base > CBHPM)
- [ ] Associar serviços a **profissionais**
- [ ] Configurar **preços por convênio**
- [ ] Testar criar **agendamento** com novo serviço

✅ **Pronto!**
