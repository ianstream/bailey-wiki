#!/bin/bash
# install-hook.sh — Install bailey-wiki post-commit hook into a target project
#
# Usage:
#   bash install-hook.sh ~/git/my-project
#   bash install-hook.sh  (uses current directory)

set -euo pipefail

TARGET="${1:-$(pwd)}"
HOOK_DIR="$TARGET/.git/hooks"
HOOK_FILE="$HOOK_DIR/post-commit"
BAILEY_WIKI_BIN="$(which bailey-wiki 2>/dev/null || echo "node $(cd "$(dirname "$0")" && pwd)/cli.mjs")"

if [ ! -d "$TARGET/.git" ]; then
  echo "❌ Not a git repository: $TARGET"
  exit 1
fi

mkdir -p "$HOOK_DIR"

# If hook already exists, back it up
if [ -f "$HOOK_FILE" ]; then
  BACKUP="$HOOK_FILE.bak.$(date +%s)"
  cp "$HOOK_FILE" "$BACKUP"
  echo "⚠️  Existing hook backed up to: $BACKUP"
fi

cat > "$HOOK_FILE" << 'HOOK'
#!/bin/bash
# bailey-wiki post-commit hook
# Auto-runs `bailey-wiki update` after each commit if this repo has been initialized.

REPO_DIR="$(git rev-parse --show-toplevel)"
CONFIG="$REPO_DIR/wiki/.setting/config.json"

# Only run if bailey-wiki has been initialized
if [ ! -f "$CONFIG" ]; then
  exit 0
fi

# Check if any source files changed in this commit
CHANGED=$(git diff-tree --no-commit-id -r --name-only HEAD 2>/dev/null | grep -E '\.(kt|java|ts|tsx|js)$' || true)
if [ -z "$CHANGED" ]; then
  exit 0
fi

echo ""
echo "🔄 [bailey-wiki] Source files changed — updating wiki..."

BAILEY_BIN="BAILEY_WIKI_BIN_PLACEHOLDER"

$BAILEY_BIN update --project "$REPO_DIR" 2>&1

echo "✅ [bailey-wiki] Wiki updated."
HOOK

# Inject the actual binary path
sed -i.bak "s|BAILEY_WIKI_BIN_PLACEHOLDER|$BAILEY_WIKI_BIN|g" "$HOOK_FILE" && rm -f "$HOOK_FILE.bak"

chmod +x "$HOOK_FILE"

echo ""
echo "✅ bailey-wiki post-commit hook installed:"
echo "   $HOOK_FILE"
echo ""
echo "   Triggers on: .kt .java .ts .tsx .js file changes"
echo "   Runs:        bailey-wiki update --project $TARGET"
echo ""
echo "To uninstall: rm $HOOK_FILE"
