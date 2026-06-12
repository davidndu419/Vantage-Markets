import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  const envPath = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.slice(1, -1);
        }
        process.env[key] = val.trim();
      }
    });
  }
} catch (err) {}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});
const auth = getAuth(app);

async function runAudit() {
  console.log('--- STARTING VANTAGE FIRESTORE RELATIONSHIP AUDIT ---');
  
  console.log('Authenticating as testseeder@vantage.com...');
  const userCredential = await signInWithEmailAndPassword(auth, 'testseeder@vantage.com', 'TestSeeder123!');
  console.log('Authenticated user uid:', userCredential.user.uid);

  // 1. Fetch users (Any authenticated user can read users)
  console.log('Fetching users collection...');
  const usersSnap = await getDocs(collection(db, 'users'));
  const users = new Map();
  let adminUser = null;
  
  usersSnap.forEach(d => {
    const data = d.data();
    users.set(d.id, data);
    if (data.role === 'admin') {
      adminUser = data;
    }
  });

  console.log(`- Total Users in database: ${usersSnap.size}`);
  if (adminUser) {
    console.log(`- Found Admin Operator: ${adminUser.email} (UID: ${adminUser.uid})`);
  } else {
    console.log(`- Warning: No admin user found in the fetched users list.`);
  }

  // Helper to safely fetch collection or return empty if denied
  async function safeFetch(colName) {
    try {
      console.log(`Fetching ${colName}...`);
      const snap = await getDocs(collection(db, colName));
      console.log(`  Successfully fetched ${colName}: ${snap.size} documents.`);
      return snap;
    } catch (err) {
      console.warn(`  Failed to fetch ${colName} (Permission Denied/Other): ${err.message}`);
      return null;
    }
  }

  const holdingsSnap = await safeFetch('holdings');
  const txsSnap = await safeFetch('transactions');
  const chatsSnap = await safeFetch('supportChats');
  const msgsSnap = await safeFetch('supportMessages');

  const orphanedHoldings = [];
  const orphanedTransactions = [];
  const orphanedChats = [];
  const orphanedMessages = [];

  // Audit if we successfully loaded the collections
  if (holdingsSnap) {
    holdingsSnap.forEach((doc) => {
      const data = doc.data();
      if (!users.has(data.userId)) {
        orphanedHoldings.push({ id: doc.id, userId: data.userId, assetName: data.assetName, ticker: data.ticker });
      }
    });
  }

  if (txsSnap) {
    txsSnap.forEach((doc) => {
      const data = doc.data();
      if (!users.has(data.userId)) {
        orphanedTransactions.push({ id: doc.id, userId: data.userId, amount: data.amount, type: data.type });
      }
    });
  }

  if (chatsSnap) {
    chatsSnap.forEach((doc) => {
      const data = doc.data();
      if (!users.has(data.userId) && !users.has(doc.id)) {
        orphanedChats.push({ id: doc.id, userId: data.userId, userName: data.userName });
      }
    });
  }

  // Audit supportMessages -> supportChats
  if (msgsSnap && chatsSnap) {
    const chatsMap = new Map();
    chatsSnap.forEach(d => chatsMap.set(d.id, d.data()));
    
    msgsSnap.forEach((doc) => {
      const data = doc.data();
      if (!chatsMap.has(data.chatId)) {
        orphanedMessages.push({ id: doc.id, chatId: data.chatId, senderRole: data.senderRole, message: data.message });
      }
    });
  }

  console.log(`\n--- RELATIONSHIP AUDIT SUMMARY ---`);
  console.log(`Orphaned Holdings count: ${orphanedHoldings.length}`);
  console.log(`Orphaned Transactions count: ${orphanedTransactions.length}`);
  console.log(`Orphaned Chats count: ${orphanedChats.length}`);
  console.log(`Orphaned Messages count: ${orphanedMessages.length}`);
  
  if (orphanedHoldings.length > 0) {
    orphanedHoldings.forEach(o => console.log(`  - Holding ${o.id}: UserId "${o.userId}" does not exist`));
  }
  if (orphanedTransactions.length > 0) {
    orphanedTransactions.forEach(o => console.log(`  - Transaction ${o.id}: UserId "${o.userId}" does not exist`));
  }
  if (orphanedChats.length > 0) {
    orphanedChats.forEach(o => console.log(`  - Chat ${o.id}: UserId "${o.userId}" does not exist`));
  }
  if (orphanedMessages.length > 0) {
    orphanedMessages.forEach(o => console.log(`  - Message ${o.id}: ChatId "${o.chatId}" does not exist`));
  }
  console.log(`--- AUDIT COMPLETE ---`);
}

runAudit().catch(console.error);
