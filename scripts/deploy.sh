#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# scripts/deploy.sh
# Uso: bash scripts/deploy.sh [branch] ["mensagem de commit"]
# =============================================================================

# Diretório raiz do repositório
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"
COMMIT_MESSAGE="${2:-"Deploy automático: $(date +'%Y-%m-%d %H:%M:%S')"}"

echo "[deploy] Branch: $BRANCH"
echo "[deploy] Commit: $COMMIT_MESSAGE"

# -----------------------------------------------------------------------------
# 1. Git — commit e push
# -----------------------------------------------------------------------------
git add .

if git diff --cached --quiet; then
  echo "[deploy] Nenhuma alteração para commitar."
else
  git commit -m "$COMMIT_MESSAGE"
fi

# Sincroniza com o remote antes de empurrar para evitar rejeição por divergência
echo "[deploy] Sincronizando com o remote..."
git fetch origin "$BRANCH" 2>/dev/null || true

# Verifica se o remote tem commits que o local não tem
BEHIND=$(git rev-list --count HEAD..origin/"$BRANCH" 2>/dev/null || echo "0")
if [ "$BEHIND" -gt 0 ]; then
  echo "[deploy] AVISO: o remote tem $BEHIND commit(s) à frente. Fazendo rebase..." >&2
  git rebase origin/"$BRANCH"
fi

echo "[deploy] Enviando para o GitHub (origin/$BRANCH)..."
git push origin "$BRANCH"
echo "[deploy] Push concluído."

# -----------------------------------------------------------------------------
# 2. Vercel — deploy para produção
# -----------------------------------------------------------------------------

# Resolve o binário do Vercel CLI: instalação local > global > npx (fallback)
if [ -x "$ROOT_DIR/node_modules/.bin/vercel" ]; then
  VERCEL_BIN="$ROOT_DIR/node_modules/.bin/vercel"
elif command -v vercel >/dev/null 2>&1; then
  VERCEL_BIN="vercel"
elif command -v npx >/dev/null 2>&1; then
  VERCEL_BIN="npx vercel"
else
  echo "[deploy] Erro: Vercel CLI não encontrado. Execute: npm i -g vercel" >&2
  exit 1
fi

echo "[deploy] Usando Vercel CLI: $VERCEL_BIN"

if [ -z "${VERCEL_TOKEN:-}" ]; then
  echo "[deploy] AVISO: VERCEL_TOKEN não definido. O CLI pode solicitar login interativo." >&2
  $VERCEL_BIN deploy --prod --yes --cwd "$ROOT_DIR"
else
  $VERCEL_BIN deploy --prod --yes --token "$VERCEL_TOKEN" --cwd "$ROOT_DIR"
fi

echo "[deploy] Deploy concluído com sucesso."
