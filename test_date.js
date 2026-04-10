// Teste rápido de data
const date = new Date("2026-02-16");
console.log("Data:", date);
console.log("getDay():", date.getDay());
console.log("Dia:", ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][date.getDay()]);

// Tentar com UTC
const dateUtc = new Date("2026-02-16T00:00:00Z");
console.log("\nCom UTC:");
console.log("Data:", dateUtc);
console.log("getUTCDay():", dateUtc.getUTCDay());
console.log("Dia:", ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][dateUtc.getUTCDay()]);

// Criar manualmente
const dateParts = [2026, 1, 16]; // mês é 0-indexed
const dateManual = new Date(dateParts[0], dateParts[1], dateParts[2]);
console.log("\nManualmente (2026, 1, 16):");
console.log("Data:", dateManual);
console.log("getDay():", dateManual.getDay());
console.log("Dia:", ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][dateManual.getDay()]);
