# WealthView

Stellar treasury aggregation infrastructure.

WealthView aggregates multiple Stellar wallets into a unified treasury view with portfolio exports and developer-friendly APIs.

## Features

- Multi-wallet Stellar aggregation
- Treasury portfolio visualization
- Shareable treasury states
- Exportable JSON
- Lightweight infrastructure tooling

## API

Example:

GET /api/aggregate?wallets=GABC,GDEF

Example response:

{
  "walletCount": 2,
  "totalUSD": 5300
}

## Use Cases

- DAO treasury monitoring
- Startup treasury operations
- Grant fund transparency
- Ecosystem reporting

## Stack

- Vanilla HTML/CSS/JS
- Stellar Horizon API
- CoinGecko pricing
- Vercel deployment
