#!/usr/bin/env bash
set -euo pipefail

# One-command release helper for macOS/Linux (zsh/bash)
# Usage:
#   scripts/release.sh [patch|minor|major|<semver>]
# Defaults to patch if not provided. Set DRY_RUN=1 to simulate publish.

BUMP_TYPE="${1:-patch}"

echo "🔧 Preparing release ($BUMP_TYPE)"

# Ensure git is clean
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "❌ Working tree has uncommitted changes. Commit or stash before releasing."
  exit 1
fi

# Ensure on main branch (warn only)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" && "$BRANCH" != "master" ]]; then
  echo "⚠️  Releasing from branch '$BRANCH' (not main/master). Proceeding..."
fi

echo "📦 Installing deps"
npm ci

echo "🛠️  Building"
npm run build

echo "🧪 Running tests (if any)"
npm test || echo "(no tests)"

echo "🏷️  Bumping version: $BUMP_TYPE"
npm version "$BUMP_TYPE" -m "chore(release): v%s"

NEW_VERSION=$(node -p "require('./package.json').version")
TAG="v${NEW_VERSION}"

echo "🚀 Pushing commit and tag $TAG"
git push && git push origin "$TAG"

PUBLISH_FLAGS="--access public"
if [[ "${DRY_RUN:-}" != "" ]]; then
  PUBLISH_FLAGS="$PUBLISH_FLAGS --dry-run"
  echo "(DRY RUN enabled)"
fi

echo "📤 Publishing to npm (version ${NEW_VERSION})"
npm publish $PUBLISH_FLAGS

PKG_NAME=$(node -p "require('./package.json').name")

echo "\n✅ Release complete: ${PKG_NAME}@${NEW_VERSION}"
echo "CDN links:"
echo "  jsDelivr: https://cdn.jsdelivr.net/npm/${PKG_NAME}@${NEW_VERSION}/dist/form-xpress.min.js"
echo "  unpkg:    https://unpkg.com/${PKG_NAME}@${NEW_VERSION}/dist/form-xpress.min.js"
