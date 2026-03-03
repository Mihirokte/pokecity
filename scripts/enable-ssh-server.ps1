# Run as Administrator: Right-click PowerShell -> Run as administrator, then:
#   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force; & "c:\Users\rentk\mihir\pokecity\scripts\enable-ssh-server.ps1"
#
# Enables OpenSSH Server on Windows so you can SSH in from Termius on iPhone.
# Also ensures SSH agent is set to auto-start (for forwarding in Cursor terminals).

$ErrorActionPreference = 'Stop'

# --- 1. Install OpenSSH Server if missing ---
$cap = Get-WindowsCapability -Online | Where-Object { $_.Name -eq 'OpenSSH.Server~~~~0.0.1.0' }
if ($cap.State -ne 'Installed') {
    Write-Host "Installing OpenSSH Server..."
    Add-WindowsCapability -Online -Name 'OpenSSH.Server~~~~0.0.1.0'
} else {
    Write-Host "OpenSSH Server already installed."
}

# --- 2. Ensure sshd listens on all interfaces ---
$sshdConfig = 'C:\ProgramData\ssh\sshd_config'
if (Test-Path $sshdConfig) {
    $content = Get-Content $sshdConfig -Raw
    if ($content -notmatch 'ListenAddress\s+0\.0\.0\.0') {
        # Uncomment or add ListenAddress 0.0.0.0
        $content = $content -replace '#?\s*ListenAddress\s+.*', "ListenAddress 0.0.0.0"
        Set-Content -Path $sshdConfig -Value $content.TrimEnd() -NoNewline
        Write-Host "Updated sshd_config to listen on 0.0.0.0"
    }
}

# --- 3. Start and enable OpenSSH Server ---
Set-Service -Name sshd -StartupType Automatic -ErrorAction SilentlyContinue
Start-Service -Name sshd -ErrorAction SilentlyContinue
Write-Host "OpenSSH Server (sshd) started and set to automatic."

# --- 4. Allow SSH through Windows Firewall ---
$rule = Get-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -ErrorAction SilentlyContinue
if ($rule) {
    Enable-NetFirewallRule -Name 'OpenSSH-Server-In-TCP'
    Write-Host "Firewall rule OpenSSH-Server-In-TCP enabled (port 22)."
} else {
    New-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
    Write-Host "Firewall rule created for port 22."
}

# --- 5. SSH Agent (for key forwarding in Cursor terminals) ---
Set-Service -Name ssh-agent -StartupType Automatic -ErrorAction SilentlyContinue
Start-Service -Name ssh-agent -ErrorAction SilentlyContinue
Write-Host "SSH Agent set to automatic and started."

# --- Done ---
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' } | Select-Object -First 1).IPAddress
Write-Host ""
Write-Host "Done. From Termius on your iPhone:"
Write-Host "  Host: $ip (or your PC name if on same network)"
Write-Host "  Port: 22"
Write-Host "  User: $env:USERNAME"
Write-Host "  Auth: Password or add your public key to C:\Users\$env:USERNAME\.ssh\authorized_keys"
Write-Host ""
Write-Host "Ensure iPhone and PC are on the same Wi-Fi, or set up port forwarding/VPN for remote access."
