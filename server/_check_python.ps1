$ErrorActionPreference = 'Continue'
$candidates = @('python', 'python3', 'py')
foreach ($c in $candidates) {
  $cmd = Get-Command $c -ErrorAction SilentlyContinue
  if ($cmd) {
    $out = (& $cmd.Source -V 2>&1 | Out-String).Trim()
    Write-Output ("{0} -> {1} :: {2} (exit={3})" -f $c, $cmd.Source, $out, $LASTEXITCODE)
  } else {
    Write-Output ("{0} -> not found" -f $c)
  }
}
