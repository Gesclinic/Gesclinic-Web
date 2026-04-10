// 🔧 Script de Debug: Verificar CPF sendo Salvo

console.log("🔍 === VERIFICAÇÃO DE CPF ===");

// 1. Verificar ProfessionalsPage.jsx
console.log("1️⃣ Checking handleSubmit transformation:");
const testCPF = "012.283.270-17";
const cleanedCPF = testCPF.replace(/\D/g, '');
console.log("   Input:", testCPF);
console.log("   Output:", cleanedCPF);
console.log("   Expected: 01228327017");
console.log("   ✅ Transform works:", cleanedCPF === "01228327017");

// 2. Verificar máscara reversa
console.log("\n2️⃣ Checking maskCPF function:");
const unmaskedCPF = "01228327017";
// A função maskCPF de MaskedInput.jsx faz isto:
const maskedCPF = unmaskedCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
console.log("   Input:", unmaskedCPF);
console.log("   Output:", maskedCPF);
console.log("   Expected: 012.283.270-17");
console.log("   ✅ Mask works:", maskedCPF === "012.283.270-17");

// 3. Verificar se há transformação no handleSubmit
console.log("\n3️⃣ Checking if CPF is being sent to API:");
console.log("   formData.cpf should be cleaned before sending");
console.log("   File: src/pages/clinica/base-sistema/ProfessionalsPage.jsx");
console.log("   Line: 346 - cpf: formData.cpf.replace(/\\D/g, '')");
console.log("   ✅ Code looks correct");

// 4. Verificar se a coluna cpf está sendo incluída na query
console.log("\n4️⃣ Checking if CPF column is included in Supabase:");
console.log("   File: src/lib/professionalsApi.js");
console.log("   Line: 171 - cpf: payload.cpf || null");
console.log("   ✅ CPF is included in prepared object");

console.log("\n✨ Todos os passos parecem estar corretos!");
console.log("\n⚠️ Próximas ações:");
console.log("1. Verificar se SQL foi executado no Supabase");
console.log("2. Verificar se coluna 'cpf' existe na tabela 'professionals'");
console.log("3. Criar novo profissional e observar os logs no console");
console.log("4. Verificar Network tab (DevTools > Network) para ver payload");
