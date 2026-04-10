# GUIA DE USO - BASE DO SISTEMA

## 🎯 Para Administradores

Este guia ajuda administradores a usar a Base do Sistema para configurar recursos clínicos.

---

## 📍 Como Acessar

1. **Login**: Acesse o sistema em `https://seu-dominio.com`
2. **Menu**: Clique em "Base do Sistema" no menu lateral
3. **Navegação**: Escolha o módulo desejado entre:
   - Serviços
   - Profissionais
   - Convênios
   - Salas
   - Recursos
   - Relacionamentos (Prof-Serviços, Sala-Recursos, Prof-Convênio)
   - Regras (Agenda, Receita)
   - Horários
   - Preços

---

## 1️⃣ GERENCIAR SERVIÇOS

**URL**: `/clinica/base-sistema/servicos`

### Criar Novo Serviço

1. Clique em **"+ Novo Serviço"**
2. Preencha:
   - **Nome**: Ex. "Consulta Geral" (obrigatório, mínimo 3 caracteres)
   - **Descrição**: Ex. "Atendimento padrão de clínica"
   - **Ativo**: Marque para ativar o serviço
3. Clique em **"Salvar"**
4. Sucesso: Serviço aparece na tabela

### Editar Serviço

1. Na tabela, clique no ícone **"Editar"** (lápis) do serviço
2. Altere os campos desejados
3. Clique em **"Salvar"**

### Deletar Serviço

1. Na tabela, clique no ícone **"Deletar"** (lixeira)
2. Confirme a exclusão
3. Serviço desaparece da lista (soft delete)

### Buscar Serviço

1. Use a caixa de **"Buscar"** no topo
2. Digite o nome do serviço
3. Lista filtra automaticamente

---

## 2️⃣ GERENCIAR PROFISSIONAIS

**URL**: `/clinica/base-sistema/profissionais`

### Criar Novo Profissional

1. Clique em **"+ Novo Profissional"**
2. Preencha:
   - **Nome**: Ex. "Dr. João Silva" (obrigatório)
   - **Email**: Ex. "joao@clinic.com" (obrigatório, formato válido)
   - **Telefone**: Ex. "11999999999" (obrigatório)
   - **Especialização**: Ex. "Cardiologia"
   - **Ativo**: Marque para ativar
3. Clique em **"Salvar"**

### Validações

- ❌ Email vazio: "Email é obrigatório"
- ❌ Email inválido: "Email deve ser válido"
- ❌ Telefone < 10 dígitos: "Telefone inválido"

### Editar Profissional

1. Clique em **"Editar"** na tabela
2. Altere especialização ou outro campo
3. Clique em **"Salvar"**

### Deletar Profissional

1. Clique em **"Deletar"** na tabela
2. Confirme
3. Profissional removido (soft delete)

---

## 3️⃣ GERENCIAR CONVÊNIOS

**URL**: `/clinica/base-sistema/convenios`

### Criar Novo Convênio

1. Clique em **"+ Novo Convênio"**
2. Preencha:
   - **Código**: Ex. "UNIMED01" (obrigatório, único)
   - **Nome**: Ex. "Unimed São Paulo" (obrigatório)
   - **Tipo**: "health_insurance"
   - **CNPJ**: Ex. "12.345.678/0001-90"
   - **Email**: "contact@unimed.com.br"
   - **Ativo**: Marque para ativar
3. Clique em **"Salvar"**

### Validações

- ❌ Código duplicado: "Código já existe"
- ❌ Nome vazio: "Nome é obrigatório"

---

## 4️⃣ GERENCIAR SALAS

**URL**: `/clinica/base-sistema/salas`

### Criar Nova Sala

1. Clique em **"+ Nova Sala"**
2. Preencha:
   - **Nome**: Ex. "Sala Consulta 01" (obrigatório)
   - **Descrição**: Ex. "Sala de consulta geral"
   - **Localização**: Ex. "Andar 1, Ala A"
   - **Capacidade**: Ex. "2" (número, obrigatório, > 0)
   - **Ativo**: Marque para ativar
