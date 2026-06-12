import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

const outputDirectory = path.resolve('node_modules/.tmp/market-api-check');
execFileSync(process.execPath, [
  path.resolve('node_modules/typescript/bin/tsc'),
  '--ignoreConfig',
  '--target', 'ES2023',
  '--module', 'NodeNext',
  '--moduleResolution', 'NodeNext',
  '--types', 'node',
  '--skipLibCheck',
  '--outDir', outputDirectory,
  'api/market-price.ts',
  'api/_lib/marketPriceProviders.ts',
  'api/_lib/requireAdmin.ts',
], { stdio: 'inherit' });
const { default: handler } = await import(
  pathToFileURL(path.join(outputDirectory, 'market-price.js')).href
);

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^['"]|['"]$/g, '')])
);
Object.assign(process.env, env);

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}, `market-endpoint-acceptance-${Date.now()}`);
const auth = getAuth(app);

const createResponse = () => ({
  statusCode: 200,
  data: null,
  setHeader() {},
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(data) {
    this.data = data;
    return this;
  },
});

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`PASS: ${message}`);
};

try {
  const credential = await signInWithEmailAndPassword(
    auth,
    'testseeder@vantage.com',
    'TestSeeder123!'
  );
  const token = await credential.user.getIdToken();

  const response = createResponse();
  await handler({
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: {
      type: 'crypto',
      ticker: 'BTC',
      coingeckoId: 'bitcoin',
    },
  }, response);

  assert(response.statusCode === 200, 'authenticated admin can request a market quote');
  assert(response.data.provider === 'CoinGecko', 'crypto quote uses CoinGecko');
  assert(response.data.price > 0, 'endpoint returns a positive real crypto price');

  const invalidCryptoResponse = createResponse();
  await handler({
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: {
      type: 'crypto',
      ticker: 'NOTREAL',
      coingeckoId: 'definitely-not-a-real-coingecko-id',
    },
  }, invalidCryptoResponse);
  assert(invalidCryptoResponse.statusCode === 502, 'invalid CoinGecko ID fails without a fallback price');

  const stockResponse = createResponse();
  await handler({
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: {
      type: 'stock',
      ticker: 'AAPL',
    },
  }, stockResponse);
  assert(
    process.env.TWELVE_DATA_API_KEY
      ? stockResponse.statusCode === 200 && stockResponse.data.price > 0
      : stockResponse.statusCode === 502,
    process.env.TWELVE_DATA_API_KEY
      ? 'stock quote uses configured Twelve Data credentials'
      : 'stock quote fails clearly when Twelve Data is not configured'
  );

  const unauthorizedResponse = createResponse();
  await handler({
    method: 'POST',
    headers: {},
    body: {
      type: 'crypto',
      ticker: 'BTC',
      coingeckoId: 'bitcoin',
    },
  }, unauthorizedResponse);
  assert(unauthorizedResponse.statusCode === 401, 'unauthenticated quote request is rejected');

  await signOut(auth);
  const userCredential = await signInWithEmailAndPassword(
    auth,
    'checkuser@vantage.com',
    'CheckUser123!'
  );
  const userToken = await userCredential.user.getIdToken();
  const forbiddenResponse = createResponse();
  await handler({
    method: 'POST',
    headers: { authorization: `Bearer ${userToken}` },
    body: {
      type: 'crypto',
      ticker: 'BTC',
      coingeckoId: 'bitcoin',
    },
  }, forbiddenResponse);
  assert(forbiddenResponse.statusCode === 403, 'standard user cannot request an admin market quote');
} finally {
  await signOut(auth).catch(() => {});
  await deleteApp(app);
}
