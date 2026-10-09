import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [
      react(),
      {
        name: 'api-server-dev-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/admin/sync-prices')) {
              try {
                const { default: handler } = await import('./api/admin/sync-prices.ts');
                let body: any = {};
                if (req.method === 'POST') {
                  const buffers = [];
                  for await (const chunk of req) {
                    buffers.push(chunk);
                  }
                  const raw = Buffer.concat(buffers).toString();
                  if (raw) body = JSON.parse(raw);
                }
                const fakeReq = Object.assign(req, { body, headers: req.headers });
                const fakeRes = Object.assign(res, {
                  status(code: number) {
                    res.statusCode = code;
                    return this;
                  },
                  json(data: any) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                    return this;
                  },
                });
                await handler(fakeReq, fakeRes);
              } catch (err: any) {
                console.error('Dev API middleware error:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err?.message || 'Internal Error' }));
              }
              return;
            }
            if (req.url?.startsWith('/api/market-price')) {
              try {
                const { default: handler } = await import('./api/market-price.ts');
                let body: any = {};
                if (req.method === 'POST') {
                  const buffers = [];
                  for await (const chunk of req) {
                    buffers.push(chunk);
                  }
                  const raw = Buffer.concat(buffers).toString();
                  if (raw) body = JSON.parse(raw);
                }
                const fakeReq = Object.assign(req, { body, headers: req.headers });
                const fakeRes = Object.assign(res, {
                  status(code: number) {
                    res.statusCode = code;
                    return this;
                  },
                  json(data: any) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                    return this;
                  },
                });
                await handler(fakeReq, fakeRes);
              } catch (err: any) {
                console.error('Dev API middleware error:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err?.message || 'Internal Error' }));
              }
              return;
            }
            next();
          });
        },
      },
    ],
  };
});

