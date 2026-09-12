$ports=@(8787,18787)
$ids=@()
foreach($port in $ports){
  $c=Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if($c){$ids += $c.OwningProcess}
}
$procs=Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue
foreach($p in $procs){
  if($p.CommandLine -and $p.CommandLine -match 'gpt-quota-monitor-server\.js'){$ids += $p.ProcessId}
}
$ids | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
$pidFile=Join-Path $PSScriptRoot 'monitor.pid'
Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
Write-Host 'GPT Quota Monitor stopped.'
