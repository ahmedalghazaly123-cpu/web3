#!/usr/bin/env bash
# Oracle Cloud Always Free (Ampere A1: 4 OCPU / 24GB RAM) -> Ollama 24/7 FREE
# Run this ONCE on the Oracle VM (Ubuntu 22.04/24.04 ARM).
set -euo pipefail

echo "=== 1) system update ==="
sudo apt-get update -y && sudo apt-get upgrade -y

echo "=== 2) install Ollama ==="
curl -fsSL https://ollama.com/install.sh | sh

echo "=== 3) bind Ollama to all interfaces (Tailscale will protect it) ==="
sudo mkdir -p /etc/systemd/system/ollama.service.d
cat <<'EOF' | sudo tee /etc/systemd/system/ollama.service.d/override.conf
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
Environment="OLLAMA_KEEP_ALIVE=30m"
Environment="OLLAMA_NUM_PARALLEL=2"
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now ollama
sleep 3

echo "=== 4) pull the recommended Arabic-capable CPU model ==="
# Main: qwen2.5:7b-instruct (~4.7GB Q4) — best Arabic/quality balance on free CPU.
# Fallback (faster): qwen2.5:3b (~2GB) if 7b feels slow.
ollama pull qwen2.5:7b-instruct-q4_K_M || ollama pull qwen2.5:7b
ollama pull qwen2.5:3b
ollama list

echo "=== 5) install Tailscale (private encrypted network, no open port) ==="
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
echo ">>> Copy the Tailscale IP (100.x.y.z) shown above."

echo "=== 6) quick self-test ==="
curl -s http://localhost:11434/api/tags | head -c 300; echo
echo ""
echo "DONE. In your project server/.env set:"
echo "  OLLAMA_BASE_URL=http://<TAILSCALE-IP>:11434"
echo "  OLLAMA_MODEL=qwen2.5:7b  (or qwen2.5:3b for speed)"
echo "Then verify from your PC:"
echo "  node scripts/debug/remote-llm-check.cjs http://<TAILSCALE-IP>:11434 qwen2.5:7b --quick"
