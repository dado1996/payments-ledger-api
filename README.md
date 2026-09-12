# Payments Ledger API

A Fastify-based ledger service for creating accounts, moving funds between them, and reconciling the system balance across multiple currencies.

![CI](https://github.com/you/payments-ledger-api/actions/workflows/ci.yml/badge.svg)

## Overview

This project implements a simple double-entry accounting ledger with:

- account creation
- transfer execution between accounts
- retrieval of account details and entry history
- system-wide reconciliation by currency
- idempotent transfer creation via the `Idempotency-Key` header
- strict validation for supported currencies and account balances

The API is built with TypeScript, Fastify, Drizzle ORM, PostgreSQL, and Zod validation.

## Architecture

The project follows a small clean-architecture split:

- `src/api` — HTTP routes and Fastify app setup
- `src/application` — use cases and repository interfaces
- `src/domain` — money, account, and transaction domain logic
- `src/infra` — database client, schema, and persistence implementation
- `tests` — API and integration tests

## Features

### Accounts

- create an account with a name and currency
- fetch account data by id
- fetch all entries for an account
- each account has a single currency and balance tracked in minor units

### Transfers

- transfer funds between two accounts in the same currency
- source and destination account amounts must match the transfer amount
- transfer creation is idempotent by `Idempotency-Key`
- transfer records include entry-level accounting data and created timestamps

### Reconciliation

- calculates total balance per supported currency
- exposes `isBalanced` to indicate whether the ledger is in reconciliation balance

## Supported currencies

The service only accepts these currencies:

- `USD`
- `EUR`
- `GBP`
- `COP`

## Prerequisites

- Node.js
- pnpm
- Docker and Docker Compose
- PostgreSQL instance (provided via Docker in this repo)

## Local setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the sample environment file and fill in the values:

   ```bash
   cp .env.example .env
   ```

   Example values:

   ```env
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=payments_ledger
   POSTGRES_PORT=5432
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/payments_ledger
   ```

3. Start PostgreSQL:

   ```bash
   docker compose up -d db
   ```

4. Start the application in development mode:

   ```bash
   pnpm dev
   ```

5. The API will run on the configured host and port from `src/infra/config/index.ts` (default host is `0.0.0.0`, default port is `8000`).

## Scripts

```bash
pnpm build
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
```

## API endpoints

### Health check

#### GET /health

Returns:

```json
{
  "status": "ok"
}
```

### Create account

#### POST /accounts

Request body:

```json
{
  "name": "merchant-account",
  "currency": "USD"
}
```

Response:

```json
{
  "id": "<uuid>",
  "name": "merchant-account",
  "currency": "USD",
  "createdAt": "2026-01-01T12:00:00.000Z"
}
```

Validation rules:

- `name` must be between 5 and 30 characters
- `currency` must be one of `USD`, `EUR`, `GBP`, `COP`

### Get account

#### GET /accounts/:id

Returns the account details and current balance in minor units.

Example response:

```json
{
  "id": "<uuid>",
  "name": "merchant-account",
  "currency": "USD",
  "balance": "125000",
  "createdAt": "2026-01-01T12:00:00.000Z"
}
```

### Get account entries

#### GET /accounts/:id/entries

Returns:

```json
{
  "entries": [
    { "accountId": "<uuid>", "amount": "1000" },
    { "accountId": "<uuid>", "amount": "-1000" }
  ]
}
```

### Create transfer

#### POST /transfers

Headers:

```http
Idempotency-Key: key-12345
```

Request body:

```json
{
  "sourceAccountId": "<uuid>",
  "destinationAccountId": "<uuid>",
  "currency": "USD",
  "amount": "1000"
}
```

Behavior:

- `amount` is a positive integer string in minor units
- both accounts must exist
- both accounts must use the same `currency`
- a transfer creates two ledger entries: one negative and one positive
- the same `Idempotency-Key` returns the original transfer instead of creating a duplicate

Example response:

```json
{
  "id": "<uuid>",
  "idempotencyKey": "key-12345",
  "currency": "USD",
  "createdAt": "2026-01-01T12:00:00.000Z",
  "entries": [
    { "accountId": "<source-account-id>", "amount": "-1000" },
    { "accountId": "<destination-account-id>", "amount": "1000" }
  ]
}
```

### Get transfer

#### GET /transfers/:id

Returns the full transfer payload for a given ID.

### Reconciliation

#### GET /reconciliation

Returns totals by currency and whether the ledger is balanced.

Example response:

```json
{
  "balances": [
    { "currency": "USD", "balance": "0" },
    { "currency": "EUR", "balance": "0" },
    { "currency": "GBP", "balance": "0" },
    { "currency": "COP", "balance": "0" }
  ],
  "isBalanced": true
}
```

## Error handling

The API uses domain errors mapped to HTTP status codes:

- `ACCOUNT_NOT_FOUND` → `404`
- `CURRENCY_MISMATCH` → `422`
- `DUPLICATE_TRANSFER` → `409`
- validation failures → `400`
- unexpected server errors → `500`

Common validation errors include:

- invalid currency in request body
- account name shorter than 5 characters
- `amount` value is zero or not a positive integer string
- invalid UUID format
- invalid or missing `Idempotency-Key`

## Domain constraints and accounting rules

The implementation enforces a double-entry ledger model:

- every transfer is composed of two entries
- one entry debits the source account and one credits the destination account
- entry amounts cannot be zero
- transfer currency must match both accounts
- the system reconciliation checks whether all per-currency balances are zero

## Testing

The project includes unit and integration tests.

Run the non-integration specs:

```bash
pnpm test
```

Run integration tests:

```bash
pnpm test:integration
```

## Project structure

```text
.
├── docker-compose.yaml
├── drizzle.config.ts
├── migrations/
├── src/
│   ├── api/
│   ├── application/
│   ├── domain/
│   ├── infra/
│   └── index.ts
├── tests/
├── .env.example
├── package.json
├── tsconfig.json
├── vitest.integration.config.ts
└── README.md
```

## Notes

This project is intentionally strict about accounting correctness: if the source and destination accounts do not share the same currency, if the transfer amount is invalid, or if the ledger is not balanced, the API rejects the request with a domain-specific error instead of silently accepting inconsistent data.

## Copyright

Diego Delgado - diego.960705@gmail.com
