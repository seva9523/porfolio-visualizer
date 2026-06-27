# WealthView Current Product Pitch Deck

**Read-only Stellar treasury visibility**

A live MVP for aggregating Stellar wallets into shareable treasury views, snapshots, JSON exports, and developer/agent APIs.

**Status:** Live MVP  
**Model:** No wallet connection, no custody, API-first  
**Product:** https://wealthview.pro  
**X:** @wealthviewpro

---

## 1. The quick one-liner

WealthView turns one or more Stellar public wallets into a shareable, read-only treasury view with exports and agent-ready API endpoints.

**What is live today**

- Wallet input
- Aggregation
- Share links
- Snapshots/history
- JSON export
- Documented APIs
- Treasury Signals / Intelligence sections

**What is early**

The intelligence layer is rule-based and emerging. It sits on top of the aggregation workflow.

**What is not claimed**

No claimed revenue, users, pilots, institutional partnerships, guaranteed yield, trading, or custody.

---

## 2. Problem: Stellar treasuries are readable, but not operationally organized

The gap is not access to blockchain data. The gap is turning address-level data into a usable treasury view.

- Teams often separate reserve, operations, ecosystem, and program wallets.
- Explorers are good for individual addresses, not treasury-level reporting.
- Spreadsheets and scripts are flexible but manual, fragile, and not agent-readable.
- As Stellar assets, stablecoins, and Soroban tokens grow, visibility needs become more structured.

**The practical pain**

> What do we hold, across all our Stellar wallets, and can I share/export/API it without connecting a wallet?

---

## 3. Current product: a read-only treasury aggregation layer

WealthView focuses on visibility first, not transactions.

| Step | Function |
|---|---|
| Input | Paste one or more Stellar public wallets |
| Aggregate | Combine balances into one treasury view |
| Explain | Signals and early rule-based intelligence |
| Share / Export | URL state, snapshot, JSON, APIs |

**Read-only by design**

- No wallet connect
- No signing
- No custody
- No trading

**Stellar-native inputs**

- Public Stellar wallet addresses
- Optional Soroban / SEP-41 contract IDs

**Developer surface**

- `/api/aggregate`
- `/api/signals`
- `/api/intelligence`
- OpenAPI / agent / MCP manifests

---

## 4. Demo flow

No login. No private keys. No setup.

1. Paste wallets - comma-separated Stellar public addresses.
2. Analyze treasury - fetch balances and aggregate by asset.
3. Review output - wallet count, total XLM, USD where priced, asset table, warnings.
4. Generate state - create share link, download snapshot, or export JSON.
5. Use APIs - developers and agents can request treasury data programmatically.

**Demo principle:** do not show fake treasury data. Use a real public Stellar address or keep the demo to the empty-state and API structure if needed.

---

## 5. Built today: the useful small wedge

- **Multi-wallet aggregation:** aggregates reserve, operations, and ecosystem wallets into one view.
- **Shareable treasury state:** wallet inputs are encoded into URLs so views can reopen without accounts.
- **Snapshots + history:** snapshot-based history starts when a user saves a snapshot; it does not reconstruct old ledgers.
- **Export JSON:** raw developer data export.
- **Treasury Signals:** rule-style signal area that activates after wallet aggregation.
- **Treasury Intelligence:** early intelligence section/API layered on top of aggregation; currently rule-based.
- **Agent/developer files:** OpenAPI, agent manifest, MCP manifest and API endpoint documentation are shown on the site.

---

## 6. Who it is built for

The target user is narrow: Stellar-native teams that need treasury visibility.

**Treasury reporting**  
Teams that manage reserve, operations, grant, or ecosystem wallets.

**Stablecoin treasuries**  
Teams monitoring exposure across assets such as USDC, EURC, USDZ, and other reserves.

**RWA treasuries**  
Projects tracking tokenized asset allocations across Stellar wallets.

**AI agents**  
Tools that need structured treasury data through REST/OpenAPI/manifest-style interfaces.

**Positioning guardrail**  
WealthView is not trying to replace wallets or explorers. It packages treasury visibility into a format humans and software can reuse.

---

## 7. Engineering sprint: why these features first

The product started with data portability and read-only trust before advanced automation.

