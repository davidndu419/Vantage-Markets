import fs from 'node:fs';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  getDocs,
  getFirestore,
  query,
  where,
} from 'firebase/firestore';

const EMAIL = 'checkuser@vantage.com';
const PASSWORD = 'CheckUser123!';
const port = Number(process.env.CDP_PORT || 9222);

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^['"]|['"]$/g, '')])
);

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}, `home-summary-acceptance-${Date.now()}`);
const auth = getAuth(app);
const db = getFirestore(app);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log(`PASS: ${message}`);
};

const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
  method: 'PUT',
}).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let commandId = 0;

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++commandId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});

const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description
      || result.exceptionDetails.text
    );
  }
  return result.result.value;
};

const navigate = async (path, delay = 3000) => {
  await send('Page.navigate', { url: `http://127.0.0.1:4173${path}` });
  await wait(delay);
};

const chooseMode = async (mode) => {
  await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')]
      .find((candidate) => candidate.innerText.trim().toLowerCase() === ${JSON.stringify(mode)});
    if (!button) throw new Error('Market mode button not found.');
    button.click();
  })()`);
  await wait(1800);
};

const dashboardSummaryCount = () => evaluate(`(() => {
  const heading = [...document.querySelectorAll('h3')]
    .find((candidate) => candidate.innerText.includes('MARKET SUMMARY'));
  const grid = heading?.closest('section')?.querySelector('.grid');
  return grid?.children.length ?? 0;
})()`);

const depositAssetCount = () => evaluate(`(() => {
  const grid = [...document.querySelectorAll('section.grid')]
    .find((candidate) => candidate.querySelector('button'));
  return grid?.children.length ?? 0;
})()`);

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Storage.clearDataForOrigin', {
    origin: 'http://127.0.0.1:4173',
    storageTypes: 'all',
  });

  await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
  const [stockSnapshot, cryptoSnapshot] = await Promise.all([
    getDocs(query(collection(db, 'assets'), where('type', '==', 'stock'))),
    getDocs(query(collection(db, 'assets'), where('type', '==', 'crypto'))),
  ]);

  await navigate('/auth', 2000);
  await evaluate(`(() => {
    const setValue = (element, value) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(element, value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    };
    setValue(document.querySelector('input[type="email"]'), ${JSON.stringify(EMAIL)});
    setValue(document.querySelector('input[type="password"]'), ${JSON.stringify(PASSWORD)});
    document.querySelector('button[type="submit"]').click();
  })()`);
  await wait(5000);
  assert((await evaluate('location.pathname')) === '/dashboard', 'standard user login succeeds');

  await chooseMode('stocks');
  const stockSummaryCount = await dashboardSummaryCount();
  assert(stockSummaryCount === Math.min(5, stockSnapshot.size), 'stock dashboard shows at most five assets');

  await navigate('/deposit');
  const stockDepositCount = await depositAssetCount();
  assert(stockDepositCount === stockSnapshot.size, 'stock deposit page shows the full stock catalog');

  await navigate('/dashboard');
  await chooseMode('crypto');
  const cryptoSummaryCount = await dashboardSummaryCount();
  assert(cryptoSummaryCount === Math.min(5, cryptoSnapshot.size), 'crypto dashboard shows at most five assets');

  await navigate('/deposit');
  const cryptoDepositCount = await depositAssetCount();
  assert(cryptoDepositCount === cryptoSnapshot.size, 'crypto deposit page shows the full crypto catalog');
} finally {
  socket.close();
  await signOut(auth).catch(() => {});
  await deleteApp(app);
}
