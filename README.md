# WealthView

Lightweight Stellar treasury aggregation infrastructure.

WealthView aggregates multiple Stellar wallets into a unified treasury operations layer with shareable treasury states, exportable portfolio data, Treasury Signals, and developer-friendly APIs.

---

## Deploy Now

For a one-shot deployment checklist and complete file manifest for `https://github.com/seva9523/wealthview`, see [`DEPLOY_NOW.md`](DEPLOY_NOW.md).

---

## Overview

WealthView is a lightweight infrastructure tool for monitoring and aggregating Stellar treasury wallets in a single operational view.

Instead of acting as a personal portfolio tracker, WealthView focuses on:

- treasury visibility
- multi-wallet aggregation
- operational monitoring
- reusable portfolio data
- developer infrastructure
- agent-ready treasury intelligence

---

## Features

- Multi-wallet Stellar aggregation
- Optional user-provided SEP-41 / Soroban token balance querying via read-only RPC
- Unified treasury portfolio view
- Treasury Signals for concentration, pricing, stable exposure, and idle treasury checks
- Shareable treasury URLs
- Downloadable treasury snapshots
- Exportable treasury JSON
- Public aggregation API
- Public Treasury Signals API
- Treasury Intelligence API with health score, idle capital, alerts, benchmarks, simulations, and executive briefs
- Snapshot-based Treasury History API
- OpenAPI specification
- Agent manifest
- MCP-compatible treasury tools
- Asset normalization
- XLM and supported token pricing integration
- Stellar-native operational interface

---

## Public APIs

### Aggregation API

Use the aggregation API to combine balances across one or more Stellar wallets.

#### Request

```bash
GET /api/aggregate?wallets=GBGI5DB6EYA7W6BKVM7I6L5F3EIVUP4LSQC6AOE6DU7VWXAURFVLHO52,GDUY7J7A33TQWOSOQGDO776GGLM3UQERL4J3SPT56F6YS4ID7MLDERI4
```

#### cURL

```bash
curl "https://YOUR-DOMAIN/api/aggregate?wallets=GBGI5DB6EYA7W6BKVM7I6L5F3EIVUP4LSQC6AOE6DU7VWXAURFVLHO52,GDUY7J7A33TQWOSOQGDO776GGLM3UQERL4J3SPT56F6YS4ID7MLDERI4"
```

#### Example Response

```json
{
  "success": true,
  "timestamp": "2026-05-23T12:00:00.000Z",
  "version": "1.0.0",
  "walletCount": 2,
  "totalXLM": 1234.56,
  "totalUSD": 145.67,
  "pricedAssets": ["XLM", "USDZ"],
  "unpricedAssets": [],
  "assets": [
    {
      "symbol": "XLM",
      "amount": 1234.56,
      "usdValue": 145.67,
      "allocationPercent": 96.12
    }
  ],
  "errors": []
}
```

---

### Treasury Signals API

Use the Treasury Signals API to retrieve lightweight treasury intelligence for monitoring, reporting workflows, developer tools, and AI agents.

#### Request

```bash
GET /api/signals?wallets=GBGI5DB6EYA7W6BKVM7I6L5F3EIVUP4LSQC6AOE6DU7VWXAURFVLHO52,GDUY7J7A33TQWOSOQGDO776GGLM3UQERL4J3SPT56F6YS4ID7MLDERI4
```

#### cURL

```bash
curl "https://YOUR-DOMAIN/api/signals?wallets=GBGI5DB6EYA7W6BKVM7I6L5F3EIVUP4LSQC6AOE6DU7VWXAURFVLHO52,GDUY7J7A33TQWOSOQGDO776GGLM3UQERL4J3SPT56F6YS4ID7MLDERI4"
```

#### Example Response

```json
{
  "success": true,
  "timestamp": "2026-05-23T12:00:00.000Z",
  "walletCount": 2,
  "signals": {
    "assetConcentration": {
      "severity": "watch",
      "value": 92,
      "message": "High asset concentration: XLM represents 92% of priced treasury value."
    },
    "walletConcentration": {
      "severity": "good",
      "value": null,
      "message": "Wallet distribution looks balanced."
    },
    "unpricedAssets": {
      "severity": "info",
      "value": 0,
      "message": "All detected assets are priced."
    },
    "stableExposure": {
      "severity": "info",
      "value": 12,
      "message": "Stable asset exposure: 12% of priced treasury value."
    },
    "idleTreasury": {
      "severity": "watch",
      "value": true,
      "message": "Potential idle treasury: most value is concentrated in one asset."
    }
  }
}
```