**Built first**

- Wallet input
- Aggregated balances
- Share links
- Snapshots
- Export JSON
- API documentation
- Signal / intelligence sections

**Why this order**

- Avoid private-key risk
- Prove the reporting workflow
- Make the data portable
- Support developers early
- Keep the MVP small enough to ship

**What I learned**

- The first pain is visibility
- Users need USD and XLM context
- API/agent access is a real differentiator
- Next value comes from better signals and reliability

---

## 8. Traction and validation: status

| Area | Current status |
|---|---|
| Live product | Public MVP at wealthview.pro |
| Feedback | Market validation stage |
| Revenue | Pre-revenue |
| Users | No user numbers claimed |

**What is validated so far**

A concrete need exists around viewing Stellar wallet balances in USD/XLM and exposing the same data via APIs and agents.

**What still needs proof**

- Repeat usage
- Real team workflows
- Asset coverage
- Pricing reliability
- Whether treasury users will pay

---

## 9. Competitive landscape

WealthView wins only if it owns the Stellar treasury workflow, not generic portfolio tracking.

| Category | Strength | Gap WealthView focuses on |
|---|---|---|
| Explorers | Great for checking an address | Not designed as a shareable multi-wallet treasury report |
| Wallets | Best for holding and transacting | WealthView is read-only reporting, not custody or signing |
| Spreadsheets/scripts | Flexible and familiar | Manual, fragile, not standardized for APIs or agents |
| Enterprise treasury tools | Deeper controls and compliance | Often too broad/heavy for Stellar-native builders |

**Differentiated wedge**

A shareable, exportable, API-friendly treasury view built specifically around Stellar wallet aggregation.

---

## 10. Business model: future, not claimed as live

The MVP should stay free while usage patterns are proven.

**Current**

Free, no-login, read-only MVP. Goal: remove friction and get real Stellar builders to test wallet aggregation.

**Likely paid wedges**

- Team reporting workspaces
- Higher API limits
- Private deployment/support
- Custom asset/pricing integrations

**What must happen first**

Prove repeat usage, trusted pricing coverage, real reporting workflows, and at least a few pilot users.

---

## 11. Why now?

Stellar asset infrastructure is maturing while agents increasingly need structured APIs.

**Stellar has a clearer asset story**  
Stablecoins, tokenized assets, and Stellar-native issuance create more treasury reporting needs.

**Soroban expands the data surface**  
Optional SEP-41/Soroban token inputs point toward broader treasury coverage over time.

**Agent workflows need structured context**  
OpenAPI, agent manifests, and MCP-style surfaces make treasury data usable by software, not just humans.

**Why WealthView now**  
The wedge is small but timely: package public Stellar treasury data into repeatable, shareable, agent-readable views.

---

## 12. Roadmap: make the narrow product excellent

The next milestones should harden the MVP before adding heavy workflow features.

**0-2 months: Reliability**

- Harden `/api/aggregate`
- Improve wallet validation
- Improve error states
- Improve pricing warnings
- Improve mobile layout
- Maintain a strict no-fake-demo-data policy

**2-4 months: Better intelligence**

- Improve rule-based signals
- Improve pricing coverage
- Improve snapshot comparison
- Improve executive snapshot wording

**4-6 months: Pilots + integrations**

- Recruit 3-5 Stellar builders/treasury teams
- Refine APIs around real reporting use cases
- Improve Stellar-specific integration coverage

**North star**

Become the simplest way for Stellar teams and agents to understand read-only treasury state across wallets.

---

## 13. Risks, ask, and next steps

The strongest pitch acknowledges what is still unproven.

**Risks to solve**

- Data/pricing reliability
- Clear user segment
- Repeat usage beyond curiosity
- Avoid becoming just a dashboard

**Immediate ask**

- Hackathon/grant support
- Technical feedback on APIs
- Pilot users with real wallet sets
- Asset/pricing coverage feedback

**Next steps**

- Demo with real public wallets
- Collect 3 feedback calls
- Publish API examples
- Ship reliability and snapshot improvements

---

## Contact

**WealthView**  
Read-only Stellar treasury visibility  
https://wealthview.pro  
@wealthviewpro
