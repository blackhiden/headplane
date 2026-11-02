# Database and Configuration Schema

This document defines the persistent data schemas used by Headplane: the SQLite database tables managed by Drizzle ORM and the configuration schema defined in `config.yaml`.

## SQLite Database Schema (`app/server/db/schema.ts`)

Headplane stores persistent application data in SQLite (`hp_persist.db` in `server.data_path`).

### 1. `auth_sessions` Table

Stores active authentication sessions across authentication methods (OIDC, API key, and local username/password).

| Column            | Type      | Nullable | Description                                          |
| ----------------- | --------- | -------- | ---------------------------------------------------- |
| `id`              | `TEXT`    | No       | Primary key, unique session identifier (`sid`)       |
| `kind`            | `TEXT`    | No       | Session type: `'oidc'`, `'api_key'`, or `'password'` |
| `user_id`         | `TEXT`    | Yes      | Foreign key reference to `users.id` (OIDC sessions)  |
| `api_key_hash`    | `TEXT`    | Yes      | SHA-256 hash of API key for verification             |
| `api_key_display` | `TEXT`    | Yes      | Masked display string for the API key                |
| `oidc_id_token`   | `TEXT`    | Yes      | Cached OIDC ID token                                 |
| `expires_at`      | `INTEGER` | No       | Expiration timestamp in milliseconds                 |
| `created_at`      | `INTEGER` | Yes      | Creation timestamp in milliseconds                   |

**Notes on password authentication:**

- When a local admin signs in with username/password, a session with `kind = 'password'` is recorded.
- Password sessions are invalidated en masse by `invalidatePasswordSessions()` whenever the username or password hash is updated.

---

### 2. `users` Table

Stores user accounts provisioned through OIDC or administrative mapping.

| Column              | Type      | Nullable | Description                                                          |
| ------------------- | --------- | -------- | -------------------------------------------------------------------- |
| `id`                | `TEXT`    | No       | Primary key, unique user identifier                                  |
| `sub`               | `TEXT`    | No       | Unique OIDC subject identifier                                       |
| `name`              | `TEXT`    | Yes      | User display name                                                    |
| `email`             | `TEXT`    | Yes      | User email address                                                   |
| `picture`           | `TEXT`    | Yes      | User profile picture URL                                             |
| `role`              | `TEXT`    | No       | Role assignment (`'admin'`, `'member'`, etc., default: `'member'`)   |
| `headscale_user_id` | `TEXT`    | Yes      | Corresponding Headscale user mapping                                 |
| `created_at`        | `INTEGER` | Yes      | Creation timestamp                                                   |
| `updated_at`        | `INTEGER` | Yes      | Last update timestamp                                                |
| `last_login_at`     | `INTEGER` | Yes      | Timestamp of most recent login                                       |
| `caps`              | `INTEGER` | No       | Deprecated capability bitmask (kept for 1.0 migration compatibility) |

---

### 3. `audit_log` Table

Stores audit trail events for administrative and security actions.

| Column          | Type          | Nullable | Description                                                     |
| --------------- | ------------- | -------- | --------------------------------------------------------------- |
| `id`            | `TEXT`        | No       | Primary key (ULID or UUID)                                      |
| `actor_id`      | `TEXT`        | Yes      | ID of the actor initiating the action (`null` for password/CLI) |
| `actor_name`    | `TEXT`        | No       | Name or username of the actor (e.g., local admin username)      |
| `action`        | `TEXT`        | No       | Action performed (e.g., `user.login`, `config.update`)          |
| `resource_type` | `TEXT`        | No       | Type of resource affected (e.g., `node`, `config`, `session`)   |
| `resource_id`   | `TEXT`        | Yes      | Identifier of the affected resource                             |
| `details`       | `TEXT` (JSON) | Yes      | Structured metadata payload describing the event                |
| `created_at`    | `INTEGER`     | No       | Event timestamp                                                 |

---

### 4. `host_info` Table

Stores cached host metadata gathered by the Headplane Agent.

| Column       | Type          | Nullable | Description                                                  |
| ------------ | ------------- | -------- | ------------------------------------------------------------ |
| `host_id`    | `TEXT`        | No       | Primary key, node/host identifier                            |
| `payload`    | `TEXT` (JSON) | Yes      | JSON representation of `HostInfo` (versions, OS, interfaces) |
| `updated_at` | `INTEGER`     | Yes      | Last sync timestamp                                          |

---

### 5. `instances` Table

Stores multi-instance configuration for multi-headscale setups.

| Column                         | Type             | Nullable | Description                          |
| ------------------------------ | ---------------- | -------- | ------------------------------------ |
| `id`                           | `TEXT`           | No       | Primary key                          |
| `name`                         | `TEXT`           | No       | Human-readable instance name         |
| `api_url`                      | `TEXT`           | No       | Headscale API URL                    |
| `api_key_encrypted`            | `TEXT`           | Yes      | Encrypted Headscale API key          |
| `oidc_client_id`               | `TEXT`           | Yes      | OIDC client identifier               |
| `oidc_client_secret_encrypted` | `TEXT`           | Yes      | Encrypted OIDC client secret         |
| `is_default`                   | `INTEGER` (bool) | No       | Whether this is the default instance |
| `created_at`                   | `INTEGER`        | No       | Creation timestamp                   |
| `updated_at`                   | `INTEGER`        | No       | Last update timestamp                |

---

## Configuration Schema (`app/server/config/config-schema.ts`)

Headplane configuration is defined in YAML (`config.yaml`) and validated using ArkType.

### Core Sections

- **`server`**: HTTP listener configuration, port, host, base path, data path (`hp_persist.db`), cookie secrets, security flags.
- **`headscale`**: Headscale API connection settings, URL, API key (`headscale.api_key` or `headscale.api_key_path`), config path, TLS certificate path.
- **`user`**: Optional local single-administrator profile (username/password authentication).
  - `username` (`string`): Administrator username.
  - `password` (`string`): Bcrypt cost-12 password verification hash (or `password_path` for secret files).
  - `name` (`string?`): Optional display name.
  - `avatar` (`string?`): Optional HTTPS URL or local path for avatar image.
- **`oidc`**: OpenID Connect single sign-on settings (disabled when `user` is configured).
- **`integration`**: Optional third-party integrations (e.g., Proxmox, Kubernetes).
