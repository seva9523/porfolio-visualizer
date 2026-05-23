#!/usr/bin/env node

const DEFAULT_BASE_URL = process.env.WEALTHVIEW_BASE_URL || 'http://localhost:3000';

function writeMessage(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function makeError(id, message) {
  return { jsonrpc: '2.0', id, error: { code: -32000, message } };
}

function normalizeWallets(input) {
  if (typeof input !== 'string') return null;
  const wallets = input
    .split(',')
    .map((w) => w.trim())
    .filter(Boolean);
  return wallets.length ? wallets : null;
}

async function callAggregateApi(wallets) {
  const url = new URL('/api/aggregate', DEFAULT_BASE_URL);
  url.searchParams.set('wallets', wallets.join(','));

  const res = await fetch(url.toString());
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Invalid JSON response from WealthView API (${res.status})`);
  }

  if (!res.ok) {
    const message = data?.message || data?.error || `WealthView API request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data;
}

async function handleRequest(req) {
  const { id, method, params } = req;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        name: 'WealthView MCP',
        version: '1.0.0',
        capabilities: { tools: true }
      }
    };
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: [
          {
            name: 'aggregate_stellar_treasury',
            description: 'Aggregate multiple Stellar wallets into a unified treasury view using WealthView.',
            inputSchema: {
              type: 'object',
              properties: {
                wallets: {
                  type: 'string',
                  description: 'Comma-separated Stellar public wallet addresses'
                }
              },
              required: ['wallets']
            }
          }
        ]
      }
    };
  }

  if (method === 'tools/call') {
    const toolName = params?.name;
    if (toolName !== 'aggregate_stellar_treasury') {
      return makeError(id, `Unknown tool: ${toolName}`);
    }

    const walletInput = params?.arguments?.wallets;
    const wallets = normalizeWallets(walletInput);

    if (!wallets) {
      return makeError(id, 'Invalid input: wallets must be a non-empty comma-separated string.');
    }

    try {
      const aggregated = await callAggregateApi(wallets);
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'json',
              json: aggregated
            }
          ]
        }
      };
    } catch (error) {
      return makeError(id, error.message);
    }
  }

  return makeError(id, `Unsupported method: ${method}`);
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', async (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let req;
    try {
      req = JSON.parse(trimmed);
    } catch {
      writeMessage({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
      continue;
    }

    const response = await handleRequest(req);
    writeMessage(response);
  }
});
