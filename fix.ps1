param(
  [string]$filePath,
  [string]$pattern,
  [string]$replacement
)
$content = Get-Content $filePath -Raw
$content = $content -replace $pattern, $replacement
$content | Set-Content $filePath -Encoding UTF8
Write-Host "Fixed: $filePath"