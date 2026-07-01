# EasyCron Integration for Vantage Markets

## Why use EasyCron
Vercel Hobby cannot deploy cron jobs that run more than once per day. To keep your stock and crypto update endpoints running more frequently, use an external scheduler like EasyCron.

## What this repo now expects
The Vercel cron configuration has been removed from `vercel.json` so the app can deploy on Hobby. Instead, EasyCron will call the existing API endpoints directly.

## Endpoints to schedule
Use these URLs with your EasyCron jobs:

- Stock update:
  `https://<your-deployment>.vercel.app/api/cron/update-stock-prices?secret=<CRON_SECRET>`
- Crypto update:
  `https://<your-deployment>.vercel.app/api/cron/update-crypto-prices?secret=<CRON_SECRET>`

The API accepts the secret in these ways:
- query param: `?secret=<CRON_SECRET>`
- query param: `?cron-secret=<CRON_SECRET>`
- header: `Authorization: Bearer <CRON_SECRET>`
- header: `x-cron-secret: <CRON_SECRET>`

## Recommended EasyCron setup
1. Create an EasyCron account.
2. Add a new cron job for the stock endpoint.
   - URL: `https://<your-deployment>.vercel.app/api/cron/update-stock-prices?secret=<CRON_SECRET>`
   - Method: GET
   - Schedule: every minute (if your EasyCron plan supports it) or every 5 minutes for a free tier.
3. Add a second cron job for the crypto endpoint.
   - URL: `https://<your-deployment>.vercel.app/api/cron/update-crypto-prices?secret=<CRON_SECRET>`
   - Method: GET
   - Schedule: every 3 hours, or less frequently if you prefer.

## Notes
- If you use a free EasyCron tier, the minimum interval may be 5 or 10 minutes.
- The stock endpoint is cursor-based, so it will continue from the last saved position and process the next batch of stocks each time it runs.
- If you want more secure calls, EasyCron also supports custom headers on paid plans, but the query-parameter secret is enough for now.

## Verify the setup
After adding the jobs:
- visit the EasyCron dashboard to confirm jobs are active
- monitor the API responses in the Vercel function logs or by manually calling the URLs
- verify `assetPrices` updates in Firestore
