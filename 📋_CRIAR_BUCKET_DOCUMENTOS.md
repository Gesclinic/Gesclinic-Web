# 📋 Criar Bucket de Documentos Profissionais

## Passo 1: Acessar Supabase
1. Acesse [https://app.supabase.com](https://app.supabase.com)
2. Acesse seu projeto **gesclinic-prod**
3. Clique em **Storage** (no menu lateral esquerdo)

## Passo 2: Criar Novo Bucket
1. Clique em **Create a new bucket**
2. Preencha:
   - **Bucket name:** `professional-documents`
   - ✅ **Public bucket** (marque esta opção)
3. Clique em **Create bucket**

## Passo 3: Configurar Políticas RLS (Row Level Security)

Depois que o bucket for criado, acesse **Policies** e adicione:

### Política 1: SELECT (Ler documentos)
```sql
(bucket_id = 'professional-documents')
```

### Política 2: INSERT (Fazer upload)
```sql
(bucket_id = 'professional-documents' AND auth.uid() IS NOT NULL)
```

### Política 3: UPDATE (Atualizar)
```sql
(bucket_id = 'professional-documents' AND auth.uid() IS NOT NULL)
```

### Política 4: DELETE (Deletar)
```sql
(bucket_id = 'professional-documents' AND auth.uid() IS NOT NULL)
```

## Passo 4: Testar a Funcionalidade

1. Recarregue a página: `F5`
2. Acesse: **Base do Sistema** → **Profissionais**
3. Clique em **Editar Profissional** (ou criar novo)
4. Procure pelo campo **📎 Anexar Documento**
5. Clique e selecione um arquivo (PDF, Word, Excel, Imagem, etc.)
6. Clique em **Atualizar** ou **Criar**
7. Você deve ver a confirmação: ✓ `[nome do arquivo]`

## Tipos de Arquivo Aceitos
- ✅ PDF (.pdf)
- ✅ Word (.doc, .docx)
- ✅ Excel (.xls, .xlsx)
- ✅ Imagens (.jpg, .jpeg, .png)

## Tamanho Máximo
- 📦 Máximo: 10 MB por arquivo

## Observações
- O nome do documento é armazenado no banco de dados
- O arquivo é armazenado no Supabase Storage com URL pública
- Você pode remover o documento clicando em "Remover" após upload
