$filePath = "src/pages/clinica/agenda/components/AppointmentUnitedModal.jsx"
$content = Get-Content $filePath -Raw -Encoding UTF8

# Replace the first occurrence of the problematic block
$pattern = @"
      const uuidFields = \['professional_id', 'service_id', 'payer_id', 'room_id'\];
      uuidFields\.forEach\(field => \{
        if \(updateData\[field\] === ''\) \{
          console\.log\(`   🔧 Normalizing \$\{field\}: "" → null`\);
          updateData\[field\] = null;
        \}
      \}\);
"@

# Actually, let's use a simpler approach - find and remove the entire problematic section
$newContent = $content -replace '(?s)const uuidFields = \[''professional_id'', ''service_id'', ''payer_id'', ''room_id''\];.*?}\);(?:\s*// DEBUG CARD_NUMBER)?', ''

# Write back
$newContent | Set-Content $filePath -Encoding UTF8
Write-Host "Fixed! Removed duplicate uuidFields declaration."
