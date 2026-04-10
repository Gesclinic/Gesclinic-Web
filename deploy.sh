#!/bin/bash
# Deploy script para Supabase Edge Functions

SUPABASE_URL="https://gvdkdjyupktlflwurike.supabase.co"
PROJECT_ID="gvdkdjyupktlflwurike"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZGtkanl1cGt0bGZsd3VyaWtlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIyNTIxMSwiZXhwIjoyMDgzODAxMjExfQ.mADi87s3nIx5bz0de7UtFA52fq7yHva35lDdG_K-eUs"

# Functions para deploy
FUNCTIONS=("create-clinic-from-signup" "create-stripe-checkout" "stripe-webhook")

echo "🚀 Iniciando deploy das Edge Functions..."

for FUNC in "${FUNCTIONS[@]}"; do
    echo ""
    echo "📦 Deployando: $FUNC"
    
    FUNC_PATH="./supabase/functions/$FUNC"
    
    if [ ! -d "$FUNC_PATH" ]; then
        echo "❌ Função não encontrada: $FUNC"
        continue
    fi
    
    # Compactar a function
    cd "$FUNC_PATH"
    zip -r "../../${FUNC}.zip" . > /dev/null 2>&1
    cd ../../..
    
    # Upload via API
    curl -X POST "$SUPABASE_URL/functions/v1/functions" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"name":"'$FUNC'"}' \
        --silent
    
    echo "✅ $FUNC deploy iniciado!"
    rm -f "supabase/${FUNC}.zip"
done

echo ""
echo "🎉 Deploy concluído!"