3. Clique em **"Salvar"**

### Validações

- ❌ Capacidade 0: "Capacidade deve ser maior que 0"
- ❌ Capacidade "abc": "Capacidade deve ser um número"
- ❌ Capacidade negativa: "Capacidade deve ser maior que 0"

---

## 5️⃣ GERENCIAR RECURSOS

**URL**: `/clinica/base-sistema/recursos`

### Criar Novo Recurso

1. Clique em **"+ Novo Recurso"**
2. Preencha:
   - **Nome**: Ex. "Espectroscópio" (obrigatório, mínimo 3 chars)
   - **Descrição**: Ex. "Equipamento diagnóstico"
   - **Categoria**: Ex. "Equipamento", "Material", "Medicamento"
   - **Ativo**: Marque para ativar
3. Clique em **"Salvar"**

---

## 6️⃣ ATRIBUIR SERVIÇOS A PROFISSIONAIS

**URL**: `/clinica/base-sistema/professional-services`

### Adicionar Serviço a Profissional

1. Clique em **"+ Novo"**
2. Selecione:
   - **Profissional**: "Dr. João Silva" (dropdown)
   - **Serviço**: "Consulta Geral" (dropdown)
3. Clique em **"Salvar"**
4. Atribuição aparece na tabela

### Validações

- ❌ Profissional não selecionado: "Profissional é obrigatório"
- ❌ Serviço não selecionado: "Serviço é obrigatório"
- ❌ Combinação duplicada: "Essa combinação já existe"

### Remover Atribuição

1. Clique em **"Deletar"** na tabela
2. Confirme

---

## 7️⃣ CONFIGURAR REGRAS DE AGENDA

**URL**: `/clinica/base-sistema/agenda-rules`

### Criar Nova Regra

1. Clique em **"+ Nova Regra"**
2. Preencha:
   - **Nome**: Ex. "Intervalo Mínimo" (obrigatório)
   - **Tipo**: Selecione:
     - `default` - Padrão
     - `min_interval` - Intervalo mínimo (ex: 30 minutos)
     - `max_per_day` - Máximo por dia (ex: 20 consultas)
     - `buffer_time` - Tempo de buffer (ex: 10 minutos entre)
     - `blackout` - Períodos indisponíveis
   - **Valor**: Ex. "30" (número)
   - **Descrição**: "Mínimo 30 minutos entre consultas"
3. Clique em **"Salvar"**

### Exemplos de Uso

**Intervalo Mínimo**:
- Tipo: `min_interval`
- Valor: `30`
- Significado: Esperar 30 minutos entre consultas do mesmo profissional

**Máximo por Dia**:
- Tipo: `max_per_day`
- Valor: `20`
- Significado: Máximo 20 consultas por dia por profissional

---

## 8️⃣ ATRIBUIR RECURSOS A SALAS

**URL**: `/clinica/base-sistema/room-resources`

### Adicionar Recurso a Sala

1. Clique em **"+ Novo"**
2. Preencha:
   - **Sala**: "Sala Consulta 01" (dropdown)
   - **Recurso**: "Espectroscópio" (dropdown)
   - **Quantidade**: Ex. "2" (número, > 0)
3. Clique em **"Salvar"**

### Validações

- ❌ Quantidade 0: "Quantidade deve ser maior que 0"
- ❌ Sala não selecionada: "Sala é obrigatória"

---

## 9️⃣ CONFIGURAR HORÁRIOS PROFISSIONAL

**URL**: `/clinica/base-sistema/profissional-schedule`

### Adicionar Horário

1. **Selecione o Profissional**: "Dr. João Silva"
2. Para cada dia da semana:
   - **Dia**: Segunda-feira (exemplo)
   - **Horário Início**: "08:00"
   - **Horário Fim**: "18:00"
   - **Pausa Início**: "12:00" (opcional)
   - **Pausa Fim**: "13:00" (opcional)
