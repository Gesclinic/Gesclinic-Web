cd "c:\Users\ferna\Desktop\Projeto Gesclinic Web"
$content = Get-Content "src/pages/clinica/agenda/components/index.jsx" -Encoding UTF8 -Raw
$lines = $content -split "`n"

# Remove lines 176-204 (first 3 duplicate blocks) - keep only the cleanest one at 206+
$newLines = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($i -ge 175 -and $i -le 203) {
    # Skip these lines (0-indexed so 176-204 becomes 175-203)
    continue
  }
  $newLines += $lines[$i]
}

$newContent = $newLines -join "`n"
Set-Content "src/pages/clinica/agenda/components/index.jsx" -Value $newContent -Encoding UTF8
Write-Host "✅ Linhas 176-204 removidas, mantendo apenas o bloco clean na linha 206+"
