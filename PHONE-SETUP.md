# Work from your phone

Do edits on your iPhone; the PC runs the dev server and builds.

## One-time setup (on your PC)

1. **WSL**  
   Install if you don’t have it (PowerShell as Admin):
   ```powershell
   wsl --install
   ```
   Reboot if prompted, then open WSL once and finish any distro setup.

2. **SSH from Termius (optional)**  
   If you want a terminal on the PC from your phone:
   ```powershell
   # PowerShell as Administrator
   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
   & "c:\Users\rentk\mihir\pokecity\scripts\enable-ssh-server.ps1"
   ```
   In Termius: host = your PC’s IP, port 22, user = your Windows username, password or SSH key.

3. **Firewall for code-server (one time)**  
   So your phone can reach the browser IDE, run the code-server launcher **once as Administrator**:
   ```powershell
   cd c:\Users\rentk\mihir\pokecity
   .\scripts\start-code-server.ps1
   ```
   When it adds the firewall rule, that’s the one-time step. After that you don’t need Admin.

---

## Daily workflow: “I only do changes on my phone”

### On the PC (before you pick up the phone)

1. **Start the browser IDE (code-server)**  
   In PowerShell or Cursor terminal:
   ```powershell
   cd c:\Users\rentk\mihir\pokecity
   npm run code-server
   ```
   Or: `.\scripts\start-code-server.ps1`  
   Leave this window open. It will print something like: `http://192.168.x.x:8080` and password `pokecity`.

2. **Start the dev server (so you can see the app)**  
   In another terminal:
   ```powershell
   cd c:\Users\rentk\mihir\pokecity
   npm run dev:phone
   ```
   Leave this running. On the PC open `http://localhost:5173`; on your phone open `http://YOUR_PC_IP:5173` to preview the app. (Use `npm run dev` if you only need it on the PC.)

### On your phone

1. **Open the IDE**  
   In Safari (or Chrome), go to: **http://YOUR_PC_IP:8080**  
   Use the same Wi‑Fi as the PC. Replace `YOUR_PC_IP` with the IP shown when you ran `npm run code-server` (e.g. `192.168.1.100`).

2. **Log in**  
   Password: **pokecity** (unless you changed it in the script).

3. **Edit**  
   You’ll see the pokecity project. Edit files, use the integrated terminal (runs in WSL on the PC), run `npm run build` / `npm run lint` there. The PC does all the work; you only do changes on the phone.

4. **Optional: Termius**  
   SSH to the PC (host = same IP, port 22) if you want a plain terminal from the phone instead of the code-server terminal.

---

## Summary

| What              | Where                    |
|-------------------|--------------------------|
| Edit code         | Phone browser → http://PC_IP:8080 |
| Run dev server    | PC terminal: `npm run dev` |
| Run builds/lint   | code-server terminal on phone, or Termius SSH |
| Default password  | `pokecity`               |

Same Wi‑Fi required for phone ↔ PC. For outside your network, use a VPN or port forwarding (not covered here).
