#!/usr/bin/env bash
set -euo pipefail

# Diretório do repositório
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"
COMMIT_MESSAGE="${2:-"Deploy automático: $(date +'%Y-%m-%d %H:%M:%S')"}"

echo "[deploy] Branch: $BRANCH"
echo "[deploy] Commit message: $COMMIT_MESSAGE"

# Adiciona todas as alterações
git add .

# Comita somente se houver alterações staged
if git diff --cached --quiet; then
  echo "[deploy] Nenhuma alteração para commitar."
else
  git commit -m "$COMMIT_MESSAGE"
fi

# Envia para o GitHub
git push origin "$BRANCH"

# Deploy no Vercel usando VERCEL_TOKEN (recomendado) ou sessão já autenticada
if ! command -v npx >/dev/null 2>&1; then
  echo "[deploy] Erro: npx não encontrado. Instale Node.js e npm." >&2
  exit 1
fi

if [ -z "${VERCEL_TOKEN:-}" ]; then
  echo "[deploy] Aviso: VERCEL_TOKEN não definido. O Vercel CLI pode pedir login interativo." >&2
  npx vercel deploy --prod --confirm --cwd "$ROOT_DIR"
else
  npx vercel deploy --prod --confirm --token "$VERCEL_TOKEN" --cwd "$ROOT_DIR"
fi

echo "[deploy] Concluído."
