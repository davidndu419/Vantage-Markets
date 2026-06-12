import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, writeBatch } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually parse .env file to avoid external dependency issues
try {
  const envPath = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        // Strip wrapping quotes
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.slice(1, -1);
        }
        process.env[key] = val.trim();
      }
    });
    console.log('Successfully loaded environment variables from .env');
  } else {
    console.warn('.env file not found. Relying on system environment variables.');
  }
} catch (err) {
  console.error('Error loading .env file:', err);
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const initialAssets = [
  // Crypto Assets
  { id: 'bitcoin', name: 'Bitcoin', ticker: 'BTC', type: 'crypto', minDeposit: 0.0001, maxDeposit: 10 },
  { id: 'ethereum', name: 'Ethereum', ticker: 'ETH', type: 'crypto', minDeposit: 0.005, maxDeposit: 100 },
  { id: 'solana', name: 'Solana', ticker: 'SOL', type: 'crypto', minDeposit: 0.1, maxDeposit: 1000 },
  { id: 'cardano', name: 'Cardano', ticker: 'ADA', type: 'crypto', minDeposit: 10, maxDeposit: 100000 },
  // Stock Assets
  { id: 'apple', name: 'Apple Inc.', ticker: 'AAPL', type: 'stock', minDeposit: 10, maxDeposit: 50000 },
  { id: 'tesla', name: 'Tesla Inc.', ticker: 'TSLA', type: 'stock', minDeposit: 10, maxDeposit: 50000 },
  { id: 'nvidia', name: 'NVIDIA Corp.', ticker: 'NVDA', type: 'stock', minDeposit: 10, maxDeposit: 50000 },
  { id: 'microsoft', name: 'Microsoft Corp.', ticker: 'MSFT', type: 'stock', minDeposit: 10, maxDeposit: 50000 },
];

const initialPrices = [
  { ticker: 'BTC', price: 67250.5 },
  { ticker: 'ETH', price: 3480.25 },
  { ticker: 'SOL', price: 148.75 },
  { ticker: 'ADA', price: 0.48 },
  { ticker: 'AAPL', price: 178.3 },
  { ticker: 'TSLA', price: 175.6 },
  { ticker: 'NVDA', price: 920.45 },
  { ticker: 'MSFT', price: 415.8 },
];

const initialDepositAddresses = [
  {
    id: 'btc_address',
    label: 'Bitcoin Mainnet',
    network: 'BTC',
    address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    qrCodeUrl: '',
    active: true,
  },
  {
    id: 'eth_erc20_address',
    label: 'Ethereum (ERC20)',
    network: 'ERC20',
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    qrCodeUrl: '',
    active: true,
  },
  {
    id: 'usdt_trc20_address',
    label: 'TRON (TRC20)',
    network: 'TRC20',
    address: 'TX7N2f3e8f855e7144Bc454e4438f44e8A',
    qrCodeUrl: '',
    active: true,
  },
];

async function seed() {
  console.log('Starting Vantage Markets database seed...');
  const batch = writeBatch(db);

  // 1. Seed Assets
  console.log('Seeding assets...');
  initialAssets.forEach((asset) => {
    const assetRef = doc(db, 'assets', asset.id);
    batch.set(
      assetRef,
      {
        id: asset.id,
        name: asset.name,
        ticker: asset.ticker,
        type: asset.type,
        minDeposit: asset.minDeposit,
        maxDeposit: asset.maxDeposit,
        createdAt: new Date(),
      },
      { merge: true }
    );
  });

  // 2. Seed Prices
  console.log('Seeding initial prices...');
  initialPrices.forEach((p) => {
    const priceRef = doc(db, 'assetPrices', p.ticker);
    batch.set(
      priceRef,
      {
        ticker: p.ticker,
        price: p.price,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  });

  // 3. Seed Deposit Addresses
  console.log('Seeding deposit addresses...');
  initialDepositAddresses.forEach((addr) => {
    const addrRef = doc(db, 'depositAddresses', addr.id);
    batch.set(
      addrRef,
      {
        id: addr.id,
        label: addr.label,
        network: addr.network,
        address: addr.address,
        qrCodeUrl: addr.qrCodeUrl,
        active: addr.active,
        createdAt: new Date(),
      },
      { merge: true }
    );
  });

  await batch.commit();
  console.log('Database seeded successfully!');
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
