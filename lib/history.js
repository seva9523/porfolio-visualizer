const MAX_SNAPSHOTS_PER_HISTORY = 100;

const historyStore = globalThis.__wealthviewHistoryStore || new Map();
globalThis.__wealthviewHistoryStore = historyStore;

const normalizeList = (values = []) => [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))].sort();
const kvUrl = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const kvToken = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const hasKvStorage = () => Boolean(kvUrl() && kvToken());
const historyStorageKey = (historyKey) => `wealthview:history:${historyKey}`;

async function kvRequest(path, options = {}) {
  const baseUrl = kvUrl().replace(/\/$/, '');
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${kvToken()}`,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`KV storage returned ${response.status}`);
  }

  return response.json();
}

async function readSnapshotsFromKv(historyKey) {
  const key = encodeURIComponent(historyStorageKey(historyKey));
  const data = await kvRequest(`/get/${key}`);
  const result = data?.result;
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (typeof result === 'string') {
    try {
      const parsed = JSON.parse(result);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function writeSnapshotsToKv(historyKey, snapshots) {
  const key = encodeURIComponent(historyStorageKey(historyKey));
  const value = encodeURIComponent(JSON.stringify(snapshots));
  await kvRequest(`/set/${key}/${value}`, { method: 'POST' });
}

function readSnapshotsFromMemory(historyKey) {
  return historyStore.get(historyKey) || [];
}

function writeSnapshotsToMemory(historyKey, snapshots) {
  historyStore.set(historyKey, snapshots);
}

export function createHistoryKey({ wallets = [], contracts = [] }) {
  const normalizedWallets = normalizeList(wallets);
  const normalizedContracts = normalizeList(contracts);
  return `wallets:${normalizedWallets.join(',')}|contracts:${normalizedContracts.join(',')}`;
}

export function createTreasurySnapshot({ wallets = [], contracts = [], aggregateResult = {}, storage = 'in-memory-fallback' }) {
  return {
    timestamp: new Date().toISOString(),
    wallets: normalizeList(wallets),
    contracts: normalizeList(contracts),
    totalUSD: Number(aggregateResult.totalUSD || 0),
    totalXLM: Number(aggregateResult.totalXLM || 0),
    assets: Array.isArray(aggregateResult.assets) ? aggregateResult.assets : [],
    pricedAssets: Array.isArray(aggregateResult.pricedAssets) ? aggregateResult.pricedAssets : [],
    unpricedAssets: Array.isArray(aggregateResult.unpricedAssets) ? aggregateResult.unpricedAssets : [],
    errors: Array.isArray(aggregateResult.errors) ? aggregateResult.errors : [],
    source: {
      version: aggregateResult.version || '1.0.0',
      aggregateTimestamp: aggregateResult.timestamp || null,
      snapshotStorage: storage
    },
    ...(aggregateResult.sep41 ? { sep41: aggregateResult.sep41 } : {})
  };
}

export async function saveTreasurySnapshot({ wallets = [], contracts = [], aggregateResult = {} }) {
  const normalizedWallets = normalizeList(wallets);
  const normalizedContracts = normalizeList(contracts);
  const historyKey = createHistoryKey({ wallets: normalizedWallets, contracts: normalizedContracts });
  let storage = 'in-memory-fallback';
  let storageWarning = null;

  let snapshots = readSnapshotsFromMemory(historyKey);
  if (hasKvStorage()) {
    try {
      snapshots = await readSnapshotsFromKv(historyKey);
      storage = 'vercel-kv-rest';
    } catch (error) {
      storageWarning = `Persistent history storage unavailable; used in-memory fallback. ${error.message}`;
    }
  }

  const snapshot = createTreasurySnapshot({ wallets: normalizedWallets, contracts: normalizedContracts, aggregateResult, storage });
  snapshots.push(snapshot);
  const trimmedSnapshots = snapshots.slice(-MAX_SNAPSHOTS_PER_HISTORY);

  if (storage === 'vercel-kv-rest') {
    try {
      await writeSnapshotsToKv(historyKey, trimmedSnapshots);
    } catch (error) {
      storage = 'in-memory-fallback';
      snapshot.source.snapshotStorage = storage;
      storageWarning = `Persistent history storage unavailable; used in-memory fallback. ${error.message}`;
      writeSnapshotsToMemory(historyKey, trimmedSnapshots);
    }
  } else {
    writeSnapshotsToMemory(historyKey, trimmedSnapshots);
  }

  return {
    saved: true,
    historyKey,
    snapshot,
    storage,
    ...(storageWarning ? { warning: storageWarning } : {})
  };
}

export async function getTreasuryHistory({ wallets = [], contracts = [] }) {
  const normalizedWallets = normalizeList(wallets);
  const normalizedContracts = normalizeList(contracts);
  const historyKey = createHistoryKey({ wallets: normalizedWallets, contracts: normalizedContracts });
  let storage = 'in-memory-fallback';
  let storageWarning = null;
  let snapshots = readSnapshotsFromMemory(historyKey);

  if (hasKvStorage()) {
    try {
      snapshots = await readSnapshotsFromKv(historyKey);
      storage = 'vercel-kv-rest';
    } catch (error) {
      storageWarning = `Persistent history storage unavailable; used in-memory fallback. ${error.message}`;
    }
  }

  return {
    wallets: normalizedWallets,
    contracts: normalizedContracts,
    historyKey,
    snapshots,
    count: snapshots.length,
    storage,
    ...(storageWarning ? { warning: storageWarning } : {})
  };
}
