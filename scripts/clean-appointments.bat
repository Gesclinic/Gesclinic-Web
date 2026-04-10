@echo off
REM 🗑️ SCRIPT DE LIMPEZA - Deletar todos os agendamentos via API Supabase
REM 
REM Pré-requisitos:
REM   - Variáveis de ambiente configuradas (.env)
REM   - curl disponível (já vem no Windows 10+)

REM Carregar variáveis do .env (PowerShell faria isso melhor)
REM Por enquanto, use o comando manual abaixo ou execute via Supabase Dashboard

REM ============================================
REM OPÇÃO 1: Via SQL Editor do Supabase (mais rápido)
REM ============================================
REM 1. Vá para https://supabase.com/dashboard
REM 2. Abra SQL Editor
REM 3. Cole este comando:

REM DELETE FROM appointments;

REM 4. Clique em "Run"

REM ============================================
REM OPÇÃO 2: Via API REST (precisa de token)
REM ============================================
REM Usar curl se tiver token configurado

echo Limpeza de agendamentos
echo.
echo Para executar a limpeza:
echo.
echo 1. Abra https://supabase.com/dashboard
echo 2. Vá para SQL Editor
echo 3. Cole este comando:
echo.
echo    DELETE FROM appointments;
echo.
echo 4. Clique em "Run"
echo.
pause
