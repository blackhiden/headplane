# Code Graph

> A persistent, high-level structural map of the Headplane codebase for AI agents and developers.

This document serves as a comprehensive architectural reference, allowing agents to understand the project structure instantly and reduce the number of file-reading and search operations needed for reasoning about the code.

---

## Visual Architecture (Mermaid.js)

```mermaid
graph TD
  subgraph Browser
    UI[Headplane UI (React Router 7)]
    WASM[WebSSH (WASM, tsconnect)]
  end

  subgraph NodeJS_Server["Headplane Server (Node.js)"]
    OIDC[OIDC/Auth Services]
    HSAPI[Headscale API Client]
    DB[SQLite (Drizzle ORM)]
    HSConfig[Headscale Config I/O]
    Session[Session/Auth Handling]
    Web[Web Routes/Handlers]
  end

  subgraph Go_Components
    Agent[Headplane Agent (Go)]
  end

  subgraph Headscale
    HeadscaleSrv[Headscale Control Server]
  end

  UI -- HTTP --> NodeJS_Server
  WASM -- WireGuard/DERP --> Tailnet
  NodeJS_Server -- REST API --> HeadscaleSrv
  NodeJS_Server -- Docker/K8s exec --> Agent
  NodeJS_Server -- SQLite --> DB
  NodeJS_Server -- Reads/Writes --> HSConfig
  NodeJS_Server -- OIDC --> OIDC
  NodeJS_Server -- Session --> Session
  NodeJS_Server -- API Client --> HSAPI
  Agent -- Tailnet --> HeadscaleSrv
  Agent -- Reports node details --> NodeJS_Server
  HeadscaleSrv -- Tailnet --> Tailnet
```

---

## Technology Stack

- **Frontend:** React Router 7 (framework mode), React 19, Vite, TailwindCSS
- **Backend:** Node.js ≥24.2, TypeScript 7.0
- **Database:** SQLite via Drizzle ORM 1.0.0-rc.4
- **Go Components:** Tailscale/tsnet for agent and WASM SSH
- **Build Tools:** PNPM ≥10.4, oxlint, oxfmt
- **Deployment:** Docker, native binaries (.deb, .tar.gz)

---

## Structured Code Graph Index

### Core Entry Points

#### [app/root.tsx]

- **Role:** Main React entry point; sets up layout, providers, and error boundaries.
- **Exports:** `App`, `Layout`, `ErrorBoundary`, `meta`, `loader`
- **Dependencies:** React, React Router, `~/utils/live-data`, `~/utils/toast-provider`, `~/utils/color-scheme`, `~/server/context`
- **Incoming References:** Used by the server's request listener as the root component.
- **Key Functions/Logic:**
  - `loader({ request, context })` → Loads color scheme preference and version info (Headplane/Headscale) for update checks.
  - `Layout({ children })` → Top-level layout wrapper with providers: `LiveDataProvider`, `PluginProvider`, `UpdateCheckProvider`, theme class binding.
  - `ErrorBoundary({ error })` → Global error boundary for unhandled route errors.
  - `App()` → Renders `<Outlet />` for nested routes.

#### [app/routes.ts]

- **Role:** Central route definition for all UI and API endpoints.
- **Exports:** Default array of route definitions.
- **Dependencies:** `@react-router/dev/routes`, all route modules in `app/routes/`.
- **Incoming References:** Consumed by React Router build and server request handler.
- **Key Functions/Logic:**
  - Defines hierarchical route structure with layouts and prefixes.
  - Routes: `/machines`, `/users`, `/acls`, `/dns`, `/routes`, `/derp`, `/topology`, `/audit`, `/instances`, `/admin`, `/settings`, `/ssh/:id`.
  - API routes: `/api/info`, `/api/color-scheme`, `/api/update-check`, `/api/v1/headplane/settings`, `/api/admin/apikeys`.
  - Auth routes: `/login`, `/logout`, `/oidc/callback`, `/oidc/start`.
  - Utility routes: `/healthz`, `/events/live`.

#### [app/server/main.ts]

- **Role:** Production server bootstrap; binds HTTP(S) server, static assets, and request listener.
- **Exports:** None (entry point).
- **Dependencies:** Node.js core modules (`fs/promises`, `path`, `process`, `url`), `./app`, `../../runtime/http`, `~/utils/log`.
- **Incoming References:** Entry point for production build (`build/server/index.js`).
- **Key Functions/Logic:**
  - Reads config from `./app`, sets up optional TLS if `server.tls_cert_path` and `server.tls_key_path` are configured.
  - Starts HTTP(S) server with static asset serving from `build/client/`.
  - Writes listen file for Docker healthcheck (`HEADPLANE_LISTEN_FILE` env var).
  - Handles graceful shutdown with `dispose()` callback.

