import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

// compile the cron handler
const outDir = path.resolve('node_modules/.tmp/cron-check');
fs.rmSync(outDir, { recursive: true, force: true });
execFileSync(process.execPath, [
  path.resolve('node_modules/typescript/bin/tsc'),
  '--ignoreConfig',
  '--target', 'ES2023',
  '--module', 'NodeNext',
  '--moduleResolution', 'NodeNext',
  '--types', 'node',
  '--skipLibCheck',
  '--outDir', outDir,
  'api/cron/update-crypto-prices.ts',
  'api/_lib/firebaseAdmin.ts',
  'api/_lib/marketPriceProviders.ts',
], { stdio: 'inherit' });

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([^#=\s]+)\s*=\s*(.*?)\s*$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^['"]|['"]$/g, '')])
);
Object.assign(process.env, env);

const { default: handler } = await import(pathToFileURL(path.join(outDir, 'cron', 'update-crypto-prices.js')).href);

const fakeReq = {
  method: 'GET',
  headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  url: '/api/cron/update-crypto-prices?secret=' + (process.env.CRON_SECRET || ''),
};

const fakeRes = {
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(data) { this.body = data; return this; },
  setHeader() {},
};

try {
  const result = await handler(fakeReq, fakeRes);
  console.log('Handler returned:', JSON.stringify({ status: fakeRes.statusCode, body: fakeRes.body }, null, 2));
} catch (err) {
  console.error('Handler threw:', err);
  process.exit(2);
}
