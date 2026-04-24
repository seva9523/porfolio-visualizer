const StellarPortfolio = (() => {

  // ----------------------------
  // TOKEN METADATA REGISTRY
  // ----------------------------
  const TOKEN_METADATA = {
    XLM: {
      name: "Stellar Lumens",
      icon: "https://raw.githubusercontent.com/stellar/stellar-icons/main/png/stellar.png",
      type: "native"
    },
    USDC: {
      name: "USD Coin",
      icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
      type: "token"
    },
    AQUA: {
      name: "Aqua Token",
      icon: "https://aqua.network/logo.png",
      type: "token"
    }
  };

  const COINGECKO_URL =
    "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd";

  async function getXLMPrice() {
    const res = await fetch(COINGECKO_URL);
    const data = await res.json();
    return data.stellar.usd;
  }

  async function fetchAccount(address) {
    const res = await fetch(`https://horizon.stellar.org/accounts/${address}`);

    if (!res.ok) {
      throw new Error(`Account error: ${address}`);
    }

    return await res.json();
  }

  function getTokenMeta(symbol, isNative) {
    if (isNative) return TOKEN_METADATA.XLM;

    return TOKEN_METADATA[symbol] || {
      name: symbol,
      icon: "https://cdn-icons-png.flaticon.com/512/6001/6001368.png",
      type: "token"
    };
  }

  async function getPortfolio(addresses = []) {

    const xlmPrice = await getXLMPrice();

    let portfolio = {
      wallets: addresses.length,
      totalUSD: 0,
      totalXLM: 0,
      assets: {}
    };

    for (let address of addresses) {

      let data;

      try {
        data = await fetchAccount(address);
      } catch (e) {
        console.warn("Skipping invalid wallet:", address);
        continue;
      }

      data.balances.forEach(b => {

        const isNative = b.asset_type === "native";
        const symbol = isNative ? "XLM" : b.asset_code;
        const amount = parseFloat(b.balance);

        const meta = getTokenMeta(symbol, isNative);

        const valueUSD = isNative ? amount * xlmPrice : 0;

        if (!portfolio.assets[symbol]) {
          portfolio.assets[symbol] = {
            symbol,
            name: meta.name,
            icon: meta.icon,
            amount: 0,
            valueUSD: 0,
            type: meta.type
          };
        }

        portfolio.assets[symbol].amount += amount;
        portfolio.assets[symbol].valueUSD += valueUSD;

        if (isNative) {
          portfolio.totalXLM += amount;
          portfolio.totalUSD += valueUSD;
        }
      });
    }

    return portfolio;
  }

  return {
    getPortfolio
  };

})();
