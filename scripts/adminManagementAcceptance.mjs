import fs from 'node:fs';
import {
  initializeApp,
  deleteApp,
} from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

const ADMIN_EMAIL = 'testseeder@vantage.com';
const ADMIN_PASSWORD = 'TestSeeder123!';
const USER_EMAIL = 'checkuser@vantage.com';
const USER_PASSWORD = 'CheckUser123!';
const USER_ID = 'ZOoJNLLfbCZwkYyGlV3VcqCUNaq2';
const TICKER = 'ADA';
const CREDIT_QUANTITY = 10;
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
}, `admin-management-acceptance-${Date.now()}`);
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

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++commandId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.method === 'Page.javascriptDialogOpening') {
    send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    return;
  }
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
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

const login = async (email, password) => {
  await navigate('/auth', 2000);
  await evaluate(`(() => {
    const setValue = (element, value) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(element, value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    };
    setValue(document.querySelector('input[type="email"]'), ${JSON.stringify(email)});
    setValue(document.querySelector('input[type="password"]'), ${JSON.stringify(password)});
    document.querySelector('button[type="submit"]').click();
  })()`);
  await wait(5000);
};

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Storage.clearDataForOrigin', {
    origin: 'http://127.0.0.1:4173',
    storageTypes: 'all',
  });

  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  const priceSnapshot = await getDoc(doc(db, 'assetPrices', TICKER));
  const livePrice = Number(priceSnapshot.data()?.price);
  assert(livePrice > 0, 'ADA has a live price');
  const assetSnapshots = await getDocs(query(
    collection(db, 'assets'),
    where('ticker', '==', TICKER)
  ));
  assert(assetSnapshots.size === 1, 'ADA resolves to one catalog asset');
  const assetId = assetSnapshots.docs[0].id;

  const transactionsBefore = (
    await getDocs(query(collection(db, 'transactions'), where('userId', '==', USER_ID)))
  ).size;

  await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  assert((await evaluate('location.pathname')) === '/admin', 'admin login succeeds');
  await navigate(`/admin/users/${USER_ID}`, 4500);

  const initialPageText = await evaluate('document.body.innerText');
  assert(initialPageText.includes('TOTAL BALANCE'), 'admin balance summary is visible');
  assert(initialPageText.includes('ACCOUNT TIER'), 'admin tier control is visible');

  await evaluate(`(() => {
    [...document.querySelectorAll('button')]
      .find((button) => button.innerText.includes('GRANT ADMIN CREDIT')).click();
  })()`);
  await wait(500);

  const creditModalState = await evaluate(`(() => {
    const select = [...document.querySelectorAll('select')]
      .find((element) => [...element.options].some((option) => option.value === ${JSON.stringify(assetId)}));
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    setter.call(select, ${JSON.stringify(assetId)});
    select.dispatchEvent(new Event('change', { bubbles: true }));

    const input = [...document.querySelectorAll('input[type="number"]')][0];
    const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    inputSetter.call(input, ${JSON.stringify(String(CREDIT_QUANTITY))});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    return {
      numberInputs: document.querySelectorAll('input[type="number"]').length,
      modalText: document.body.innerText,
    };
  })()`);
  await wait(300);
  const updatedModalText = await evaluate('document.body.innerText');
  assert(creditModalState.numberInputs === 1, 'credit modal has quantity as its only numeric input');
  assert(
    updatedModalText.includes((livePrice * CREDIT_QUANTITY).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })),
    'credit modal calculates the USD valuation from live price'
  );

  await evaluate(`(() => {
    [...document.querySelectorAll('button')]
      .filter((button) => button.innerText.includes('GRANT ADMIN CREDIT'))
      .at(-1).click();
  })()`);
  await wait(4500);

  const holdingRef = doc(db, 'holdings', `${USER_ID}_${assetId}`);
  const holdingAfterCredit = await getDoc(holdingRef);
  assert(holdingAfterCredit.exists(), 'admin credit creates or updates the holding');

  const credits = await getDocs(query(
    collection(db, 'adminCredits'),
    where('userId', '==', USER_ID),
    where('assetId', '==', assetId)
  ));
  const matchingCredit = credits.docs
    .map((credit) => credit.data())
    .find((credit) => credit.quantityAdded === CREDIT_QUANTITY && credit.priceAtTime === livePrice);
  assert(Boolean(matchingCredit), 'admin credit audit stores quantity and price at time');
  assert(
    matchingCredit.amountAdded === CREDIT_QUANTITY * livePrice,
    'admin credit audit amount is derived from quantity times live price'
  );

  await navigate(`/admin/users/${USER_ID}`, 4500);
  await evaluate(`(() => {
    const tierSelect = [...document.querySelectorAll('select')]
      .find((select) => [...select.options].some((option) => option.value === 'T3'));
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    setter.call(tierSelect, 'T2');
    tierSelect.dispatchEvent(new Event('change', { bubbles: true }));
    [...document.querySelectorAll('button')]
      .find((button) => button.innerText.includes('SAVE TIER')).click();
  })()`);
  await wait(2500);
  assert((await getDoc(doc(db, 'users', USER_ID))).data()?.tier === 'T2', 'admin tier change persists');

  const deleteConfirmation = await evaluate(`(() => {
    const button = document.querySelector('button[aria-label="Delete ADA holding"]');
    button.click();
    return document.body.innerText;
  })()`);
  await wait(300);
  const deleteModalText = await evaluate('document.body.innerText');
  assert(deleteModalText.includes('DELETE CLIENT HOLDING'), 'delete confirmation modal opens');
  assert(deleteModalText.includes(TICKER), 'delete confirmation identifies the ticker');
  assert(deleteModalText.includes('ESTIMATED VALUE'), 'delete confirmation shows estimated value');

  await evaluate(`(() => {
    [...document.querySelectorAll('button')]
      .filter((button) => button.innerText.includes('DELETE HOLDING'))
      .at(-1).click();
  })()`);
  await wait(4000);
  assert(!(await getDoc(holdingRef)).exists(), 'confirmed deletion removes the holding');

  const actions = await getDocs(query(
    collection(db, 'adminHoldingActions'),
    where('userId', '==', USER_ID),
    where('assetId', '==', assetId)
  ));
  const action = actions.docs.map((entry) => entry.data())
    .find((entry) => entry.action === 'delete_holding');
  assert(Boolean(action), 'holding deletion creates an admin audit record');
  assert(action.priceAtTime === livePrice, 'holding deletion audit records live price');

  const transactionsAfter = (
    await getDocs(query(collection(db, 'transactions'), where('userId', '==', USER_ID)))
  ).size;
  assert(transactionsAfter === transactionsBefore, 'credit and deletion create no user transactions');

  await send('Storage.clearDataForOrigin', {
    origin: 'http://127.0.0.1:4173',
    storageTypes: 'all',
  });
  await login(USER_EMAIL, USER_PASSWORD);
  assert((await evaluate('location.pathname')) === '/dashboard', 'standard user login succeeds');
  await navigate('/settings', 3500);
  const settingsText = await evaluate('document.body.innerText');
  assert(settingsText.includes('ACCOUNT TIER'), 'settings displays account tier');
  assert(settingsText.includes('T2'), 'settings displays the assigned tier');

  await signOut(auth);
  await signInWithEmailAndPassword(auth, USER_EMAIL, USER_PASSWORD);
  let selfTierBlocked = false;
  try {
    await updateDoc(doc(db, 'users', USER_ID), { tier: 'T3' });
  } catch {
    selfTierBlocked = true;
  }
  assert(selfTierBlocked, 'standard user cannot modify their own tier');
} finally {
  socket.close();
  await signOut(auth).catch(() => {});
  await deleteApp(app);
}
