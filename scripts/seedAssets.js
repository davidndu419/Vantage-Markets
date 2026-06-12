import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSETS } from './assetSeedData.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(rootDir, '.env');

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const requiredEnv = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID',
  'SEED_ADMIN_EMAIL',
  'SEED_ADMIN_PASSWORD',
];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnv.join(', ')}`);
}

const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const apiKey = process.env.VITE_FIREBASE_API_KEY;
const documentsBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

const encodeValue = (value) => {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') return Number.isInteger(value)
    ? { integerValue: String(value) }
    : { doubleValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  throw new Error(`Unsupported Firestore seed value: ${String(value)}`);
};

const encodeFields = (data) => Object.fromEntries(
  Object.entries(data)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => [key, encodeValue(value)])
);

const decodeNumber = (field, fallback) => {
  if (!field) return fallback;
  return Number(field.integerValue ?? field.doubleValue ?? fallback);
};

async function authenticate() {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.SEED_ADMIN_EMAIL,
        password: process.env.SEED_ADMIN_PASSWORD,
        returnSecureToken: true,
      }),
    }
  );
  if (!response.ok) throw new Error(`Seed authentication failed: ${await response.text()}`);
  return response.json();
}

async function firestoreRequest(token, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${url} failed (${response.status}): ${await response.text()}`);
  }
  return response.status === 204 ? null : response.json();
}

async function seedAssets() {
  const auth = await authenticate();
  const profile = await firestoreRequest(auth.idToken, `${documentsBase}/users/${auth.localId}`);
  if (profile.fields?.role?.stringValue !== 'admin') {
    throw new Error('SEED_ADMIN_EMAIL must belong to a user whose Firestore role is "admin".');
  }

  const existingResponse = await firestoreRequest(
    auth.idToken,
    `${documentsBase}/assets?pageSize=100`
  );
  const existingAssets = existingResponse.documents || [];
  let created = 0;
  let updated = 0;
  let duplicatesRemoved = 0;
  let pricesCreated = 0;

  for (const { placeholderPrice, ...asset } of ASSETS) {
    const canonicalName = `${documentsBase}/assets/${asset.id}`;
    const canonical = existingAssets.find((document) => document.name === canonicalName);
    const duplicates = existingAssets.filter(
      (document) =>
        document.fields?.ticker?.stringValue === asset.ticker &&
        document.name !== canonicalName
    );

    let priceDocument = null;
    const priceResponse = await fetch(`${documentsBase}/assetPrices/${encodeURIComponent(asset.ticker)}`, {
      headers: { Authorization: `Bearer ${auth.idToken}` },
    });
    if (priceResponse.ok) priceDocument = await priceResponse.json();
    else if (priceResponse.status !== 404) {
      throw new Error(`Unable to read ${asset.ticker} price: ${await priceResponse.text()}`);
    }

    const currentPrice = decodeNumber(priceDocument?.fields?.price, placeholderPrice);
    const createdAt = canonical?.fields?.createdAt || { timestampValue: new Date().toISOString() };
    await firestoreRequest(auth.idToken, canonicalName, {
      method: 'PATCH',
      body: JSON.stringify({
        fields: {
          ...encodeFields({ ...asset, currentPrice }),
          createdAt,
        },
      }),
    });

    if (canonical) updated += 1;
    else created += 1;

    for (const duplicate of duplicates) {
      await firestoreRequest(auth.idToken, duplicate.name, { method: 'DELETE' });
      duplicatesRemoved += 1;
    }

    if (!priceDocument) {
      await firestoreRequest(
        auth.idToken,
        `${documentsBase}/assetPrices/${encodeURIComponent(asset.ticker)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            fields: encodeFields({
              ticker: asset.ticker,
              price: placeholderPrice,
              updatedAt: new Date(),
            }),
          }),
        }
      );
      pricesCreated += 1;
    }

    console.log(`[seed-assets] ${canonical ? 'updated' : 'created'} ${asset.id}`);
  }

  console.log(
    `[seed-assets] complete: ${created} created, ${updated} updated, ` +
    `${duplicatesRemoved} duplicates removed, ${pricesCreated} placeholder prices created.`
  );
}

seedAssets().catch((error) => {
  console.error('[seed-assets] failed:', error);
  process.exitCode = 1;
});
