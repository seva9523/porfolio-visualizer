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

---

## Stellar-Specific Integration Plan

WealthView is a Stellar-specific treasury aggregation and intelligence tool. It is designed to help Stellar builders, startups, DAOs, and treasury teams understand public treasury positions without connecting wallets, signing transactions, or taking custody of assets.

This section explains WealthView's current Stellar integration and planned SCF Integration Track building-block integrations.

### SCF Integration Track Building Blocks

For the SCF Integration Track, WealthView plans to integrate with the following Stellar ecosystem building blocks from the official integration list:

1. **Aquarius**
   - Purpose: read-only token, liquidity, and market context for Stellar-native assets.
   - WealthView use case: improve treasury pricing coverage, liquidity visibility, and asset intelligence for Stellar assets.
   - Scope: read-only data usage only. WealthView will not execute swaps or trades.

2. **Soroswap Routing API**
   - Purpose: read-only routing and liquidity information across Stellar classic and Soroban liquidity.
   - WealthView use case: determine whether treasury assets have visible swap-accessible liquidity and improve pricing/liquidity warnings.
   - Scope: read-only quotes and routing metadata only. WealthView will not submit transactions or perform swaps.

Potential future integrations may include:

3. **Blend v2**
   - Purpose: Stellar DeFi lending market context.
   - WealthView use case: improve idle capital detection by showing whether treasury assets are supported by Stellar DeFi markets.
   - Scope: informational only. WealthView will not deposit, lend, borrow, or execute transactions.

4. **DeFindex**
   - Purpose: Stellar yield infrastructure and vault context.
   - WealthView use case: improve future treasury opportunity discovery for assets that may have supported DeFi strategies.
   - Scope: informational only. WealthView will not allocate funds or execute transactions.

WealthView is intentionally not prioritizing wallet connection building blocks such as Freighter Connect or Stellar Wallets Kit in the current MVP because the product is designed to remain read-only and non-custodial.

---

### Current Stellar Integration

WealthView currently focuses on public Stellar wallet visibility.

The current integration flow is:

```txt
User enters Stellar public wallet address(es)
→ WealthView validates wallet input
→ Backend retrieves Stellar account and balance data
→ Native XLM and Stellar assets are normalized
→ Multi-wallet balances are aggregated
→ Pricing is applied where supported
→ Treasury Signals and Treasury Intelligence are generated
→ User can export JSON, download a snapshot, or create a shareable treasury state
```

Current Stellar-specific functionality includes:

- Stellar public wallet address input
- Multi-wallet Stellar aggregation
- Native XLM balance visibility
- Stellar classic asset / trustline visibility
- Asset normalization across wallets
- Pricing coverage checks
- Unpriced asset handling
- Treasury Signals
- Treasury Intelligence
- Snapshot export
- Shareable treasury URLs
- Developer and agent-ready APIs

WealthView does not require private keys, wallet connection, signatures, or transaction permissions.

---

### Planned Stellar Integration Details

#### 1. Stellar Horizon Integration

WealthView uses Stellar account and balance data as the foundation of the product.

Planned Horizon-related improvements:

- Improve multi-wallet aggregation reliability
- Improve wallet-level error handling
- Improve trustline asset parsing
- Add clearer issuer-level asset metadata
- Add better handling for missing, inactive, or invalid accounts
- Improve response consistency for developer/API users
- Add clearer pricing and unpriced asset warnings

Expected output:

- Cleaner Stellar wallet aggregation
- Better asset breakdowns
- Safer partial results when one wallet fails
- More reliable treasury snapshots
- More useful developer API responses

#### 2. Stellar RPC and SEP-41 / Soroban Token Support

WealthView plans to improve support for SEP-41 / Soroban contract tokens through read-only Stellar RPC calls where technically available.

Planned RPC / SEP-41 improvements:

- Accept optional Soroban contract IDs
- Validate contract ID format
- Query token metadata where supported
- Query token balance data where supported
- Return non-fatal warnings when a contract query fails
- Clearly separate Soroban assets from classic Stellar trustline assets
- Mark unsupported or unreadable contract assets as warnings instead of failing the full treasury analysis

Expected output:

- Better visibility into newer Stellar / Soroban assets
- Safer handling of unsupported contracts
- Clear distinction between classic Stellar assets and contract-based tokens
- Improved developer API usefulness for Stellar builders

#### 3. Aquarius Integration

Aquarius will be used as a read-only Stellar liquidity and token intelligence source.

Planned Aquarius integration:

- Retrieve liquidity context for supported Stellar assets
- Identify whether assets have visible Stellar-native market activity
- Improve pricing confidence labels
- Improve liquidity warnings inside Treasury Signals
- Help classify assets as liquid, partially liquid, or unknown
- Add Aquarius as a visible data source in API responses where used

WealthView will not use Aquarius to execute swaps or trading activity.

Expected output:

- Better treasury asset intelligence
- More accurate liquidity warnings
- Improved pricing coverage transparency
- More useful treasury signals for Stellar teams

#### 4. Soroswap Routing API Integration

Soroswap Routing API will be used for read-only routing and quote intelligence.

Planned Soroswap integration:

- Check whether treasury assets have available routing paths
- Use route/quote metadata to improve liquidity visibility
- Add warnings for assets with weak or unavailable routing
- Improve Treasury Intelligence explanations around asset liquidity
- Add Soroswap as a visible source in API responses where used

WealthView will not submit swaps, sign transactions, or execute trades.

Expected output:

- Better visibility into swap-accessible liquidity
- More useful liquidity and pricing coverage signals
- Improved asset risk explanations
- Stronger Stellar-native treasury intelligence

