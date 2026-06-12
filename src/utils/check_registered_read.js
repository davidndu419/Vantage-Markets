import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
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
const db = getFirestore(app);
const auth = getAuth(app);

async function run() {
  const email = 'checkuser@vantage.com';
  const password = 'CheckUser123!';
  let uid = '';

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    uid = cred.user.uid;
    console.log('Registered user:', uid);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      uid = cred.user.uid;
      console.log('Logged in as existing user:', uid);
    } else {
      throw err;
    }
  }

  // Create user profile in 'users' collection (which the user is allowed to write for themselves)
  console.log('Writing user profile...');
  await setDoc(doc(db, 'users', uid), {
    uid,
    name: 'Check User',
    email,
    createdAt: new Date(),
    withdrawalFrozen: false,
    freezeReason: '',
  });
  console.log('User profile written successfully.');

  // Try to read collections
  console.log('Checking read access to assets...');
  try {
    const assetsSnap = await getDocs(collection(db, 'assets'));
    console.log(`Assets count: ${assetsSnap.size}`);
    assetsSnap.forEach(d => console.log(`  Asset: ${d.id} => ${JSON.stringify(d.data())}`));
  } catch (err) {
    console.error('Error reading assets:', err);
  }

  console.log('Checking read access to assetPrices...');
  try {
    const pricesSnap = await getDocs(collection(db, 'assetPrices'));
    console.log(`Prices count: ${pricesSnap.size}`);
    pricesSnap.forEach(d => console.log(`  Price: ${d.id} => ${JSON.stringify(d.data())}`));
  } catch (err) {
    console.error('Error reading assetPrices:', err);
  }

  console.log('Checking read access to depositAddresses...');
  try {
    const addressesSnap = await getDocs(collection(db, 'depositAddresses'));
    console.log(`Addresses count: ${addressesSnap.size}`);
    addressesSnap.forEach(d => console.log(`  Address: ${d.id} => ${JSON.stringify(d.data())}`));
  } catch (err) {
    console.error('Error reading depositAddresses:', err);
  }
}

run().catch(console.error);
