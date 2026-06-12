let stellarSdkPromise = null;

async function loadStellarSdk() {
  if (!stellarSdkPromise) {
    stellarSdkPromise = import('@stellar/stellar-sdk');
  }
  return stellarSdkPromise;
}


const DEFAULT_RPC_URL = 'https://mainnet.sorobanrpc.com';
const RPC_URL = process.env.STELLAR_RPC_URL || DEFAULT_RPC_URL;
const RPC_REQUEST_TIMEOUT_MS = 12_000;

function createRpcServer(StellarRpc) {
  return new StellarRpc.Server(RPC_URL, { allowHttp: RPC_URL.startsWith('http://') });
}

function timeoutPromise(label) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`${label} timed out after ${RPC_REQUEST_TIMEOUT_MS}ms`)), RPC_REQUEST_TIMEOUT_MS);
  });
}

async function withTimeout(promise, label) {
  return Promise.race([promise, timeoutPromise(label)]);
}

function toBigIntValue(value) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.trunc(value));
  if (typeof value === 'string') return BigInt(value);
  if (value && typeof value.toString === 'function') return BigInt(value.toString());
  return 0n;
}

function bigintToDecimalNumber(rawValue, decimals) {
  const raw = toBigIntValue(rawValue);
  const precision = Number.isInteger(decimals) && decimals >= 0 ? decimals : 0;
  if (precision === 0) return Number(raw);

  const negative = raw < 0n;
  const absolute = negative ? -raw : raw;
  const divisor = 10n ** BigInt(precision);
  const whole = absolute / divisor;
  const fraction = absolute % divisor;
  const fractionText = fraction.toString().padStart(precision, '0').replace(/0+$/, '');
  const decimalText = `${negative ? '-' : ''}${whole.toString()}${fractionText ? `.${fractionText}` : ''}`;
  return Number(decimalText);
}

function parseSimulationResult(sdk, simulation, label) {
  if (simulation?.error) {
    throw new Error(`${label} failed: ${simulation.error}`);
  }

  const retval = simulation?.result?.retval;
  if (!retval) {
    throw new Error(`${label} returned no value`);
  }

  return (sdk.default || sdk).scValToNative(retval);
}

async function simulateContractCall({ sdk, server, sourceAccountId, sourceAccountSequence, contractId, functionName, args = [] }) {
  const sdkRoot = sdk.default || sdk;
  const { Account, BASE_FEE, Networks, Operation, TransactionBuilder } = sdkRoot;
  const source = new Account(sourceAccountId, sourceAccountSequence || '0');
  const transaction = new TransactionBuilder(source, {
    fee: BASE_FEE
  })
    .setNetworkPassphrase(Networks.PUBLIC)
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractId,
        function: functionName,
        args
      })
    )
    .setTimeout(30)
    .build();

  const simulation = await withTimeout(
    server.simulateTransaction(transaction),
    `SEP-41 ${functionName}(${contractId})`
  );

  return parseSimulationResult(sdk, simulation, `SEP-41 ${functionName}(${contractId})`);
}

async function fetchTokenMetadata({ server, sourceAccountId, sourceAccountSequence, contractId }) {
  const [symbol, name, decimals] = await Promise.all([
    simulateContractCall({ sdk: server.sdk, server, sourceAccountId, sourceAccountSequence, contractId, functionName: 'symbol' }),
    simulateContractCall({ sdk: server.sdk, server, sourceAccountId, sourceAccountSequence, contractId, functionName: 'name' }),
    simulateContractCall({ sdk: server.sdk, server, sourceAccountId, sourceAccountSequence, contractId, functionName: 'decimals' })
  ]);

  return {
    symbol: String(symbol || contractId.slice(0, 8)).toUpperCase(),
    name: String(name || symbol || contractId),
    decimals: Number(decimals || 0)
  };
}

async function fetchTokenBalance({ server, sourceAccountId, sourceAccountSequence, contractId, wallet }) {
  const { Address } = server.sdk.default || server.sdk;
  const walletAddress = new Address(wallet);
  return simulateContractCall({
    sdk: server.sdk,
    server,
    sourceAccountId,
    sourceAccountSequence,
    contractId,
    functionName: 'balance',
    args: [walletAddress.toScVal()]
  });
}

export async function fetchSep41TokenBalances({ wallets, contracts, sourceAccountId, sourceAccountSequence }) {
  if (!Array.isArray(contracts) || contracts.length === 0) {
    return {
      assets: [],
      errors: [],
      queriedContracts: [],
      failedContracts: []
    };
  }

  let sdk;
  try {
    sdk = await loadStellarSdk();
  } catch (error) {
    return {
      assets: [],
      errors: contracts.map((contractId) => ({
        contractId,
        message: `SEP-41 support unavailable: @stellar/stellar-sdk could not be loaded (${error.message})`
      })),
      queriedContracts: [],
      failedContracts: contracts.slice()
    };
  }

  const sdkRoot = sdk.default || sdk;
  const StellarRpc = sdkRoot.rpc || sdkRoot.SorobanRpc;
  if (!StellarRpc?.Server) {
    return {
      assets: [],
      errors: contracts.map((contractId) => ({
        contractId,
        message: 'SEP-41 support unavailable: Stellar RPC client is not available in @stellar/stellar-sdk'
      })),
      queriedContracts: [],
      failedContracts: contracts.slice()
    };
  }

  const server = createRpcServer(StellarRpc);
  server.sdk = sdk;
  const assets = [];
  const errors = [];
  const queriedContracts = [];
  const failedContracts = [];
  const simulationSource = sourceAccountId || wallets[0];
  const simulationSequence = sourceAccountSequence || '0';

  for (const contractId of contracts) {
    let metadata;
    try {
      metadata = await fetchTokenMetadata({
        server,
        sourceAccountId: simulationSource,
        sourceAccountSequence: simulationSequence,
        contractId
      });
    } catch (error) {
      failedContracts.push(contractId);
      errors.push({
        contractId,
        message: `SEP-41 metadata query failed: ${error.message}`
      });
      continue;
    }

    queriedContracts.push(contractId);
    let rawTotal = 0n;

    for (const wallet of wallets) {
      try {
        const rawBalance = toBigIntValue(
          await fetchTokenBalance({
            server,
            sourceAccountId: simulationSource,
            sourceAccountSequence: simulationSequence,
            contractId,
            wallet
          })
        );
        rawTotal += rawBalance;
      } catch (error) {
        errors.push({
          wallet,
          contractId,
          message: `SEP-41 balance query failed: ${error.message}`
        });
      }
    }

    if (rawTotal === 0n) {
      errors.push({
        contractId,
        message: 'No non-zero SEP-41 balances found for requested wallets.'
      });
      continue;
    }

    assets.push({
      identity: `contract:${contractId}`,
      symbol: metadata.symbol,
      amount: bigintToDecimalNumber(rawTotal, metadata.decimals),
      usdValue: null,
      assetType: 'sep41',
      contractId,
      name: metadata.name,
      decimals: metadata.decimals,
      rawAmount: rawTotal.toString(),
      source: 'soroban'
    });
  }

  return {
    assets,
    errors,
    queriedContracts,
    failedContracts
  };
}