#### 5. Optional Future Blend v2 / DeFindex Intelligence

Blend v2 and DeFindex may be added later as read-only intelligence sources.

The purpose would be to improve idle capital detection by identifying whether treasury assets are supported by Stellar DeFi markets or vault infrastructure.

This would be informational only.

WealthView will not:

- deposit assets
- lend assets
- borrow assets
- allocate funds
- sign transactions
- execute yield strategies

Expected output:

- Better idle capital context
- Clearer treasury opportunity discovery
- More useful executive treasury summaries
- No custody or transaction risk

---

### Updated Data Flow With Stellar Integrations

```txt
User wallet input
→ Stellar wallet validation
→ Horizon account and balance retrieval
→ Optional Stellar RPC / SEP-41 contract token checks
→ Asset normalization
→ Pricing and liquidity checks
→ Aquarius liquidity/token context
→ Soroswap route/liquidity context
→ Treasury aggregation
→ Treasury Signals
→ Treasury Intelligence
→ Snapshot/export/share/API output
```

---

### API Response Integration Fields

WealthView will expose Stellar integration metadata in API responses so developers can understand how treasury data was generated.

Planned response fields include:

```json
{
  "stellarIntegrations": {
    "horizon": {
      "enabled": true,
      "purpose": "Stellar account and balance aggregation"
    },
    "stellarRpc": {
      "enabled": true,
      "purpose": "Read-only Soroban / SEP-41 token visibility"
    },
    "aquarius": {
      "enabled": true,
      "purpose": "Read-only liquidity and token intelligence"
    },
    "soroswap": {
      "enabled": true,
      "purpose": "Read-only routing and liquidity context"
    }
  }
}
```

Each asset may also include:

```json
{
  "assetCode": "USDC",
  "issuer": "GA...",
  "type": "classic",
  "amount": "1000.00",
  "priceUSD": 1,
  "usdValue": 1000,
  "pricingSource": "supported-stablecoin-assumption",
  "liquiditySource": "aquarius-or-soroswap-if-available",
  "warnings": []
}
```

Unknown or unsupported assets will remain unpriced unless WealthView has a supported pricing or liquidity source for them.

---

### Security and Custody Model

WealthView is read-only by design.

WealthView does not:

- ask users for private keys
- connect wallets
- sign transactions
- submit transactions
- custody assets
- execute swaps
- execute trades
- lend assets
- borrow assets
- move funds

Users only provide public Stellar wallet addresses and optional public contract IDs.

This makes WealthView safer for early users, treasury teams, developers, and AI agents because the product provides visibility without asset control.

---

### Why These Stellar Integrations Matter

These integrations make WealthView more useful to the Stellar ecosystem because they turn raw public wallet balances into operational treasury intelligence.

The integrations help users answer:

- What Stellar wallets make up this treasury?
- What assets does the treasury hold?
- Which assets are priced or unpriced?
- Which assets have visible Stellar liquidity?
- Which assets may be difficult to route or value?
- How concentrated is the treasury?
- What should be reviewed before reporting or making decisions?
- How can developers or AI agents consume this treasury data programmatically?

This supports Stellar builders by reducing the need to build custom wallet aggregation, pricing, liquidity, and reporting infrastructure from scratch.

---

### Milestones

#### Milestone 1: Stellar Aggregation Hardening

- Improve Horizon-based wallet aggregation
- Improve multi-wallet validation
- Improve error and warning handling
- Improve asset normalization
- Improve JSON export structure

#### Milestone 2: SEP-41 / Soroban Read-Only Support

- Add better contract ID validation
- Improve Stellar RPC integration
- Add Soroban token metadata checks where available
- Add non-fatal warnings for unsupported contracts
- Separate classic assets from Soroban assets in API responses

#### Milestone 3: Aquarius Read-Only Integration

- Add Aquarius liquidity/token context
- Improve pricing confidence labels
- Add liquidity warnings to Treasury Signals
- Add Aquarius source metadata to API responses

#### Milestone 4: Soroswap Routing API Read-Only Integration

- Add route/liquidity checks for supported assets
- Improve swap-accessible liquidity visibility
- Add Soroswap source metadata to API responses
- Improve Treasury Intelligence explanations

#### Milestone 5: Developer and Agent Infrastructure

- Improve `/api/aggregate`
- Improve `/api/signals`
- Improve `/api/intelligence`
- Improve `/openapi.json`
- Improve `/agent.json`
- Improve `/mcp.json`
- Improve MCP-compatible treasury tooling

---

### Success Metrics

WealthView will measure integration success through:

- number of supported Stellar wallets tested
- successful multi-wallet aggregation rate
- number of Stellar assets normalized correctly
- pricing coverage improvement
- liquidity coverage improvement
- number of API calls from developers or agents
- number of treasury snapshots generated
- number of shareable treasury states created
- pilot feedback from Stellar builders, DAOs, startups, and treasury teams

---

### Technical Goal

The technical goal is to turn WealthView from a Stellar wallet aggregation MVP into a reliable read-only treasury intelligence layer for the Stellar ecosystem.

The product will stay focused on:

- Stellar-native treasury visibility
- safe read-only infrastructure
- developer-accessible treasury APIs
- agent-ready treasury intelligence
- practical reporting and snapshot workflows

---

## Public APIs

### Aggregation API

Use the aggregation API to combine balances across one or more Stellar wallets.

#### Request

```bash
GET /api/aggregate?wallets=GBGI5DB6EYA7W6BKVM7I6L5F3EIVUP4LSQC6AOE6DU7VWXAURFVLHO52,GDUY7J7A33TQWOSOQGDO776GGLM3UQERL4J3SPT56F6YS4ID7MLDERI4
```