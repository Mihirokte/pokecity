#!/usr/bin/env bash
# Run inside WSL. Installs code-server (if needed) and starts it bound to 0.0.0.0 for phone browser access.
# Project path: Windows pokecity folder visible in WSL as below.
set -e
CODE_SERVER_PORT="${CODE_SERVER_PORT:-8080}"
PROJECT_PATH="${PROJECT_PATH:-/mnt/c/Users/rentk/mihir/pokecity}"
PASSWORD="${CODE_SERVER_PASSWORD:-pokecity}"

# Ensure code-server is installed
if ! command -v code-server >/dev/null 2>&1; then
  echo "Installing code-server..."
  curl -fsSL https://code-server.dev/install.sh | sh
  export PATH="$HOME/.local/bin:$PATH"
fi

# Ensure in PATH for this session
export PATH="$HOME/.local/bin:$PATH"

# Config dir and password
CONFIG_DIR="$HOME/.config/code-server"
mkdir -p "$CONFIG_DIR"
CONFIG_FILE="$CONFIG_DIR/config.yaml"

# Set password in config (code-server reads this)
cat > "$CONFIG_FILE" << EOF
bind-addr: 0.0.0.0:$CODE_SERVER_PORT
auth: password
password: $PASSWORD
cert: false
EOF

echo "Starting code-server at http://0.0.0.0:$CODE_SERVER_PORT"
echo "Password: $PASSWORD"
echo "Open folder: $PROJECT_PATH"
exec code-server "$PROJECT_PATH" --bind-addr "0.0.0.0:$CODE_SERVER_PORT"