---

### Treasury Intelligence API

Use the Treasury Intelligence API to turn aggregate balances into treasury health, risk, idle-capital, benchmark, change-detection, simulation, and executive-summary outputs.

```bash
GET /api/intelligence?wallets=G...&contracts=C...
```

The endpoint returns:

- `treasuryHealth`: 0-100 score with labels `Excellent`, `Good`, `Watch`, or `High Risk`
- `idleCapital`: conservative estimated idle capital based on visible priced balances
- `alerts`: rule-based concentration, stable exposure, volatility, pricing, wallet coverage, idle capital, value movement, and new-asset alerts
- `benchmarks`: internal WealthView treasury-readiness rules, not live comparisons against external treasuries
- `changeDetection`: comparison against saved snapshot history when available
- `executiveBrief`: board-ready plain-English summary
- `simulationDefaults`: default what-if assumptions for client-side simulations

Important: benchmarking uses WealthView rule-based readiness checks. WealthView does not claim to compare against live Stellar treasury cohorts unless real benchmark data is added later. Simulations are estimates based on visible balances and prices and are not financial advice.

---

## SEP-41 / Soroban Token Support

WealthView now accepts an optional `contracts` query parameter for user-provided SEP-41 / Soroban token contract IDs.

```bash
GET /api/aggregate?wallets=G...&contracts=C...
GET /api/signals?wallets=G...&contracts=C...
```

Important behavior:

- Classic Stellar balances are discovered automatically through the Horizon account balances endpoint.
- Native XLM and classic trustline assets continue to work exactly as before.
- SEP-41 / Soroban tokens are **not automatically discovered**.
- Users must provide comma-separated `C...` contract IDs when they want contract-token coverage.
- WealthView uses read-only Stellar RPC transaction simulation for `symbol()`, `name()`, `decimals()`, and `balance(Address)`.
- No wallet connection, signing, submitted transaction, swap, lending, or execution flow is used.
- Contract IDs are validated and preserved in share URLs, snapshots, APIs, OpenAPI, agent manifests, and MCP tools.
- Contract tokens display `Price unavailable` unless an explicit contract-to-CoinGecko mapping is added later.

The default mainnet RPC endpoint is `https://mainnet.sorobanrpc.com`, and deployments can override it with `STELLAR_RPC_URL`. The server-side SEP-41 module loads `@stellar/stellar-sdk` only when contract IDs are requested; if the SDK is unavailable, classic Horizon aggregation still succeeds and the response includes structured SEP-41 errors instead of crashing the API.


---

## Static Hosting Fallback

The full API experience is intended for a Vercel-compatible deployment. GitHub Pages is static and cannot execute `/api/*` serverless routes. To keep the website usable on static hosting, the frontend now falls back to browser-side Horizon aggregation when `/api/aggregate` is unavailable. In that fallback mode:

- native XLM and classic Horizon trustline balances still display
- known browser-side pricing is attempted through CoinGecko
- snapshot history is saved to the current browser's `localStorage`
- SEP-41 / Soroban contract balances show a structured warning because they require the server API and Stellar SDK

For production SEP-41, MCP, OpenAPI-backed API calls, and durable shared history, deploy the serverless routes on Vercel or another compatible Node.js API host.

### GitHub Pages custom domain

This repository includes a `CNAME` file for `wealthview.pro`. The Pages workflow builds a clean static artifact in `dist/`, copies `public/agent.json` and `public/openapi.json` to the deployed root, adds `.nojekyll`, and creates `404.html` from `index.html` so direct browser requests do not show the default GitHub Pages 404. If you use a different domain, update `CNAME` and the GitHub Pages custom-domain setting together.

---

## Historical Balance Data

WealthView includes MVP snapshot-based historical treasury monitoring. This is intentionally simple and additive:

- History starts only after a snapshot is saved.
- WealthView does **not** reconstruct past ledger balances.
- WealthView does **not** provide full historical blockchain indexing.
- Saved USD values reflect the app's pricing calculation at snapshot time.
- SEP-41 / Soroban assets are included in snapshots when `contracts` are provided.
- Snapshot storage uses Vercel KV / Upstash REST automatically when `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`) are configured. If those variables are absent, WealthView falls back to in-memory storage suitable for local testing and warm serverless invocations. The fallback can reset when a serverless function instance restarts.

### Save a snapshot through aggregation

```bash
GET /api/aggregate?wallets=G...&contracts=C...&saveSnapshot=true
```

### Save a snapshot manually

