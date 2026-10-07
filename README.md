# GrowFi

GrowFi is a personal finance and habit-building platform for tracking day-to-day
money decisions and measuring long-term wealth growth. It combines financial
tracking, savings goals, habit accountability, and wealth analytics in one
authenticated application.

## Features

- Secure registration and JWT-based authentication
- Dashboard with an overview of financial activity and progress
- Income and expense tracking with default and user-owned expense categories
- Financial habit tracking with daily, weekly, and monthly frequencies
- Live habit streak calculation from habit log history
- Savings goals with transactional contributions and progress percentages
- Asset tracking and net-worth snapshots
- Wealth analytics and historical progress visualization
- Role-protected administration and feedback management
- Consistent JSON API responses with validation and error envelopes

## Technology stack

### Frontend

- React 19
- Vite
- React Router
- Axios
- Tailwind CSS
- Recharts
- React Hook Form and Zod
- Lucide React

### Backend

- Node.js
- Express 5
- PostgreSQL
- Prisma 7
- JWT and bcryptjs authentication
- Zod validation
- Jest and Supertest

## Repository structure

```text
GrowFi/
├── backend/
│   ├── prisma/                 # Prisma schema, migrations, and seed script
│   └── src/
│       ├── middleware/         # Authentication and error handling
│       ├── routes/             # API route handlers and route tests
│       ├── services/           # Domain services
│       ├── utils/              # Shared server utilities
│       └── validators/         # Request validation schemas
├── frontend/
│   └── src/
│       ├── components/         # Shared UI and layout components
│       ├── context/            # Authentication and application context
│       └── pages/              # Application screens
├── DOCS/                       # Product and data-model documentation
├── api-spec.md                 # Frontend/backend API contract
└── set_up.md                   # Original setup notes
```

## Prerequisites

- Node.js and npm
- PostgreSQL
- A PostgreSQL database named `growfi` (or an equivalent database configured
  through `DATABASE_URL`)

## Local development

### 1. Clone the repository

```bash
git clone <repository-url>
cd GrowFi
```

### 2. Configure the backend

Install backend dependencies and create `backend/.env` from the example:

```bash
cd backend
npm install
cp .env.example .env
```

Set the database connection and a strong JWT secret in `backend/.env`:

```dotenv
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/growfi?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=5000
```

Apply the Prisma migrations and seed the default expense categories:

```bash
npx prisma migrate dev
npm run db:seed
```

Start the API in development mode:

```bash
npm run dev
```

The API is available at `http://localhost:5000`. Verify it is running with:

```bash
curl http://localhost:5000/api/health
```

For production, set `DATABASE_URL` and a strong, unique `JWT_SECRET` in the
hosting provider's environment settings, then use `npm start`. The start
command applies all committed Prisma migrations before starting the API, so
authentication is available after a fresh deployment.

### 3. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The Vite development server will print the local URL, typically
`http://localhost:5173`. The frontend defaults to `http://localhost:5000` for
the API. To use another API host, create `frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:5000
```

## Available commands

### Backend

Run these commands from `backend/`:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API with Nodemon |
| `npm start` | Start the API with Node |
| `npm test` | Run the Jest and Supertest test suite |
| `npm run db:seed` | Seed default expense categories |
| `npx prisma migrate dev` | Apply/create development migrations |
| `npx prisma studio` | Open Prisma Studio |

### Frontend

Run these commands from `frontend/`:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## API overview

The backend exposes JSON endpoints under `/api`:

| Area | Base path |
| --- | --- |
| Authentication | `/api/auth` |
| Income | `/api/income` |
| Expenses | `/api/expenses` |
| Expense categories | `/api/expense-categories` |
| Habits | `/api/habits` |
| Savings goals | `/api/goals` |
| Assets | `/api/assets` |
| Net worth | `/api/networth` |
| Dashboard | `/api/dashboard` |
| Administration | `/api/admin` |
| Health check | `/api/health` |

Protected endpoints use a JWT in the `Authorization` header. Successful
responses use a `{ "data": ... }` envelope, while errors use an `error` object
with a code, message, and optional details. See
[`api-spec.md`](./api-spec.md) for resource shapes, validation rules, status
codes, and endpoint details.

## Data and security notes

- Passwords are stored as bcrypt hashes and are never returned by the API.
- JWTs expire after 24 hours in the current API contract.
- User-owned records are isolated by the authenticated user identity.
- Admin endpoints require the `admin` role.
- Decimal financial values are serialized as strings to preserve precision.
- Dates and timestamps are stored in UTC; the frontend formats them for display.
- Keep `.env` files and production secrets out of version control.

## Testing

Run the backend tests with:

```bash
cd backend
npm test
```

The test suite covers authentication, finance records, habits, goals,
dashboard behavior, assets, administration, and habit streak calculations.

Before opening a pull request, validate both applications:

```bash
cd backend && npm test
cd ../frontend && npm run lint && npm run build
```

## Documentation

- [`api-spec.md`](./api-spec.md) — API contract between the frontend and backend
- [`DOCS/PRD.pdf`](./DOCS/PRD.pdf) — product requirements
- [`DOCS/growfi_erd.mermaid`](./DOCS/growfi_erd.mermaid) — entity relationship diagram

## License

This project does not currently declare a license. Add an explicit license
before distributing or reusing the project publicly.
