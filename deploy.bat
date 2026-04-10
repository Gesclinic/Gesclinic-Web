@echo off
cd "c:\Users\ferna\Desktop\Projeto Gesclinic Web"
"C:\Program Files\Git\cmd\git.exe" add src/pages/clinica/agenda/components/AppointmentUnitedModal.jsx
"C:\Program Files\Git\cmd\git.exe" commit -m "🔧 Fix: Preservar card_number em ambos os UPDATEs de appointments"
"C:\Program Files\Git\cmd\git.exe" push origin main
pause