```bash
POST /api/snapshot
Content-Type: application/json

{
  "wallets": ["G..."],
  "contracts": ["C..."]
}
```

### Fetch history

```bash
GET /api/history?wallets=G...&contracts=C...
```

History is keyed by normalized treasury identity: sorted wallet addresses plus sorted contract IDs. This means `wallets=G2,G1&contracts=C2,C1` maps to the same history as `wallets=G1,G2&contracts=C1,C2`.

### Local testing

1. Run the app locally with your Vercel-compatible API environment.
2. Aggregate a wallet normally to confirm `/api/aggregate` still works.
3. Optionally configure Vercel KV / Upstash REST environment variables for durable shared history. Without them, local/in-memory fallback history is temporary.
4. Click **Save Snapshot** in the UI or call `/api/snapshot`.
5. Click **Refresh History** or call `/api/history?wallets=...`.
6. Repeat snapshots over time to build a simple total-value history table.
---

## Example Use Cases

### Treasury Operations

Aggregate operational and reserve wallets into a single treasury view.

### Grant Transparency

Monitor public grant distribution wallets and ecosystem funds.

### DAO Treasury Monitoring

Track multi-wallet Stellar treasuries through a unified interface.

### Ecosystem Reporting

Standardize Stellar treasury portfolio data for dashboards and analytics tools.

### AI Agent Treasury Workflows

Allow agents to retrieve treasury balances, identify unpriced assets, check concentration risk, and generate treasury risk summaries.

---

## Agent Usage

Agents and external tools can consume treasury data directly:

- Call `GET /api/aggregate?wallets=...` to aggregate one or more Stellar wallets.
- Optionally add `contracts=C...,C...` to query user-provided SEP-41 / Soroban contract token balances with read-only RPC simulation.
- Call `GET /api/signals?wallets=...` to retrieve Treasury Signals for one or more Stellar wallets.
- Call `GET /api/history?wallets=...` to retrieve saved snapshot-based treasury history.
- Call `GET /api/intelligence?wallets=...` to retrieve Treasury Health, idle capital, alerts, benchmarks, simulations, changes, and an executive brief.
- Call `POST /api/snapshot` to save a timestamped treasury snapshot.
- OpenAPI specification is available at `/openapi.json`.
- Agent manifest is available at `/agent.json`.
- MCP manifest is available at `/mcp.json`.

Example agent tasks:

- Check total Stellar treasury value
- Summarize asset allocation across wallets
- Identify unpriced treasury assets
- Assess treasury concentration risk
- Check stablecoin exposure
- Generate a treasury risk summary
- Generate an executive treasury brief
- Review rule-based treasury alerts
- Detect potentially idle treasury capital
- Generate a Treasury Health Score

---

## MCP Support

WealthView exposes MCP-compatible treasury tools:

- `aggregate_stellar_treasury`
- `get_treasury_signals`
- `get_treasury_history`
- `get_treasury_intelligence`

### Aggregate Treasury Example

```js
aggregate_stellar_treasury({
  wallets: "G...,G...",
  contracts: "C...,C..."
})
```

### Treasury Signals Example

```js
get_treasury_signals({
  wallets: "G...,G...",
  contracts: "C...,C..."
})
```

### Treasury History Example

```js
get_treasury_history({
  wallets: "G...,G...",
  contracts: "C...,C..."
})
```

### Treasury Intelligence Example

```js
get_treasury_intelligence({
  wallets: "G...,G...",
  contracts: "C...,C..."
})
```

---

## Stack

- Vanilla HTML/CSS/JavaScript
- Vercel serverless API routes
- Stellar Horizon API
- CoinGecko pricing API
- OpenAPI
- MCP-compatible JSON-RPC adapter
- GitHub Pages deployment workflow
- Single-file lightweight frontend architecture

---

## Design Philosophy

WealthView is intentionally:

- lightweight
- fast
- operational
- infrastructure-oriented
- dependency-minimal
- agent-ready

The goal is to provide reusable Stellar treasury aggregation primitives rather than a feature-heavy dashboard platform.

---

## Vision

WealthView aims to become a reusable treasury aggregation and portfolio infrastructure layer for the Stellar ecosystem.

Future directions include:

- stable public APIs
- treasury export tooling
- developer integrations
- agent-native treasury workflows
- ecosystem monitoring workflows
- standardized Stellar treasury data schemas
- optional Soroban / SEP-41 token support

---

## Status

Early-stage infrastructure prototype focused on:

- treasury aggregation
- operational UX
- developer usability
- ecosystem tooling
- agent and MCP integrations
