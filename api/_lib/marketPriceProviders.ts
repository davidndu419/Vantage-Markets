const parsePositivePrice = (value: unknown, provider: string): number => {
  const price = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`${provider} did not return a valid positive price.`);
  }
  return price;
};

export const fetchStockSpotPrice = async (ticker: string): Promise<number> => {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    throw new Error('TWELVE_DATA_API_KEY is not configured.');
  }

  const symbol = ticker.trim().toUpperCase();
  const url = new URL('https://api.twelvedata.com/price');
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('apikey', apiKey);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Twelve Data returned HTTP ${response.status}.`);
  }

  const data = await response.json();
  if (data.status === 'error') {
    throw new Error(data.message || 'Twelve Data rejected the ticker.');
  }

  return parsePositivePrice(data.price, 'Twelve Data');
};

export const fetchCryptoSpotPrice = async (coingeckoId: string): Promise<number> => {
  const id = coingeckoId.trim().toLowerCase();
  const isPro = process.env.COINGECKO_IS_PRO === 'true';
  const baseUrl = isPro
    ? 'https://pro-api.coingecko.com/api/v3/simple/price'
    : 'https://api.coingecko.com/api/v3/simple/price';
  const url = new URL(baseUrl);
  url.searchParams.set('ids', id);
  url.searchParams.set('vs_currencies', 'usd');

  const headers: Record<string, string> = {};
  if (process.env.COINGECKO_API_KEY) {
    headers[isPro ? 'x-cg-pro-api-key' : 'x-cg-demo-api-key'] =
      process.env.COINGECKO_API_KEY;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`CoinGecko returned HTTP ${response.status}.`);
  }

  const data = await response.json();
  return parsePositivePrice(data[id]?.usd, 'CoinGecko');
};
