$env:Path = "$env:LOCALAPPDATA\Programs\nodejs;" + $env:Path
Set-Location -Path $PSScriptRoot
npm run dev
