import fs from 'node:fs';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  writeBatch,
} from 'firebase/firestore';

for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/);
  if (!match || process.env[match[1]]) continue;
  process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
}

const STOCK_LOGO_SLUGS = {
  AAPL: 'apple',
  AMZN: 'amazon',
  'BRK.B': 'berkshire-hathaway',
  GOOGL: 'alphabet',
  INTC: 'intel',
  JPM: 'jpmorgan-chase',
  LLY: 'eli-lilly',
  META: 'meta-platforms',
  MSFT: 'microsoft',
  NVDA: 'nvidia',
  TSLA: 'tesla',
  V: 'visa',
  XOM: 'exxon',
};
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}, `asset-repair-${Date.now()}`);
const auth = getAuth(app);
const db = getFirestore(app);

const fetchCryptoMarketData = async (assets) => {
  const ids = assets.map((asset) => asset.coingeckoId).join(',');
  const isPro = process.env.COINGECKO_IS_PRO === 'true';
  const baseUrl = isPro
    ? 'https://pro-api.coingecko.com/api/v3/coins/markets'
    : 'https://api.coingecko.com/api/v3/coins/markets';
  const url = new URL(baseUrl);
  url.searchParams.set('vs_currency', 'usd');
  url.searchParams.set('ids', ids);
  url.searchParams.set('price_change_percentage', '24h');

  const headers = {};
  if (process.env.COINGECKO_API_KEY) {
    headers[isPro ? 'x-cg-pro-api-key' : 'x-cg-demo-api-key'] =
      process.env.COINGECKO_API_KEY;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`CoinGecko catalog request failed (${response.status}): ${await response.text()}`);
  }

  const data = await response.json();
  return Object.fromEntries(data.map((coin) => [coin.id, coin]));
};

const fetchStockPrices = async (assets) => {
  if (!process.env.TWELVE_DATA_API_KEY) {
    throw new Error('TWELVE_DATA_API_KEY is not configured.');
  }

  const prices = {};
  const chunks = [];
  for (let index = 0; index < assets.length; index += 8) {
    chunks.push(assets.slice(index, index + 8));
  }

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    if (index > 0) {
      console.log('Waiting for the next Twelve Data credit window...');
      await wait(61_000);
    }

    let response;
    let data;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const url = new URL('https://api.twelvedata.com/price');
      url.searchParams.set('symbol', chunk.map((asset) => asset.ticker).join(','));
      url.searchParams.set('apikey', process.env.TWELVE_DATA_API_KEY);
      response = await fetch(url);
      data = await response.json();

      if (response.status !== 429) break;
      console.log('Twelve Data rate limit reached; waiting 61 seconds before retry...');
      await wait(61_000);
    }

    if (!response.ok || data.status === 'error') {
      throw new Error(
        `Twelve Data catalog request failed (${response.status}): ${data.message || JSON.stringify(data)}`
      );
    }

    for (const asset of chunk) {
      const value = chunk.length === 1 ? data.price : data[asset.ticker]?.price;
      const price = Number(value);
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error(`Twelve Data did not return a valid price for ${asset.ticker}.`);
      }
      prices[asset.ticker] = price;
    }
  }

  return prices;
};

try {
  await signInWithEmailAndPassword(
    auth,
    'testseeder@vantage.com',
    'TestSeeder123!'
  );

  const assetsSnapshot = await getDocs(collection(db, 'assets'));
  const assets = assetsSnapshot.docs.map((assetDoc) => ({
    id: assetDoc.id,
    ...assetDoc.data(),
  }));
  const cryptoAssets = assets.filter((asset) => asset.type === 'crypto');
  const stockAssets = assets.filter((asset) => asset.type === 'stock');

  const missingCoinGeckoIds = cryptoAssets.filter((asset) => !asset.coingeckoId);
  if (missingCoinGeckoIds.length > 0) {
    throw new Error(
      `Missing CoinGecko IDs: ${missingCoinGeckoIds.map((asset) => asset.ticker).join(', ')}`
    );
  }
  const unsupportedStocks = stockAssets.filter((asset) => !STOCK_LOGO_SLUGS[asset.ticker]);
  if (unsupportedStocks.length > 0) {
    throw new Error(
      `Add stock logo mappings for: ${unsupportedStocks.map((asset) => asset.ticker).join(', ')}`
    );
  }

  const [cryptoMarketData, stockPrices] = await Promise.all([
    fetchCryptoMarketData(cryptoAssets),
    fetchStockPrices(stockAssets),
  ]);

  const repairs = assets.map((asset) => {
    if (asset.type === 'crypto') {
      const market = cryptoMarketData[asset.coingeckoId];
      if (!market || !(market.current_price > 0) || !market.image) {
        throw new Error(`CoinGecko data is incomplete for ${asset.ticker}.`);
      }
      return {
        asset,
        price: market.current_price,
        logoUrl: market.image,
      };
    }

    return {
      asset,
      price: stockPrices[asset.ticker],
      logoUrl:
        `https://s3-symbol-logo.tradingview.com/${STOCK_LOGO_SLUGS[asset.ticker]}--big.svg`,
    };
  });

  console.table(repairs.map(({ asset, price, logoUrl }) => ({
    id: asset.id,
    ticker: asset.ticker,
    type: asset.type,
    price,
    logoUrl,
  })));

  if (process.env.APPLY_ASSET_CATALOG_REPAIR !== 'true') {
    console.log('Dry run only. Set APPLY_ASSET_CATALOG_REPAIR=true to write these repairs.');
  } else {
    const batch = writeBatch(db);
    const updatedAt = new Date();
    for (const { asset, price, logoUrl } of repairs) {
      batch.set(
        doc(db, 'assets', asset.id),
        {
          logoUrl,
          currentPrice: price,
          ...(asset.type === 'crypto' ? { coingeckoId: asset.coingeckoId } : {}),
        },
        { merge: true }
      );
      batch.set(
        doc(db, 'assetPrices', asset.ticker),
        {
          ticker: asset.ticker,
          price,
          updatedAt,
        },
        { merge: true }
      );
    }
    await batch.commit();
    console.log(`Repaired ${repairs.length} live assets and prices.`);
  }
} finally {
  await signOut(auth).catch(() => {});
  await deleteApp(app);
}
