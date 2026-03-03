# Start code-server in WSL so you can edit from your phone's browser.
# Run from PowerShell (no admin needed after first-time firewall rule).
# From phone: open http://YOUR_PC_IP:8080 and use password below.

$ErrorActionPreference = "Stop"
$ProjectRoot = "c:\Users\rentk\mihir\pokecity"
$Port = 8080
$Password = "pokecity"

# Optional: allow port through Windows Firewall (run once; may need Admin)
$ruleName = "Code-Server-In-TCP"
$rule = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
if (-not $rule) {
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if ($isAdmin) {
        New-NetFirewallRule -Name $ruleName -DisplayName "Code-Server (browser IDE)" -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort $Port
        Write-Host "Firewall rule added for port $Port."
    } else {
        Write-Host "Tip: Run once as Administrator to add firewall rule for port $Port."
    }
} else {
    Enable-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
}

# WSL paths (Windows c:\ -> /mnt/c/)
$WslProjectPath = "/mnt/c/Users/rentk/mihir/pokecity"
$WslScriptPath = "/mnt/c/Users/rentk/mihir/pokecity/scripts/code-server-wsl.sh"

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' } | Select-Object -First 1).IPAddress
Write-Host ""
Write-Host "Starting code-server in WSL. On your phone browser open:"
Write-Host "  http://${ip}:${Port}"
Write-Host "  Password: $Password"
Write-Host ""
Write-Host "Press Ctrl+C to stop."
Write-Host ""

wsl -e bash -c "export CODE_SERVER_PORT='$Port'; export CODE_SERVER_PASSWORD='$Password'; export PROJECT_PATH='$WslProjectPath'; bash '$WslScriptPath'"
