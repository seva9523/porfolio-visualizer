#!/usr/bin/env node

const DEFAULT_BASE_URL = process.env.WEALTHVIEW_BASE_URL || 'http://localhost:3000';

function writeMessage(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function makeError(id, message) {
  return { jsonrpc: '2.0', id, error: { code: -32000, message } };
}

function normalizeCsv(input) {
  if (input === undefined || input === null || input === '') return [];
  if (typeof input !== 'string') return null;
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeWallets(input) {
  const wallets = normalizeCsv(input);
  return wallets && wallets.length ? wallets : null;
}

function normalizeContracts(input) {
  const contracts = normalizeCsv(input);
  return contracts || null;
}

async function callWealthViewApi(path, wallets, contracts = []) {
  const url = new URL(path, DEFAULT_BASE_URL);
  url.searchParams.set('wallets', wallets.join(','));
  if (contracts.length) url.searchParams.set('contracts', contracts.join(','));

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

const TOOL_NAMES = [
  'aggregate_stellar_treasury',
  'get_treasury_signals',
  'get_treasury_intelligence',
  'get_treasury_history'
];

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
                },
                contracts: {
                  type: 'string',
                  description: 'Optional comma-separated SEP-41 / Soroban token contract IDs'
                }
              },
              required: ['wallets']
            }
          },
          {
            name: 'get_treasury_signals',
            description: 'Retrieve WealthView Treasury Signals for one or more Stellar wallets.',
            inputSchema: {
              type: 'object',
              properties: {
                wallets: {
                  type: 'string',
                  description: 'Comma-separated Stellar public wallet addresses'
                },
                contracts: {
                  type: 'string',
                  description: 'Optional comma-separated SEP-41 / Soroban token contract IDs'
                }
              },
              required: ['wallets']
            }
          },
          {
            name: 'get_treasury_intelligence',
            description: 'Generate WealthView treasury intelligence including health score, idle capital detection, rule-based alerts, benchmarks, change detection, executive brief, and next-action suggestions.',
            inputSchema: {
              type: 'object',
              properties: {
                wallets: {
                  type: 'string',
                  description: 'Comma-separated Stellar public wallet addresses'
                },
                contracts: {
                  type: 'string',
                  description: 'Optional comma-separated SEP-41 / Soroban token contract IDs'
                }
              },
              required: ['wallets']
            }
          },
          {
            name: 'get_treasury_history',
            description: 'Retrieve snapshot-based WealthView treasury history for one or more Stellar wallets.',
            inputSchema: {
              type: 'object',
              properties: {
                wallets: {
                  type: 'string',
                  description: 'Comma-separated Stellar public wallet addresses'
                },
                contracts: {
                  type: 'string',
                  description: 'Optional comma-separated SEP-41 / Soroban token contract IDs'
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
    if (!TOOL_NAMES.includes(toolName)) {
      return makeError(id, `Unknown tool: ${toolName}`);
    }

    const walletInput = params?.arguments?.wallets;
    const contractInput = params?.arguments?.contracts;
    const wallets = normalizeWallets(walletInput);
    const contracts = normalizeContracts(contractInput);

    if (!wallets) {
      return makeError(id, 'Invalid input: wallets must be a non-empty comma-separated string.');
    }

    if (!contracts) {
      return makeError(id, 'Invalid input: contracts must be an optional comma-separated string.');
    }

    try {
      const apiPath = toolName === 'get_treasury_signals'
        ? '/api/signals'
        : toolName === 'get_treasury_intelligence'
          ? '/api/intelligence'
          : toolName === 'get_treasury_history'
            ? '/api/history'
            : '/api/aggregate';
      const result = await callWealthViewApi(apiPath, wallets, contracts);
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'json',
              json: result
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
