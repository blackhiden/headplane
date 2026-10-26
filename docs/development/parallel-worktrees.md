# Parallel Feature Development with Git Worktrees

This document describes the workflow for executing roadmap phases using
structured planning and, when appropriate, parallel development through Git
Worktrees and independent Cline agent instances.

## Phase Planning Procedure

1. **Identify submodules** — check `git submodule status`; include submodules in the project.
2. **Analyze** — read `ROADMAP.md`, `CODE_GRAPH.md`, `ARCHITECTURE.md`,
   `SPECIFICATION.md`, `session.md`, and all relevant docs. Inspect the actual
   codebase, not just documentation.
3. **Create comprehensive plan** — break the phase into logical parts/workstreams,
   each with concrete tasks, dependencies, expected files, testing requirements,
   risks, and acceptance criteria.
4. **Identify parallelizable tasks** — select up to 10 tasks that can safely be
   developed independently. Prefer tasks with low coupling. Avoid tasks that
   modify the same core architecture, database migrations, shared components,
   or major API contracts.
5. **Present plan** — STOP and wait for explicit approval before implementation.
6. **Create Git Worktrees** — only after approval.
7. **Assign one task to each independent Cline agent**.
8. **Parallel implementation** — each agent works exclusively in its own worktree.
9. **Testing and validation** — each branch must be independently validated.
10. **Integration analysis** — inspect all feature branches for conflicts.
11. **Present completion report** — STOP and wait for explicit merge approval.

## Parallel Task Selection Rules

- **Maximum 10 parallel tasks.** Use fewer when fewer can be safely developed independently.
- **Prefer tasks with low coupling.** If tasks modify the same files, they should
  be sequential, not parallel.
- **Avoid parallelizing tasks that modify:**
  - Core architecture
  - Database migrations
  - Shared components
  - Major API contracts
  - Configuration
  - Fundamental project structure

## Worktree Creation

Worktrees are created one directory above the project directory:

```text
parent/
├── example-project/
├── example-project-feature-a/
├── example-project-feature-b/
```

Use the provided script:

```bash
./scripts/parallel-feature-worktrees.sh feature-a feature-b feature-c
```

Or manually:

```bash
git worktree add -b feature/feature-a ../example-project-feature-a <main-commit>
```

## Directory Structure

```text
parent/
├── example-project/                    # main worktree (never modified during feature work)
├── example-project-feature-a/          # agent A's worktree
├── example-project-feature-b/          # agent B's worktree
└── example-project-feature-c/          # agent C's worktree
```

## Branch Naming Convention

```text
feature/<short-feature-name>
```

Examples: `feature/add-feedback-search`, `feature/improve-feedback-dashboard`.

All feature branches must originate from the same `main` commit. Never create
branches from other feature branches.

## Agent Assignment

Each task gets a dedicated agent context containing:

```text
Task:
Roadmap Item:
Description:
Objective:
Worktree:
Branch:
Relevant Documentation:
Expected Files/Modules:
Dependencies:
Acceptance Criteria:
Testing Requirements:
Constraints:
```

Each agent must start by changing its working directory to its assigned worktree.

## Worktree Isolation

- Each task must be developed exclusively inside its assigned worktree.
- Never modify the original project worktree while implementing a feature.
- Never modify another feature's worktree.
- Never checkout a different branch inside a feature worktree.
- Never depend on uncommitted changes from another worktree.
- Never copy unfinished source changes between worktrees.
- Never reset or clean another worktree.
- Each feature branch must remain independently reviewable.

## Shared-Resource Handling

Git Worktree isolates files, but some resources may still be shared:

- Local ports — use different development ports for each agent.
- Databases — use isolated databases or test databases.
- Docker containers — use separate containers.
- `.env` files — never overwrite another agent's environment.
- External services — use mocks or isolated instances where possible.
- Temporary directories — use unique temp paths.
- Generated files — regenerate per worktree.
- Caches — use separate cache directories.

## Testing

Every feature branch must be independently validated. At minimum:

- Build succeeds.
- Relevant tests pass.
- New functionality works.
- Existing functionality remains functional.
- No unintended files were changed.
- The branch contains only changes related to the assigned task.

Record the exact commands needed to reproduce validation.

## Review

Each feature branch must be independently reviewable. When an agent completes
its feature:

1. Commit the implementation.
2. Record the commit SHA.
3. Record changed files/modules.
4. Record tests and validation performed.
5. Record known limitations.
6. Provide review instructions.
7. Provide merge instructions.

## Integration

After parallel implementations are complete, inspect all feature branches for:

- Shared files modified by multiple branches
- Database migration conflicts
- API contract conflicts
- Shared component conflicts
- Dependency conflicts
- Configuration conflicts
- Architecture conflicts
- UI consistency issues
- Documentation conflicts

Do not resolve conflicts by modifying feature behavior arbitrarily. If
integration requires a design or architectural decision outside the approved
scope, stop and request confirmation.

## Merge

Feature branches must remain unmerged until explicitly approved. Do not:

- Merge automatically.
- Squash automatically.
- Rebase feature branches automatically.
- Force-push.
- Rewrite history.
- Delete feature branches before approval.

After approval, merge each feature branch into `main` using standard git merge.

## Cleanup

After a feature has been merged and explicitly authorized for cleanup:

```bash
git worktree remove ../example-project-feature-a
git branch -d feature/feature-a
```

Never delete a worktree containing uncommitted changes.

## Common Failure Scenarios

1. **Conflicting file modifications** — two agents modify the same file.
   Prevention: analyze task coupling before parallelizing. If tasks touch the
   same files, make them sequential.
2. **Dependency on uncommitted changes** — an agent depends on another agent's
   uncommitted work. Prevention: each agent commits its work before another
   agent depends on it.
3. **Shared resource conflicts** — two agents use the same port, database, or
   container. Prevention: use isolated resources per agent.
4. **Branch divergence** — feature branches diverge from `main` over time.
   Prevention: keep features small and merge frequently.
5. **Worktree cleanup failures** — worktrees with uncommitted changes block
   cleanup. Prevention: verify no uncommitted work before removing a worktree.

- Core services
- **If a dependency exists between tasks**, place them into sequential work
  rather than pretending they are independent.
