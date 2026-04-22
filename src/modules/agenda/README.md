# MÓDULO AGENDA - Arquitetura por Domínio

Domínio responsável por toda a lógica de agendamentos de pacientes, calendários, profissionais, salas e financeiro relacionado.

## Estrutura

```
└── agenda/
    ├── components/        (Componentes React do domínio)
    ├── hooks/             (Hooks personalizados)
    ├── services/          (API layer / lógica de negócio)
    └── utils/             (Funções utilitárias puras)
```

## Status

🔄 **Em Preparação**

## Próximas Fases

1. Documentar arquivos existentes a mover
2. Criar plano de migração incremental
3. Mover componentes (AgendaWeekView, AgendaDayView, etc.)
4. Mover hooks personalizados
5. Mover serviços de agendamento
6. Refatorar e consolidar utilitários

## Benefícios

- ✓ Separação clara de responsabilidades
- ✓ Facilita encontrar código relacionado
- ✓ Reduz importações cruzadas
- ✓ Permite evolução independente
- ✓ Prepara para lazy-loading

## Notas

- Imports externos continuarão funcionando durante migração
- Compatibilidade mantida com code existente
- Sem breaking changes durante a transição

---

**Criado:** 2026-04-22
