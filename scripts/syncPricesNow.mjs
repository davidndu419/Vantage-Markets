import fs from 'node:fs';
import path from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Load .env
const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split(/\r?\n/);

let inJson = false;
let jsonBuffer = '';
let jsonKey = '';

for (const line of lines) {
  if (!inJson) {
    const jsonMatch = line.match(/^([A-Za-z0-9_]+)\s*=\s*(\{.*)$/);
    if (jsonMatch) {
      jsonKey = jsonMatch[1];
      jsonBuffer = jsonMatch[2];
      if (jsonBuffer.trim().endsWith('}') && jsonBuffer.length > 2) {
        process.env[jsonKey] = jsonBuffer;
      } else {
        inJson = true;
      }
      continue;
    }

    const standardMatch = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (standardMatch) {
      process.env[standardMatch[1]] = standardMatch[2].replace(/^['"]|['"]$/g, '').trim();
    }
  } else {
    jsonBuffer += '\n' + line;
    if (line.trim().startsWith('}')) {
      inJson = false;
      process.env[jsonKey] = jsonBuffer.trim();
    }
  }
}

console.log('Firebase project:', process.env.VITE_FIREBASE_PROJECT_ID);

const rawCredential = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!rawCredential) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not configured in .env');
  process.exit(1);
}

const serviceAccount = JSON.parse(rawCredential);
if (serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

const app = getApps()[0] || initializeApp({
  credential: cert(serviceAccount),
});
const adminDb = getFirestore(app);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function syncPrices() {
  console.log('🚀 Starting live market price sync...');

  // 1. Get all assets
  const assetsSnap = await adminDb.collection('assets').get();
  const allAssets = assetsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const stockAssets = allAssets.filter((a) => a.type === 'stock');
  const cryptoAssets = allAssets.filter((a) => a.type === 'crypto');

  console.log(`Found ${stockAssets.length} stock/forex assets and ${cryptoAssets.length} crypto assets.`);

  const pricesToUpdate = [];

  // 2. Fetch Crypto Prices from CoinGecko
  if (cryptoAssets.length > 0) {
    try {
      console.log('Fetching live crypto prices from CoinGecko...');
      const ids = cryptoAssets.map((a) => a.coingeckoId || a.id).join(',');
      const isPro = process.env.COINGECKO_IS_PRO === 'true';
      const baseUrl = isPro
        ? 'https://pro-api.coingecko.com/api/v3/simple/price'
        : 'https://api.coingecko.com/api/v3/simple/price';
      const url = new URL(baseUrl);
      url.searchParams.set('ids', ids);
      url.searchParams.set('vs_currencies', 'usd');

      const headers = {};
      if (process.env.COINGECKO_API_KEY) {
        headers[isPro ? 'x-cg-pro-api-key' : 'x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
      }

      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        cryptoAssets.forEach((asset) => {
          const coin = data[asset.coingeckoId || asset.id];
          if (coin && typeof coin.usd === 'number') {
            pricesToUpdate.push({
              assetId: asset.id,
              ticker: asset.ticker,
              price: coin.usd,
              name: asset.name,
              type: 'crypto',
            });
          }
        });
        console.log(`  ✓ Successfully fetched ${cryptoAssets.length} crypto prices.`);
      } else {
        console.error(`  ✗ CoinGecko returned status ${res.status}`);
      }
    } catch (err) {
      console.error('  ✗ Error fetching crypto prices:', err.message);
    }
  }

  // 3. Fetch Stock/Forex Prices from Twelve Data
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (stockAssets.length > 0 && apiKey) {
    console.log('Fetching live stock/forex prices from Twelve Data...');
    const tickers = stockAssets.map((a) => a.ticker);
    const chunkSize = 8;

    for (let i = 0; i < tickers.length; i += chunkSize) {
      const chunk = tickers.slice(i, i + chunkSize);
      const symbolsParam = chunk.join(',');
      const twelveUrl = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbolsParam)}&apikey=${apiKey}`;

      try {
        const res = await fetch(twelveUrl);
        const data = await res.json();
        if (chunk.length === 1 && data.price) {
          const asset = stockAssets.find((a) => a.ticker === chunk[0]);
          pricesToUpdate.push({
            assetId: asset?.id,
            ticker: chunk[0],
            price: parseFloat(data.price),
            name: asset?.name,
            type: 'stock',
          });
        } else if (typeof data === 'object') {
          chunk.forEach((sym) => {
            const item = data[sym] || data[sym.toUpperCase()];
            if (item && item.price) {
              const asset = stockAssets.find((a) => a.ticker === sym);
              pricesToUpdate.push({
                assetId: asset?.id,
                ticker: sym,
                price: parseFloat(item.price),
                name: asset?.name,
                type: 'stock',
              });
            }
          });
        }
        console.log(`  ✓ Successfully fetched batch [${symbolsParam}]`);
      } catch (err) {
        console.error(`  ✗ Error fetching batch [${symbolsParam}]:`, err.message);
      }

      if (i + chunkSize < tickers.length) {
        await wait(1000);
      }
    }
  }

  // 4. Batch commit to Firestore
  if (pricesToUpdate.length > 0) {
    console.log(`Writing ${pricesToUpdate.length} updated prices to Firestore...`);
    const batch = adminDb.batch();
    const now = new Date();

    pricesToUpdate.forEach(({ assetId, ticker, price }) => {
      // Update assetPrices collection (realtime price map)
      const priceDocRef = adminDb.collection('assetPrices').doc(ticker);
      batch.set(priceDocRef, { ticker, price, updatedAt: now }, { merge: true });

      // Update assets collection currentPrice
      if (assetId) {
        const assetDocRef = adminDb.collection('assets').doc(assetId);
        batch.set(assetDocRef, { currentPrice: price }, { merge: true });
      }
    });

    await batch.commit();
    console.log('✅ Successfully updated all asset prices in Firestore!');
    console.table(pricesToUpdate.map((p) => ({ Ticker: p.ticker, Price: p.price, Type: p.type })));
  } else {
    console.warn('⚠️ No price updates were collected.');
  }

  process.exit(0);
}

syncPrices().catch((err) => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
