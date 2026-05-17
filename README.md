# WealthView

Lightweight Stellar treasury aggregation infrastructure.

WealthView aggregates multiple Stellar wallets into a unified treasury operations layer with shareable treasury states, exportable portfolio data, and developer-friendly APIs.

---

## Overview

WealthView is a lightweight infrastructure tool for monitoring and aggregating Stellar treasury wallets in a single operational view.

Instead of acting as a personal portfolio tracker, WealthView focuses on:
- treasury visibility
- multi-wallet aggregation
- operational monitoring
- reusable portfolio data
- developer infrastructure

---

## Features

- Multi-wallet Stellar aggregation
- Unified treasury portfolio view
- Shareable treasury URLs
- Exportable treasury JSON
- Public aggregation API
- Asset normalization
- XLM pricing integration
- Terminal-style operational interface

---

## Example API

### Request

```bash
GET /api/aggregate?wallets=GABC,GDEF
````

### Example Response

```json
{
  "walletCount": 2,
  "totalXLM": 12400,
  "totalUSD": 5300,
  "assets": [
    {
      "symbol": "XLM",
      "amount": 10000,
      "usdValue": 4200,
      "allocationPercent": 79
    }
  ]
}
```

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

---

## Stack

* Vanilla HTML/CSS/JavaScript
* Stellar Horizon API
* CoinGecko pricing API
* Vercel deployment
* Single-file lightweight architecture

---

## Design Philosophy

WealthView is intentionally:

* lightweight
* fast
* operational
* infrastructure-oriented
* dependency-minimal

The goal is to provide reusable Stellar treasury aggregation primitives rather than a feature-heavy dashboard platform.

---

## Vision

WealthView aims to become a reusable treasury aggregation and portfolio infrastructure layer for the Stellar ecosystem.

Future directions include:

* stable public APIs
* treasury export tooling
* developer integrations
* ecosystem monitoring workflows
* standardized Stellar treasury data schemas

---

## Status

Early-stage infrastructure prototype focused on:

* treasury aggregation
* operational UX
* developer usability
* ecosystem tooling
