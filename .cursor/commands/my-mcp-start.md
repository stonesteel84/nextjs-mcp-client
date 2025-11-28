Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force

pnpm dev

Start-Sleep -Seconds 3; netstat -ano | Select-String ":3000"