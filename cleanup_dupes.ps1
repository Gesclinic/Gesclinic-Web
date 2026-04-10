cd "c:\Users\ferna\Desktop\Projeto Gesclinic Web"
$content = Get-Content "src/pages/clinica/agenda/components/index.jsx" -Encoding UTF8 -Raw

# Remove first 3 duplicate blocks (lines 176-203) using simple regex
# First block
$content = $content -replace "(?ms)  // ⚡ CRÍTICO:.*?useLayoutEffect roda ANTES do render\n  useLayoutEffect\(\) => \{\n    if \(!appointmentDateFinal\) return;\n    if \(!/`^\`d\{4\}-`d\{2\}-`d\{2\}`$/.test\(appointmentDateFinal\)\) return;\n    if \(date !== appointmentDateFinal\) \{\n      console.log\('...\[useLayoutEffect\] UPDATE:', date, '.*?', appointmentDateFinal\);\n      setDate\(appointmentDateFinal\);\n    \}\n  \}, \[appointmentDateFinal\]\);\n\n", ""

# Write back
Set-Content "src/pages/clinica/agenda/components/index.jsx" -Value $content -Encoding UTF8
Write-Host "✅ Duplicados removidos (primeira tentativa)"
