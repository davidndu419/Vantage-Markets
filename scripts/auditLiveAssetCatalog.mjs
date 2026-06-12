import fs from 'node:fs';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, getDocs, getFirestore } from 'firebase/firestore';

for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/);
  if (!match || process.env[match[1]]) continue;
  process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
}

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}, `asset-audit-${Date.now()}`);
const auth = getAuth(app);
const db = getFirestore(app);
await signInWithEmailAndPassword(
  auth,
  'testseeder@vantage.com',
  'TestSeeder123!'
);
const [assetsSnapshot, pricesSnapshot] = await Promise.all([
  getDocs(collection(db, 'assets')),
  getDocs(collection(db, 'assetPrices')),
]);
const prices = Object.fromEntries(
  pricesSnapshot.docs.map((priceDoc) => [priceDoc.id, priceDoc.data()])
);

const report = assetsSnapshot.docs
  .map((assetDoc) => {
    const asset = assetDoc.data();
    const price = prices[asset.ticker];
    return {
      id: assetDoc.id,
      name: asset.name,
      ticker: asset.ticker,
      type: asset.type,
      logoUrl: asset.logoUrl || null,
      coingeckoId: asset.coingeckoId || null,
      price: price?.price ?? null,
      updatedAt: price?.updatedAt?.toDate?.().toISOString?.() || null,
    };
  })
  .sort((left, right) => left.type.localeCompare(right.type) || left.ticker.localeCompare(right.ticker));

console.table(report);
console.log(JSON.stringify(report));
await signOut(auth);
await deleteApp(app);