#### [app/server/app.ts]

- **Role:** Loads config, builds app context, exports React Router request listener.
- **Exports:** `config` (HeadplaneConfig), `dispose()`, default (request listener).
- **Dependencies:** `@react-router/node`, `react-router`, all context modules, config loader, logging.
- **Incoming References:** Used by `main.ts` (production) and `runtime/vite-plugin.ts` (dev).
- **Key Functions/Logic:**
  - `loadConfig()` → Loads and validates Headplane configuration, aborts on error.
  - `createAppContext(config)` → Builds per-process context with all services.
  - `ctx.startServices()` → Initializes background services (auth session pruning, agent sync, etc.).
  - `getLoadContext(request, client)` → Wires context into React Router's request context.
  - `dispose()` → Cleans up resources on shutdown.

### Server Context & Services

#### [app/server/context.ts]

- **Role:** Defines and builds the per-process application context (service locator pattern).
- **Exports:** Context objects (`agentsContext`, `appConfigContext`, `auditContext`, `authContext`, `dbContext`, `headscaleContext`, `headscaleApiKeyContext`, `headscaleConfigContext`, `headscaleLiveStoreContext`, `integrationContext`, `localAdminContext`, `oidcContext`, `requestApiContext`), `createAppContext(config)`.
- **Dependencies:** All server-side services: `./audit`, `./auth/local-admin`, `./config/*`, `./db/client.server`, `./feature`, `./headscale/api`, `./headscale/config-loader`, `./headscale/live-store`, `./hp-agent`, `./oidc/provider`, `./web/auth`, logging.
- **Incoming References:** Used by `app.ts`, route loaders, and actions.
- **Key Functions/Logic:**
  - `createAppContext(config)` → Instantiates all services, resolves dependencies, returns context object with `startServices()` and `dispose()` lifecycle methods.
  - Conditionally enables/disables OIDC, agent, proxy auth, and local admin based on config.

---

### Configuration & Headscale Integration

#### [app/server/config/config-schema.ts]

- **Role:** Defines and validates the Headplane configuration schema using arktype.
- **Exports:** `headplaneConfig`, `partialHeadplaneConfig`, and component schemas.
- **Dependencies:** arktype, integration schemas.
- **Key Functions/Logic:**
  - Defines server config (host, port, TLS, cookies, proxy auth).
  - Defines Headscale config (URL, API key, config path, DNS records path).
  - Defines OIDC config (issuer, client ID/secret, endpoints, claims, role mapping).
  - Defines user config (local admin username/password hash).

#### [app/server/config/load.ts]

- **Role:** Loads Headplane configuration from YAML file and environment variables.
- **Exports:** `loadConfig()`.
- **Dependencies:** Node.js `fs`, arktype, `js-yaml`, config schema, error types.
- **Key Functions/Logic:**
  - Reads config from `HEADPLANE_CONFIG_PATH` (default: `./config.yaml`).
  - Merges config with `HEADPLANE_*` environment variable overrides.
  - Resolves `*_path` fields (reads secrets from disk).
  - Validates against schema, throws `ConfigError` on failure.

#### [app/server/headscale/config-loader.ts]

- **Role:** Loads and validates Headscale YAML config, DNS config, and handles patching.
- **Exports:** `loadHeadscaleConfig(path, dnsPath)`, patch functions, config views.
- **Dependencies:** Node.js `fs/promises`, valibot, yaml, logging, `./config-dns`.
- **Key Functions/Logic:**
  - `loadHeadscaleConfig(path, dnsPath)` → Loads Headscale config from disk, validates, returns config object with read/write capabilities.
  - `patchHeadscaleConfig(config, patches)` → Applies YAML patches to Headscale config, writes back to disk.
  - Provides views: `getDNSConfig()`, `getOIDCConfig()`, `getMagicDNSBaseDomain()`.

#### [app/server/headscale/api/]

- **Role:** Implements Headscale REST API client.
- **Exports:** `createHeadscale({ url, certPath })`, Headscale client factory.
- **Dependencies:** HTTP client (undici), config, error handling.
- **Key Functions/Logic:**
  - Provides methods for interacting with Headscale API: `nodes.list()`, `users.list()`, `policy.get()`, `preAuthKeys.create()`, etc.
  - Handles version detection and capability detection.
  - Supports custom TLS cert for self-signed certificates.

