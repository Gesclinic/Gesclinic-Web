cd "c:\Users\ferna\Desktop\Projeto Gesclinic Web"
$content = Get-Content "src/pages/clinica/agenda/components/index.jsx" -Encoding UTF8 -Raw
$marker = "}, [appointmentDateFinal, appointmentIdFinal]);"
$hook = "`n`n  // ⚡ CRÍTICO: useLayoutEffect roda ANTES do render`n  useLayoutEffect(() => {`n    if (!appointmentDateFinal) return;`n    if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDateFinal)) return;`n    if (date !== appointmentDateFinal) {`n      console.log('✅ [useLayoutEffect] UPDATE:', date, '→', appointmentDateFinal);`n      setDate(appointmentDateFinal);`n    }`n  }, [appointmentDateFinal]);"

$newContent = $content -replace [regex]::Escape($marker), ($marker + $hook)
Set-Content "src/pages/clinica/agenda/components/index.jsx" -Value $newContent -Encoding UTF8
Write-Host "✅ useLayoutEffect adicionado com sucesso!"
