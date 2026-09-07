# API & Service Communication Contracts

GrowFi currently exposes one Express API service with synchronous JSON/HTTP
communication. The complete request, response, validation, authorization, and
open-question contract is maintained in [`api-spec.md`](../../../../../api-spec.md).

## Service Catalog

| Service | Port | Category | Purpose |
|---|---:|---|---|
| GrowFi Express API | Not configured | API Layer | Authenticated financial habit and wealth-tracking API |
| PostgreSQL | External dependency | Infrastructure | Prisma persistence for the ten schema models |

## API Endpoints Inventory

| Service | Method | Path | Request Type | Response Type |
|---|---|---|---|---|
| GrowFi API | POST/GET | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` | Auth DTO / Bearer JWT | User and JWT DTOs |
| GrowFi API | GET/POST/PUT/DELETE | `/api/income` and `/api/income/:id` | IncomeSource fields | IncomeSource |
| GrowFi API | GET/POST/PUT/DELETE | `/api/expenses`, `/api/expenses/:id` | Expense fields and filters | Expense |
| GrowFi API | GET/POST/DELETE | `/api/expense-categories`, `/api/expense-categories/:id` | ExpenseCategory writable fields | ExpenseCategory |
| GrowFi API | GET/POST/PUT/DELETE | `/api/habits`, `/api/habits/:id` | Habit fields | Habit plus computed streakCount |
| GrowFi API | POST/GET | `/api/habits/:id/log`, `/api/habits/:id/logs` | HabitLog command/filter | HabitLog |
| GrowFi API | GET/POST/PUT/DELETE | `/api/goals`, `/api/goals/:id` | SavingsGoal fields and contribution command | SavingsGoal plus percentComplete |
| GrowFi API | GET/POST/PUT/DELETE | `/api/assets`, `/api/assets/:id` | Asset fields | Asset |
| GrowFi API | GET | `/api/networth`, `/api/networth/history`, `/api/dashboard` | Date filters | Computed net-worth/dashboard DTOs |
| GrowFi API | GET/PATCH | `/api/admin/users`, `/api/admin/users/:id`, `/api/admin/feedback`, `/api/admin/feedback/:id`, `/api/admin/analytics` | Admin filters/commands | Admin DTOs and KPI DTO |

## Management & Observability Endpoints

| Service | Endpoint | Custom Metrics |
|---|---|---|
| GrowFi API | `/api/health` | None currently configured |

## DTOs & Contracts

Persisted response contracts use the Prisma model field names from
`backend/prisma/schema.prisma`. Decimal values serialize as strings and dates
as ISO date/timestamp strings. `passwordHash` is never exposed. Computed
`streakCount`, `percentComplete`, net-worth totals, dashboard totals, and
analytics KPIs are server-owned DTO values.

## Communication Patterns

All planned application calls are synchronous HTTP JSON calls from the frontend
to the Express API, with synchronous Prisma calls to PostgreSQL. No message
broker, service discovery, gateway, retry, or circuit-breaker configuration is
present. JWT authentication uses the `Authorization: Bearer <token>` header;
admin routes compose `requireAuth` with a database-backed `requireRole("admin")`
middleware. Custom expense categories belong to their creating user, while
seeded defaults have a null owner. Net worth is
`SUM(assets.current_value) + SUM(savings_goals.current_amount)` and excludes
income minus expenses. Database dates and timestamps are stored in UTC; the
frontend converts them for local display. The active-user and engagement KPI
definitions remain the only product-level questions.

## Service Technology Matrix

| Service | Web | Data Access | Discovery | Gateway | Health | Cache | Metrics |
|---|---|---|---|---|---|---|---|
| GrowFi API | Express 5 | Prisma 7 + PostgreSQL | None | None | `/api/health` | None | None |

## Service Communication Sequence

<!-- mermaid-checked: every participant uses `participant Id as "Label"`, no \n in aliases/messages/notes, every alt/opt/loop closed by end, no `:` inside any alias -->
~~~mermaid
sequenceDiagram
    participant Client as "Frontend Client"
    participant API as "GrowFi Express API"
    participant Auth as "Auth Middleware"
    participant Prisma as "Prisma Client"
    participant DB as "PostgreSQL"
    Client->>API: GET /api/dashboard with Bearer JWT
    API->>Auth: Verify JWT and load current user
    Auth->>Prisma: Find active user by userId
    Prisma->>DB: Query user
    DB-->>Prisma: User role and identity
    Prisma-->>Auth: Authenticated user
    Auth-->>API: Authorized request context
    API->>Prisma: Aggregate income expenses habits goals assets
    Prisma->>DB: Execute scoped aggregate queries
    DB-->>Prisma: Persisted rows and aggregates
    Prisma-->>API: Computed dashboard DTO
    API-->>Client: 200 data envelope
~~~