3. Clique em **"Salvar"**

### Validações

- ❌ Hora fim <= Hora início: "Horário de fim deve ser depois do início"
- ❌ Pausa fora do horário: "Pausa deve estar dentro do horário de trabalho"
- ✅ Pausa dentro do horário: Aceitado

### Exemplo Correto

```
Segunda-feira
Início: 08:00
Fim: 18:00
Pausa: 12:00 - 13:00 ✅ (dentro do horário)

Terça-feira
Início: 08:00
Fim: 12:00 ✅ (expediente matutino)
Pausa: Nenhuma
```

---

## 🔟 CONFIGURAR PREÇOS DE SERVIÇOS

**URL**: `/clinica/base-sistema/service-prices`

### Adicionar Preço

1. Clique em **"+ Novo Preço"**
2. Preencha:
   - **Serviço**: "Consulta Geral" (dropdown)
   - **Preço**: Ex. "150.50"
   - **Custo**: Ex. "50.00"
   - **Moeda**: BRL, USD ou EUR
3. **Margem é calculada automaticamente**: (150.50 - 50) / 150.50 × 100 = 66.8%
4. Clique em **"Salvar"**

### Validações

- ❌ Preço 0 ou negativo: "Preço deve ser maior que 0"
- ❌ Custo > Preço: "Custo não deve ser maior que o preço"
- ✅ Custo ≤ Preço: Aceitado

### Interpretação da Margem

- **Preço**: R$ 150.50 (o que você cobra)
- **Custo**: R$ 50.00 (o que você gasta)
- **Lucro**: R$ 100.50 (R$ 150.50 - R$ 50.00)
- **Margem**: 66.8% (lucro ÷ preço)

---

## 1️⃣1️⃣ CONFIGURAR REGRAS DE RECEITA

**URL**: `/clinica/base-sistema/revenue-rules`

### Criar Nova Regra

1. Clique em **"+ Nova Regra"**
2. Preencha:
   - **Nome**: Ex. "Comissão Principal"
   - **Tipo**: Selecione:
     - `percentage` - Porcentagem (ex: 30%)
     - `fixed` - Valor fixo (ex: R$ 100)
     - `combined` - Porcentagem + Fixo
     - `tiered` - Por faixa de valor
3. Preencha os valores conforme o tipo
4. Clique em **"Salvar"**

### Exemplo: Porcentagem

- Tipo: `percentage`
- Porcentagem: `30`
- Significado: 30% da receita vai para o profissional

### Exemplo: Valor Fixo

- Tipo: `fixed`
- Valor: `100.00`
- Significado: R$ 100 por consulta realizada

### Exemplo: Combinado

- Tipo: `combined`
- Porcentagem: `20`
- Valor Fixo: `50.00`
- Significado: 20% + R$ 50 por consulta

---

## 1️⃣2️⃣ ATRIBUIR PROFISSIONAIS A CONVÊNIOS

**URL**: `/clinica/base-sistema/profissional-payer`

### Adicionar Atribuição

1. Clique em **"+ Novo"**
2. Preencha:
   - **Profissional**: "Dr. João Silva" (dropdown)
   - **Convênio**: "Unimed São Paulo" (dropdown)
   - **Comissão %**: Ex. "20" (0-100%)
   - **Número Registro**: Ex. "12345/ABC" (opcional)
3. Clique em **"Salvar"**

### Validações

- ❌ Comissão > 100: "Comissão deve estar entre 0 e 100"
- ❌ Comissão negativa: "Comissão deve estar entre 0 e 100"
- ✅ Comissão 15%: Aceitado

### Caso de Uso

Quando um paciente chega com convênio Unimed e consulta com Dr. João:
- Ele recebe **20% da receita da consulta** (conforme configurado)

---

## 🔄 FLUXO COMPLETO DE SETUP

