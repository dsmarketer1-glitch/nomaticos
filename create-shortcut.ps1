$ws = New-Object -ComObject WScript.Shell
$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath 'Nomatic OS.lnk'
$sc = $ws.CreateShortcut($shortcutPath)
$sc.TargetPath = 'c:\Users\Deepak\Downloads\antigravity-new\nomatic-productivity\NomaticOS.bat'
$sc.WorkingDirectory = 'c:\Users\Deepak\Downloads\antigravity-new\nomatic-productivity'
$sc.Description = 'Launch Nomatic OS'
$sc.Save()
Write-Host "Desktop shortcut created at: $shortcutPath"
