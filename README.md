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

## Public APIs

### Aggregation API

Use the aggregation API to combine balances across one or more Stellar wallets.

#### Request

```bash
GET /api/aggregate?wallets=GBGI5DB6EYA7W6BKVM7I6L5F3EIVUP4LSQC6AOE6DU7VWXAURFVLHO52,GDUY7J7A33TQWOSOQGDO776GGLM3UQERL4J3SPT56F6YS4ID7MLDERI4