### Passo 1: Criar Base de Dados

1. Vá para **Serviços**
2. Crie: "Consulta Geral", "Consulta Especialista", "Procedimento"
3. Vá para **Profissionais**
4. Crie: "Dr. João Silva", "Dra. Maria Santos"
5. Vá para **Salas**
6. Crie: "Sala Consulta 01", "Sala Consulta 02"
7. Vá para **Convênios**
8. Crie: "Unimed", "Amil", "Bradesco"

### Passo 2: Configurar Relacionamentos

1. Vá para **Prof-Serviços**
2. Atribua: Dr. João → Consulta Geral, Especialista
3. Atribua: Dra. Maria → Consulta Geral, Procedimento
4. Vá para **Sala-Recursos**
5. Atribua recursos necessários às salas

### Passo 3: Configurar Regras

1. Vá para **Horários Prof**
2. Configure horários: Dr. João (8h-18h, pausa 12h-13h)
3. Vá para **Regras Agenda**
4. Crie: Intervalo mínimo 30 minutos
5. Vá para **Preços**
6. Configure preço de cada serviço

### Passo 4: Configurar Receita

1. Vá para **Regras Receita**
2. Crie: Comissão Principal (30%)
3. Vá para **Prof-Convênio**
4. Atribua profissionais aos convênios com comissão

---

## 🚨 TROUBLESHOOTING

### Problema: Não consigo criar um serviço

**Possível Causa**: Nome vazio ou < 3 caracteres
**Solução**: Digite pelo menos 3 caracteres no nome

### Problema: Email do profissional rejeitado

**Possível Causa**: Formato inválido
**Solução**: Use formato "nome@dominio.com"

### Problema: Capacidade da sala rejeitada

**Possível Causa**: Valor não numérico ou ≤ 0
**Solução**: Digite um número maior que 0 (ex: 1, 2, 3...)

### Problema: Não posso deletar profissional

**Possível Causa**: Profissional tem agendamentos
**Solução**: Soft delete funciona mesmo assim - profissional fica invisível

### Problema: Horário do profissional não salva

**Possível Causa**: Horário fim é menor que início
**Solução**: Verifique se "Fim" > "Início" (ex: 08:00 → 18:00 ✅)

### Problema: Não consigo atribuir profissional a serviço

**Possível Causa**: Combinação já existe
**Solução**: Verifique se já não existe essa atribuição

---

## 💡 DICAS IMPORTANTES

### 1. Sempre Ative os Itens

Quando cria algo novo, marque como **"Ativo"** para aparecer nos agendamentos.

### 2. Use Códigos Únicos para Convênios

Cada convênio deve ter código único (ex: UNIMED, AMIL, BRADESCO).

### 3. Configure Horários Antes de Agendar

Sempre configure os horários dos profissionais antes de usar o sistema de agendamentos.

### 4. Valide Preços de Serviços

Certifique-se de que Custo ≤ Preço para evitar prejuízos.

### 5. Teste Tudo Antes de Usar com Pacientes

Crie dados de teste e valide todos os relacionamentos antes de usar em produção.

### 6. Faça Backup Regularmente

Os dados no Supabase são permanentes, mas faça backups regularmente.

---

## 🎓 VÍDEOS TUTORIAIS

Tutoriais em vídeo estão disponíveis em:
- 📺 YouTube: [Gesclinic Tutoriais](https://youtube.com/gesclinic)
- 📺 Documentação: [Vídeos de Suporte](https://docs.gesclinic.com/videos)

---

## 📞 CONTATO SUPORTE

Se tiver dúvidas ou problemas:
- 📧 Email: suporte@gesclinic.com
- 💬 Chat: [Suporte Interativo](https://gesclinic.com/suporte)
- 📞 Telefone: (11) 3000-0000

---

**Data**: 15 de Janeiro de 2026
**Versão**: 1.0
**Status**: ✅ Pronto para Uso