---

### Database & Persistence

#### [app/server/db/client.server.ts]

- **Role:** Creates and migrates the SQLite database using Drizzle ORM.
- **Exports:** `createDbClient(path)`.
- **Dependencies:** drizzle-orm/node-sqlite, logging.
- **Key Functions/Logic:**
  - Ensures DB directory exists (`mkdir -p`).
  - Creates SQLite database at specified path.
  - Runs migrations from `./drizzle/` directory.

#### [app/server/db/schema.ts]

- **Role:** Defines SQLite schema for all persistent Headplane data.
- **Exports:** Table definitions (`hostInfo`, `users`, `authSessions`, `auditLog`, `instances`), inferred types.
- **Dependencies:** drizzle-orm/sqlite-core, `~/types`.
- **Key Functions/Logic:**
  - `hostInfo` → Stores agent-reported node metadata (OS version, connectivity).
  - `users` → Stores Headplane users (OIDC subjects, roles, linked Headscale users).
  - `authSessions` → Stores authentication sessions (OIDC, API key, password).
  - `auditLog` → Stores audit trail for actions.
  - `instances` → Stores multi-instance configurations.

---

### Authentication & Authorization

#### [app/server/oidc/provider.ts]

- **Role:** Implements OIDC authentication flow, token exchange, and user identity resolution.
- **Exports:** `createOidcService(config)`, `OidcService` interface, error types.
- **Dependencies:** jose (JWT verification), Node.js crypto, logging, result helpers.
- **Key Functions/Logic:**
  - `discover()` → Performs OIDC discovery (`.well-known/openid-configuration`), caches endpoints.
  - `startFlow()` → Generates authorization URL with PKCE, state, and nonce.
  - `handleCallback(params, flowState)` → Exchanges authorization code for tokens, validates ID token, extracts user identity.
  - `buildEndSessionUrl(idToken)` → Builds logout URL for OIDC provider.
  - Supports `client_secret_basic` and `client_secret_post` authentication methods.

#### [app/server/web/auth.ts]

- **Role:** Central authentication and session management service.
- **Exports:** `createAuthService(options)`, `AuthService` interface, `Principal` types.
- **Dependencies:** drizzle-orm, react-router cookies, ulidx, db schema, roles, CIDR matching.
- **Key Functions/Logic:**
  - `require(request)` → Authenticates request, returns `Principal` (OIDC, proxy auth, API key, or password).
  - `can(principal, capabilities)` → Checks role-based permissions.
  - `canManageNode(principal, node)` → Checks if user can manage a specific machine.
  - `createOidcSession(userId, profile, options)` → Creates session for OIDC login.
  - `findOrCreateUser(subject, profile, options)` → OIDC user provisioning.
  - `linkHeadscaleUser(userId, headscaleUserId)` → Links Headplane user to Headscale user.
  - `transferOwnership(currentOwnerId, newOwnerId)` → Transfers owner role.
  - Supports proxy authentication with CIDR-based IP validation.

#### [app/server/web/roles.ts]

- **Role:** Defines role-based access control (RBAC) system.
- **Exports:** `Roles`, `Capabilities`, role/capability mappings.
- **Key Functions/Logic:**
  - Defines roles: `owner`, `admin`, `auditor`, `member`.
  - Defines capabilities: `read_machines`, `write_machines`, `read_users`, `write_users`, `read_policy`, `write_policy`, `read_network`, `write_network`, `read_audit`, `write_settings`.

---

### Agent Integration

#### [app/server/hp-agent.ts]

- **Role:** Manages communication with the Headplane Agent (Go component).
- **Exports:** `createAgentManager(config, hsUrl, apiClient, supportsTagOnlyKeys, db)`, `AgentManager` interface.
- **Dependencies:** Headscale API client, db schema, Docker/K8s integrations.
- **Key Functions/Logic:**
  - Discovers agent via Docker exec or Kubernetes pod exec.
  - Generates ephemeral pre-auth keys for agent to join Tailnet.
  - Periodically syncs node metadata from agent (OS versions, connectivity).
  - `lookup(nodeKeys)` → Returns cached node metadata.

#### [cmd/hp_agent/]

- **Role:** Go-based agent; joins Tailnet, reports node details not available via Headscale API.
- **Exports:** Standalone binary (`hp_agent`).
- **Dependencies:** Tailscale/tsnet (`internal/tsnet`), Headscale API.
- **Key Functions/Logic:**
  - Connects to Tailnet using tsnet with pre-auth key.
  - Periodically queries Tailnet nodes for metadata (OS version, connectivity).
  - Exposes `/api/stats` endpoint for Headplane server to poll.

