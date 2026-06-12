const [, , email, password, role] = process.argv;
const port = Number(process.env.CDP_PORT || 9222);

if (!email || !password || !['user', 'admin'].includes(role)) {
  throw new Error('Usage: node scripts/runtimeAcceptance.mjs <email> <password> <user|admin>');
}

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

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  return result.result.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url: 'http://127.0.0.1:4173/auth' });
await wait(2500);

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
await wait(6000);

const expectedHome = role === 'admin' ? '/admin' : '/dashboard';
const loginPath = await evaluate('location.pathname');
console.log(`loginPath=${loginPath} expected=${expectedHome}`);

const forbiddenPath = role === 'admin' ? '/dashboard' : '/admin';
await send('Page.navigate', { url: `http://127.0.0.1:4173${forbiddenPath}` });
await wait(3000);
const redirectedPath = await evaluate('location.pathname');
console.log(`forbiddenPath=${forbiddenPath} redirectedPath=${redirectedPath}`);

if (role === 'user') {
  const inspectPage = async (path) => {
    await send('Page.navigate', { url: `http://127.0.0.1:4173${path}` });
    await wait(3000);
    return evaluate(`({
      path: location.pathname,
      text: document.body.innerText,
      stockLogos: document.querySelectorAll('img[src*="/assets/logos/stocks/"]').length,
      cryptoLogos: document.querySelectorAll('img[src*="/assets/logos/crypto/"]').length
    })`);
  };

  const stockDashboard = await inspectPage('/dashboard');
  console.log(`stockDashboardTitle=${stockDashboard.text.includes('LIVE STOCK MARKET SUMMARY')}`);
  console.log(`stockDashboardHasMicrosoft=${stockDashboard.text.includes('Microsoft Corp.')}`);
  console.log(`stockDashboardHasBitcoin=${stockDashboard.text.includes('Bitcoin')}`);
  console.log(`stockDashboardWithdrawalStatus=${stockDashboard.text.includes('WITHDRAWALS STATUS')}`);

  const stockPortfolio = await inspectPage('/portfolio');
  console.log(`stockPortfolioTitle=${stockPortfolio.text.includes('STOCK PORTFOLIO')}`);
  console.log(`stockPortfolioCrossRatio=${stockPortfolio.text.includes('STOCKS VS CRYPTO')}`);

  const stockDeposit = await inspectPage('/deposit');
  console.log(`stockDepositTitle=${stockDeposit.text.includes('INVEST IN STOCKS')}`);
  console.log(`stockDepositHasMicrosoft=${stockDeposit.text.includes('Microsoft Corp.')}`);
  console.log(`stockDepositHasBitcoin=${stockDeposit.text.includes('Bitcoin')}`);
  console.log(`stockDepositLogos=${stockDeposit.stockLogos}`);
  console.log(`stockDepositHasLocalTabs=${stockDeposit.text.includes('STOCK SECURITIES') || stockDeposit.text.includes('CRYPTOCURRENCIES')}`);

  const stockTransactions = await inspectPage('/transactions');
  console.log(`stockTransactionsMode=${stockTransactions.text.includes('STOCK MODE')}`);

  const settings = await inspectPage('/settings');
  console.log(`settingsWithdrawalStatus=${settings.text.includes('WITHDRAWAL GATEWAY')}`);

  await inspectPage('/dashboard');
  await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')]
      .find((candidate) => candidate.innerText.trim().toLowerCase() === 'crypto');
    button?.click();
  })()`);
  await wait(2500);

  const cryptoDashboard = await evaluate(`({
    text: document.body.innerText,
    stockLogos: document.querySelectorAll('img[src*="/assets/logos/stocks/"]').length,
    cryptoLogos: document.querySelectorAll('img[src*="/assets/logos/crypto/"]').length
  })`);
  console.log(`cryptoDashboardTitle=${cryptoDashboard.text.includes('LIVE CRYPTO MARKET SUMMARY')}`);
  console.log(`cryptoDashboardHasBitcoin=${cryptoDashboard.text.includes('Bitcoin')}`);
  console.log(`cryptoDashboardHasMicrosoft=${cryptoDashboard.text.includes('Microsoft Corp.')}`);

  const cryptoPortfolio = await inspectPage('/portfolio');
  console.log(`cryptoPortfolioTitle=${cryptoPortfolio.text.includes('CRYPTO PORTFOLIO')}`);
  console.log(`cryptoPortfolioCrossRatio=${cryptoPortfolio.text.includes('STOCKS VS CRYPTO')}`);

  const cryptoDeposit = await inspectPage('/deposit');
  console.log(`cryptoDepositTitle=${cryptoDeposit.text.includes('INVEST IN CRYPTO')}`);
  console.log(`cryptoDepositHasBitcoin=${cryptoDeposit.text.includes('Bitcoin')}`);
  console.log(`cryptoDepositHasMicrosoft=${cryptoDeposit.text.includes('Microsoft Corp.')}`);
  console.log(`cryptoDepositLogos=${cryptoDeposit.cryptoLogos}`);

  const cryptoTransactions = await inspectPage('/transactions');
  console.log(`cryptoTransactionsMode=${cryptoTransactions.text.includes('CRYPTO MODE')}`);
}

socket.close();
