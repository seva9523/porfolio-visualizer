const StellarPortfolio = (() => {

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

  function createAsset(symbol, amount, valueUSD, type) {
    return {
      symbol,
      amount,
      valueUSD,
      type
    };
  }

  async function getPortfolio(addresses = []) {

    if (!Array.isArray(addresses)) {
      throw new Error("addresses must be an array");
    }

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

        const valueUSD = isNative ? amount * xlmPrice : 0;

        if (!portfolio.assets[symbol]) {
          portfolio.assets[symbol] = createAsset(
            symbol,
            0,
            0,
            isNative ? "native" : "token"
          );
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