---

### Frontend Routes & Pages

#### [app/routes/machines/overview.tsx]

- **Role:** Machines overview page; lists nodes, handles bulk actions, integrates with agent and Headscale.
- **Exports:** `loader`, `action` (via `machineAction`), `ErrorBoundary`, default page component.
- **Dependencies:** Contexts, node info utils, UI components, dialogs, filters.
- **Incoming References:** Route `/machines`.
- **Key Functions/Logic:**
  - Loads nodes, users, agent stats, policy tags, permissions.
  - Renders machine table with filtering, sorting, and bulk actions.

#### [app/routes/users/overview.tsx]

- **Role:** Users overview page; lists Headplane and Headscale users, linking, and group management.
- **Exports:** `loader`, `action` (via `userAction`), `ErrorBoundary`, default page component.
- **Dependencies:** Contexts, user utils, ACL policy utils, UI components.
- **Incoming References:** Route `/users`.
- **Key Functions/Logic:**
  - Loads users from DB and Headscale, computes groups from policy.
  - Supports user linking, unlinking, role assignment, deletion.

#### [app/routes/acls/overview.tsx]

- **Role:** Access Control List (ACL) policy editor and visualizer.
- **Exports:** `loader`, `action`, `ErrorBoundary`, default page component.
- **Dependencies:** Policy utils, UI components, CodeMirror (lazy-loaded).
- **Incoming References:** Route `/acls`.
- **Key Functions/Logic:**
  - Provides structured editors, file editor, and diff viewer for ACL policies.

#### [app/routes/dns/overview.tsx]

- **Role:** DNS settings page; manages Magic DNS, nameservers, records, and domains.
- **Exports:** `loader`, `action`, `ErrorBoundary`, default page component.
- **Dependencies:** Contexts, DNS utils, UI components.
- **Incoming References:** Route `/dns`.

#### [app/routes/settings/overview.tsx]

- **Role:** Main settings dashboard; links to profile, agent, export, and restrictions.
- **Exports:** `loader`, `ErrorBoundary`, default page component.
- **Dependencies:** Contexts, compatibility utils, UI components.
- **Incoming References:** Route `/settings`.

#### [app/routes/ssh/page.tsx]

- **Role:** Browser-based SSH page; launches ephemeral WASM SSH client into Tailnet.
- **Exports:** `loader`, `ErrorBoundary`, default page component.
- **Dependencies:** Contexts, WASM client, Ghostty terminal, UI components.
- **Incoming References:** Route `/ssh/:id`.
- **Key Functions/Logic:**
  - Generates ephemeral pre-auth key, launches WASM client, opens SSH session.

---

### UI Components, Hooks & Go Components

#### [app/components/]

- **Role:** Reusable UI components built with Base UI and TailwindCSS.
- **Key Components:** Button, Dialog, Input, Select, Menu, Card, Chip, Notice, Text, Title, Callout, ActionDialog, Tabs, etc.
- **Recent Updates (Oct 2026):**
  - Restored `Card.Title` and `Card.Text` subcomponents to fix login page crash.
  - Added `Text` (muted paragraph) and `Title` (semibold heading) components.
  - Added `Notice` as an alias for `Callout` with default "info" variant.
  - `Callout` hardened with defensive fallback for unknown variants.
  - `Select` hardened: added `aria-label` support, made `label` optional.
  - `ActionDialog` fixed to always use `Dialog` root (removed invalid AlertDialog namespace usage).
  - `Field` component: made label conditional to support `aria-label`-only usage.
  - Migrated from hardcoded Tailwind colors to design system semantic color tokens.

#### [app/hooks/]

- **Role:** Shared React custom hooks.
- **Key Hooks:**
  - `useForm<T>({ schema, defaultValues, validate })` → Form state with arktype validation.
  - `useMachineFilterParams()` → URL-persisted machine filters/sort/page.

#### [app/utils/]

- **Role:** Shared utility functions.
- **Key Utilities:** `acl-policy.ts`, `cn.ts`, `node-info.ts`, `log.ts`, `time.ts`, `user.ts`.

#### [cmd/hp_ssh/]

- **Role:** WebAssembly SSH client built with Tailscale's Go packages.
- **Exports:** WASM binary (`hp_ssh.wasm`).

#### [internal/tsnet/]

