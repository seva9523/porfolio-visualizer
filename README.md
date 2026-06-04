# WealthView

Lightweight Stellar treasury aggregation infrastructure.

WealthView aggregates multiple Stellar wallets into a unified treasury operations layer with shareable treasury states, exportable portfolio data, Treasury Signals, and developer-friendly APIs.

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
- Optional user-provided SEP-41 / Soroban contract ID validation
- Unified treasury portfolio view
- Treasury Signals for concentration, pricing, stable exposure, and idle treasury checks
- Shareable treasury URLs
- Downloadable treasury snapshots
- Exportable treasury JSON
- Public aggregation API
- Public Treasury Signals API
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
- Contract IDs are validated and preserved in share URLs, snapshots, APIs, OpenAPI, agent manifests, and MCP tools.
- Live SEP-41 RPC balance querying is intentionally not faked. Current deployments return structured SEP-41 metadata explaining that Soroban RPC querying is not enabled yet.
- Contract tokens should display `Price unavailable` unless an explicit contract-to-CoinGecko mapping is added later.

This keeps the current aggregation engine reliable while preparing WealthView for safe read-only Soroban RPC support in a future implementation.

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
- Optionally add `contracts=C...,C...` to validate user-provided SEP-41 / Soroban contract IDs.
- Call `GET /api/signals?wallets=...` to retrieve Treasury Signals for one or more Stellar wallets.
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

---

## MCP Support

WealthView exposes MCP-compatible treasury tools:

- `aggregate_stellar_treasury`
- `get_treasury_signals`

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
