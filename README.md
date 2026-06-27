# WealthView

Stellar treasury aggregation and intelligence infrastructure.

WealthView aggregates multiple Stellar wallets into a unified treasury operations layer with shareable treasury states, exportable portfolio data, Treasury Signals, Treasury Intelligence, snapshot-based history, and developer-friendly APIs.

---

## Overview

WealthView is an infrastructure tool for monitoring, aggregating, and analyzing Stellar treasury wallets in a single operational view.

Instead of acting as a personal portfolio tracker, WealthView focuses on:

- treasury visibility
- multi-wallet aggregation
- operational monitoring
- reusable portfolio data
- developer infrastructure
- agent-ready treasury intelligence
- MCP-compatible treasury tooling

---

## Features

- Multi-wallet Stellar aggregation
- Optional user-provided SEP-41 / Soroban token balance querying via read-only RPC
- Unified treasury portfolio view
- Treasury Signals for concentration, pricing, stable exposure, and idle treasury checks
- Treasury Intelligence panel with health score, idle capital, alerts, benchmarks, and executive brief
- Shareable treasury URLs
- Downloadable Treasury Intelligence Snapshot
- Exportable treasury JSON
- Snapshot-based Treasury History API
- Public Aggregation API
- Public Treasury Signals API
- Public Treasury Intelligence API
- OpenAPI specification
- Agent manifest
- MCP-compatible treasury tools
- MCP server support for aggregation, signals, history, and intelligence
- Asset normalization
- XLM and supported token pricing integration
- Stellar-native operational interface

---
## Technical Architecture

WealthView is built as a read-only Stellar treasury aggregation and intelligence layer. The system is designed to help users, developers, and AI agents understand Stellar treasury positions without connecting wallets, signing transactions, or taking custody of assets.

### Architecture Overview

WealthView has four main layers:

1. **Frontend Application**
2. **Treasury Aggregation Layer**
3. **Treasury Intelligence Layer**
4. **Developer and Agent Infrastructure**

---

### 1. Frontend Application

The frontend provides the main user interface for treasury visibility.

Users can:

* Enter one or more Stellar public wallet addresses
* Optionally provide SEP-41 / Soroban token contract IDs
* View aggregated wallet balances
* Review asset exposure and pricing coverage
* Generate Treasury Signals
* View Treasury Intelligence
* Create shareable treasury URLs
* Download Treasury Intelligence Snapshots
* Export structured JSON data
* Access public API and agent endpoint information

The frontend is input-based. Treasury data is only displayed after the user provides wallet addresses and runs an analysis.

---

### 2. Treasury Aggregation Layer

The aggregation layer receives wallet input, validates addresses, queries Stellar wallet data, normalizes assets, and aggregates balances across one or more wallets.

The main aggregation endpoint is:

```txt
/api/aggregate
```

The aggregation flow is:

```txt
User wallet input
→ Wallet validation
→ Stellar account and balance retrieval
→ Asset normalization
→ Pricing lookup where supported
→ Multi-wallet aggregation
→ Treasury response returned to frontend/API consumer
```

The aggregation response includes:

* wallet count
* total XLM
* estimated USD value where pricing is available
* priced assets
* unpriced assets
* asset breakdown
* wallet-level data
* warnings
* errors

The aggregation layer is designed to fail safely. If one wallet or optional token query fails, WealthView should return warnings or partial results instead of breaking the full treasury view.

---

### 3. Asset and Pricing Logic

WealthView supports:

* native XLM
* Stellar classic trustline assets
* issuer-based Stellar assets
* optional SEP-41 / Soroban token balance checks through read-only RPC where available

Assets are normalized into a consistent structure including:

* asset code or symbol
* issuer or contract ID where available
* balance amount
* asset type
* price availability
* USD value where pricing is supported
* pricing source or pricing warning

Unknown assets are treated as unpriced unless WealthView has a supported pricing method for them. The system should not silently assign fake values to unsupported assets.

---

### 4. Treasury Intelligence Layer

The Treasury Intelligence layer generates rule-based analysis from the aggregation result.

Current and planned intelligence outputs include:

* Treasury Signals
* Treasury Health Score
* concentration checks
* stablecoin exposure checks
* idle treasury checks
* pricing coverage checks
* unpriced asset warnings
* basic benchmarks
* executive treasury brief
* snapshot-based history

The main intelligence endpoint is:

```txt
/api/intelligence
```

Treasury Signals are also exposed through:

```txt
/api/signals
```

These intelligence outputs are based on visible wallet data and pricing availability. They are informational only and do not provide financial advice.

---

### 5. Snapshot and History Layer

WealthView supports snapshot-based treasury history.

Snapshots allow users to preserve a treasury state at a point in time and compare or reference it later.

Snapshot-related functionality includes:

* downloadable Treasury Intelligence Snapshot
* exportable JSON
* snapshot-based history API
* shareable treasury states
* structured treasury data for external workflows

Relevant endpoints include:

```txt
/api/snapshot
/api/history
```

The snapshot model is designed to support treasury reporting without requiring wallet connection, custody, or transaction permissions.

---

### 6. Developer and Agent Infrastructure

WealthView exposes public, structured endpoints so developers and AI agents can access Stellar treasury data programmatically.

Developer and agent files include:

```txt
/openapi.json
/agent.json
/mcp.json
```

WealthView also includes MCP-compatible treasury tooling and MCP server support for aggregation, signals, history, and intelligence.

The goal is to make WealthView usable not only as a web interface, but also as infrastructure that other applications, workflows, and AI agents can build on top of.

---

### 7. Security and Custody Model

WealthView is intentionally read-only.

WealthView does not:

* request private keys
* connect wallets
* sign transactions
* submit transactions
* custody assets
* execute trades
* move funds
* manage user permissions

Users only provide public Stellar wallet addresses. This makes the product safer to test and easier to adopt because WealthView does not require control over user assets.

---

### 8. Current Technical Limitations

WealthView is currently an MVP and is still being improved.

Known limitations include:

* limited pricing coverage for unsupported assets
* early-stage SEP-41 / Soroban support
* rule-based intelligence rather than advanced predictive analytics
* no custody or transaction workflow
* no enterprise user management
* no full accounting or compliance reporting workflow yet

These limitations are intentional at the current stage because WealthView is focused first on safe, read-only Stellar treasury visibility and developer-accessible treasury data.

---

### 9. Technical Roadmap

Planned improvements include:

* stronger multi-wallet aggregation reliability
* improved SEP-41 / Soroban token support
* broader pricing coverage
* clearer treasury health and risk scoring
* better snapshot comparison
* improved treasury history
* stronger API documentation
* more robust MCP tooling
* pilot feedback from Stellar builders, startups, DAOs, and treasury teams

The long-term technical goal is to turn WealthView into a reliable read-only treasury intelligence layer for the Stellar ecosystem.

## Public APIs

### Aggregation API

Use the aggregation API to combine balances across one or more Stellar wallets.

#### Request

```bash
GET /api/aggregate?wallets=GBGI5DB6EYA7W6BKVM7I6L5F3EIVUP4LSQC6AOE6DU7VWXAURFVLHO52,GDUY7J7A33TQWOSOQGDO776GGLM3UQERL4J3SPT56F6YS4ID7MLDERI4