- **Role:** Go package for Tailscale/tsnet integration (used by agent).

---

## Major Data Flows

### 1. User Authentication (OIDC)

```
Browser → /oidc/start → OIDC Provider → /oidc/callback
  → oidcService.handleCallback() → authService.findOrCreateUser()
  → authService.createOidcSession() → Set session cookie → Redirect to app
```

### 2. Machine Management

```
Browser → /machines → loader()
  → headscaleLiveStore.get(nodesResource, api)
  → Headscale API /api/v1/node
  → agents.lookup(nodeKeys) [if enabled]
  → Render machine table with filters/sorts
```

### 3. ACL Policy Editing

```
Browser → /acls → loader()
  → api.policy.get() → Parse policy → Render editors
  → User edits → action() → api.policy.set() → Revalidate
```

### 4. DNS Configuration

```
Browser → /dns → loader()
  → headscaleConfig.getDNSConfig() → Render forms
  → User edits → action() → patchHeadscaleConfig() → Revalidate
```

### 5. Browser SSH

```
Browser → /ssh/:id → loader()
  → Check agent, fetch node, generate pre-auth key → Render console
  → connectTailnet() (WASM) → Join Tailnet → Open SSH session
```

### 6. Agent Sync

```
Agent (Go) → Join Tailnet → Periodic sync
  → Query Tailnet nodes → Report to server
  → Server → Store in SQLite (hostInfo table)
  → Routes query agents.lookup() → Return cached data
```

---

## Entry Points

- **HTTP(S) Entrypoint:** `app/server/main.ts` → `app/server/app.ts` → React Router request listener.
- **Route Entrypoints:** Defined in `app/routes.ts`, implemented in `app/routes/*/*.tsx`.
- **API Entrypoints:** `/api/*` routes for JSON APIs.
- **Dev Entrypoint:** `runtime/vite-plugin.ts` (loads `app/server/app.ts` via Vite SSR).

---

## Persistence

- **Headplane State:** SQLite database at `server.data_path/hp_persist.db`.
  - Users, sessions, audit log, agent metadata, instances.
- **Headscale State:** Not persisted by Headplane (read via API).
  - Nodes, users, policies, routes, pre-auth keys.
- **Headscale Config:** YAML file at `headscale.config_path`.
  - DNS settings, OIDC settings (Headplane can read/write if writable).
- **DNS Records:** JSON file at `headscale.dns_records_path` (if configured).

---

## Key Design Decisions

| Decision                                  | Rationale                                              | Trade-off                             |
| ----------------------------------------- | ------------------------------------------------------ | ------------------------------------- |
| Closure-factory services, no DI framework | Explicit dependencies, testable without module mocking | Manual wiring in `createAppContext()` |
| Single Node process for UI + server       | Simple deployment, one config file, one port           | Vertical scaling only                 |
| SQLite via Drizzle for Headplane state    | Zero-dependency persistence                            | Not multi-instance                    |
| Browser SSH as WASM in the client         | No server-side SSH relay; peer-to-peer                 | Large WASM payload                    |
| Separate Go agent for node details        | Headscale API lacks some data                          | Extra component to deploy             |
| Strict config validation at startup       | Fail fast on misconfiguration                          | Invalid keys abort startup            |

---

## Constraints and Dependencies

- Node ≥ 24.2, PNPM ≥ 10.4
- TypeScript 7.0 for app/server code
- Go 1.21+ for agent and WASM SSH
- Headscale ≥ 0.27.0 (0.28+ recommended for agent support)
- oxlint/oxfmt for TS linting/formatting
- Drizzle ORM 1.0.0-rc.4 for database
- React Router 7 for framework

---

## Documentation

- **User docs:** `docs/` (VitePress site at https://headplane.net)
- **Architecture:** `docs/ARCHITECTURE.md` (canonical reference)
- **Contributing:** `docs/CONTRIBUTING.md`
- **Specification:** `docs/SPECIFICATION.md`
- **Roadmap:** `docs/ROADMAP.md`
- **Session notes:** `session.md` (ephemeral working context)

---

## Related Files

- **ARCHITECTURE.md:** Points to `docs/ARCHITECTURE.md`.
- **AGENTS.md:** High-level guidance for AI agents.
- **SPECIFICATION.md:** Requirements and acceptance criteria.
- **CHANGELOG.md:** User-facing changelog.
- **session.md:** Current working context and decisions.

---

_Last updated: 2026-10-25 by AI agent (added hooks, new components, UI refactors, component hardening)._
