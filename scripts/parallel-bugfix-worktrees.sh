#!/usr/bin/env bash
# scripts/parallel-bugfix-worktrees.sh
#
# Creates isolated Git worktrees for parallel bug-fix development.
# Each worktree gets its own bugfix branch originating from the current base branch.
#
# Usage:
#   ./scripts/parallel-bugfix-worktrees.sh <bug-name> [<bug-name> ...]
#
# Example:
#   ./scripts/parallel-bugfix-worktrees.sh update-check-prefix tech-info-prefix admin-users-signout
#
# Safety:
#   - Never deletes existing work or silently overwrites an existing worktree.
#   - Verifies the target repository and base branch.
#   - All bugfix branches originate from the same base commit.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARENT_DIR="$(dirname "$REPO_ROOT")"
REPO_NAME="$(basename "$REPO_ROOT")"

if [ $# -eq 0 ]; then
  echo "Usage: $0 <bug-name> [<bug-name> ...]" >&2
  exit 1
fi

# Verify git repository
if ! git -C "$REPO_ROOT" rev-parse --git-dir > /dev/null 2>&1; then
  echo "Error: $REPO_ROOT is not a valid git repository." >&2
  exit 1
fi

# Record current base commit
BASE_COMMIT="$(git -C "$REPO_ROOT" rev-parse HEAD)"
CURRENT_BRANCH="$(git -C "$REPO_ROOT" branch --show-current)"
echo "Base branch: $CURRENT_BRANCH ($BASE_COMMIT)"

for bug in "$@"; do
  WORKTREE_PATH="$PARENT_DIR/$REPO_NAME-bugfix-$bug"
  BRANCH_NAME="bugfix/$bug"

  # Check if worktree directory exists
  if [ -d "$WORKTREE_PATH" ]; then
    echo "Skipping '$bug': worktree already exists at $WORKTREE_PATH" >&2
    continue
  fi

  # Check if branch exists
  if git -C "$REPO_ROOT" show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
    echo "Skipping '$bug': branch '$BRANCH_NAME' already exists" >&2
    continue
  fi

  echo "Creating worktree for '$bug'..."
  git -C "$REPO_ROOT" worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH" "$BASE_COMMIT"
  
  # Symlink node_modules if present in the main repo to enable immediate builds/tests without re-installing
  if [ -d "$REPO_ROOT/node_modules" ] && [ ! -e "$WORKTREE_PATH/node_modules" ]; then
    ln -s "$REPO_ROOT/node_modules" "$WORKTREE_PATH/node_modules"
    echo "  Symlinked node_modules to $WORKTREE_PATH/node_modules"
  fi

  echo "  Worktree: $WORKTREE_PATH"
  echo "  Branch:   $BRANCH_NAME"
done

echo ""
echo "Done. Each worktree is ready for isolated development."
echo "To clean up later:"
echo "  git -C \"$REPO_ROOT\" worktree remove <worktree-path>"
echo "  git -C \"$REPO_ROOT\" branch -d <branch-name>"
