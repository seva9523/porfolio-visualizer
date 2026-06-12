# WealthView Deploy-Now Bundle

This branch is intended to be merged as a single complete deployment PR. It includes the static site, optional serverless APIs, SEP-41 support, MCP tooling, OpenAPI/agent manifests, and GitHub Pages deployment configuration.

## Target repository

Use this bundle for the new repository:

```text
https://github.com/seva9523/wealthview
```

If you are moving this bundle into that newly created repository, push this branch there and open the PR against the repository default branch. Keep all files in this bundle; do not copy only `index.html`, because the Pages workflow, `CNAME`, public manifests, and API/runtime files are part of the deployable project.

## Files that must exist after merge

### Static website

- `index.html` — main WealthView app and static fallback dashboard
- `demo.html` — legacy/demo static page retained for compatibility
- `favicon.ico` — browser icon
- `CNAME` — GitHub Pages custom domain (`wealthview.pro`)
- `.gitignore` — excludes generated/local files

### GitHub Pages deployment

- `.github/workflows/deploy-pages.yml` — builds `dist/` and deploys GitHub Pages

The workflow copies these files into the deployed artifact:

- `index.html`
- `404.html` generated from `index.html`
- `demo.html`
- `favicon.ico`
- `README.md`
- `mcp.json`
- `CNAME`
- `public/agent.json` as `/agent.json`
- `public/openapi.json` as `/openapi.json`
- `.nojekyll`

### Optional API/runtime files

These files are required for Vercel-compatible API deployments. GitHub Pages will not execute them, but they should remain in the repo for serverless deployments and agent tooling.

- `api/aggregate.js`
- `api/signals.js`
- `api/intelligence.js`
- `api/history.js`
- `api/snapshot.js`
- `api/_treasurySignals.js`
- `lib/sep41.js`
- `lib/history.js`
- `lib/intelligence.js`
- `mcp-server.js`
- `mcp.json`
- `public/agent.json`
- `public/openapi.json`
- `package.json`
- `vercel.json`

## Correct merge/deploy steps

1. Do **not** manually delete files from the PR branch.
2. Merge this PR into the repository default branch (`main` or `master`).
3. In GitHub, open **Settings → Pages**.
4. Set **Build and deployment → Source** to **GitHub Actions**.
5. Set **Custom domain** to `wealthview.pro` if you want the apex domain.
6. Open **Actions → Deploy static site to GitHub Pages**.
7. Confirm the latest run after the merge is green.
8. Wait a few minutes for GitHub Pages and DNS cache propagation.
9. Visit `https://wealthview.pro/`.

## Important GitHub Pages limitation

GitHub Pages only serves static files. It cannot run `/api/*` serverless functions. WealthView therefore includes browser-side Horizon fallback aggregation for the static site. For full API routes, SEP-41 contract simulation, MCP server execution, durable history, and KV-backed snapshots, deploy the same repo to Vercel or another Node serverless host.

## If you still see 404

Check these in order:

1. The latest GitHub Actions Pages deployment completed successfully.
2. GitHub Pages source is set to **GitHub Actions**, not **Deploy from a branch**.
3. The custom domain in GitHub Pages exactly matches `CNAME`.
4. DNS for `wealthview.pro` points to GitHub Pages.
5. You are visiting the same domain configured in `CNAME` (`wealthview.pro`, not an unconfigured subdomain).
