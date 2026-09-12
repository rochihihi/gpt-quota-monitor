$ErrorActionPreference='Stop'
$projectDir=Split-Path -Parent $MyInvocation.MyCommand.Path
$serverFile=Join-Path $projectDir 'gpt-quota-monitor-server.js'
$logFile=Join-Path $projectDir 'monitor.log'
$errorFile=Join-Path $projectDir 'monitor-error.log'
if(-not (Get-Command node.exe -ErrorAction SilentlyContinue)){throw 'node.exe not found. Install Node.js 18+.'}
if(-not (Test-Path $serverFile)){throw "Missing server file: $serverFile"}
$p=Start-Process node.exe -ArgumentList $serverFile -WorkingDirectory $projectDir -WindowStyle Hidden -RedirectStandardOutput $logFile -RedirectStandardError $errorFile -PassThru
Set-Content (Join-Path $projectDir 'monitor.pid') $p.Id
Start-Sleep -Milliseconds 800
$listen=Get-NetTCPConnection -LocalPort 18787 -State Listen -ErrorAction SilentlyContinue
if(-not $listen){throw "Server did not listen on port 18787. See $errorFile"}
Write-Host "Started. PID=$($p.Id) URL=http://127.0.0.1:18787"
