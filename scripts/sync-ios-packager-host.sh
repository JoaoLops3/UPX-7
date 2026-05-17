#!/usr/bin/env bash
# Grava o IP local do Mac para o Xcode usar ao rodar no iPhone (Debug).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/ios/.xcode.env.local"

IP="$(ipconfig getifaddr en0 2>/dev/null || true)"
if [[ -z "$IP" ]]; then
  IP="$(ipconfig getifaddr en1 2>/dev/null || true)"
fi

if [[ -z "$IP" ]]; then
  echo "Não foi possível detectar o IP do Mac (Wi‑Fi). Conecte-se à rede e rode de novo."
  exit 1
fi

cat > "$OUT" <<EOF
# Gerado por scripts/sync-ios-packager-host.sh — não versionar
export REACT_NATIVE_PACKAGER_HOSTNAME=$IP
EOF

echo "Packager host: $IP"
echo "Arquivo: ios/.xcode.env.local"
echo "Depois: npm start (ou npm run start:lan) e Run no Xcode no iPhone."
