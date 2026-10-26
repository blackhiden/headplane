#!/usr/bin/env bash
# parallel-feature-worktrees.sh
#
# Creates isolated Git worktrees for parallel feature development.
# Each worktree gets its own feature branch originating from the current main.
#
# Usage:
#   ./scripts/parallel-feature-worktrees.sh <feature-name> [<feature-name> ...]
#
# Example:
#   ./scripts/parallel-feature-worktrees.sh add-feedback-search improve-feedback-dashboard
#
# Safety:
#   - Never deletes existing work or silently overwrites an existing worktree.
#   - Aborts if the repository is not clean.
#   - All feature branches originate from the same main commit.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARENT_DIR="$(dirname "$REPO_ROOT")"
REPO_NAME="$(basename "$REPO_ROOT")"

if [ $# -eq 0 ]; then
  echo "Usage: $0 <feature-name> [<feature-name> ...]" >&2
  exit 1
fi

# Verify the repository is clean
if [ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]; then
  echo "Error: Working tree is not clean. Commit or stash changes first." >&2
  exit 1
fi

# Record the current main commit
MAIN_COMMIT="$(git -C "$REPO_ROOT" rev-parse HEAD)"
echo "Creating worktrees from commit: $MAIN_COMMIT"

for feature in "$@"; do
  WORKTREE_PATH="$PARENT_DIR/$REPO_NAME-$feature"
  BRANCH_NAME="feature/$feature"

  # Check if the worktree already exists
  if [ -d "$WORKTREE_PATH" ]; then
    echo "Skipping '$feature': worktree already exists at $WORKTREE_PATH" >&2
    continue
  fi

  # Check if the branch already exists
  if git -C "$REPO_ROOT" show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
    echo "Skipping '$feature': branch '$BRANCH_NAME' already exists" >&2
    continue
  fi

  echo "Creating worktree for '$feature'..."
  git -C "$REPO_ROOT" worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH" "$MAIN_COMMIT"
  echo "  Worktree: $WORKTREE_PATH"
  echo "  Branch:   $BRANCH_NAME"
done

echo ""
echo "Done. Each worktree is ready for an independent agent."
echo "To remove a worktree: git worktree remove <path>"
echo "To delete a branch:   git branch -D <branch>"