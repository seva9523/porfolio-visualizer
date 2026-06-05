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
- Optional user-provided SEP-41 / Soroban token balance querying via read-only RPC
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
