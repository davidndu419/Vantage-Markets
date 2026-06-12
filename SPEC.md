# Vantage Markets Specification

Build a production-ready full-stack web application called **Vantage Markets**, a dark-luxury crypto and stock trading platform with:

1. A public landing page.
2. A protected user trading dashboard.
3. A fully hidden admin portal.
4. Firebase Auth and Firestore.
5. Vercel Cron-based price updates.
6. Firestore real-time support chat and transaction status updates.

---

## 1. Core Technology Requirements

Use:

* React
* Tailwind CSS
* Firebase Auth
* Firestore
* Vercel serverless functions
* Vercel Cron
* Twelve Data API for stock prices
* CoinGecko API for crypto prices
* qrcode.react for QR display
* Firestore onSnapshot for real-time chat and deposit updates

Do not use paid Firebase features. Assume Firebase Spark/free plan.

Frontend must never call Twelve Data or CoinGecko directly. All market prices must be read from Firestore collection `assetPrices`.

---

## 2. Design System

Apply globally:

* Background: `#0A0E1A`
* Cards: `#111827`
* Border: `#1F2937`
* Gold Accent: `#C9A84C`
* Accent Hover: `#B8923E`
* Text Primary: `#F0F0F0`
* Text Secondary: `#9CA3AF`
* Success: `#22C55E`
* Danger: `#EF4444`
* Font: Inter
* Border radius: 12px cards, 8px buttons/inputs
* Brand: “VM” gold mark + “Vantage Markets”
* Tagline: “Trade with the advantage.”

The interface should feel like Binance meets a private trading desk: fast, dark, premium, sharp, and trustworthy.

---

## 3. Firestore Collections

Create and use these exact collections:

### users

Fields:

* uid
* name
* email
* createdAt
* withdrawalFrozen
* freezeReason
* role optional, only `"admin"` when manually added in Firestore

### assets

Fields:

* id
* name
* ticker
* type: `"stock"` or `"crypto"`
* minDeposit
* maxDeposit
* createdAt

### assetPrices

Fields:

* ticker
* price
* updatedAt

### holdings

Fields:

* userId
* assetId
* assetName
* ticker
* type
* quantity
* createdAt

### transactions

Fields:

* id
* userId
* assetId
* assetName
* ticker
* type: `"deposit" | "withdrawal" | "admin_credit"`
* amount
* quantity
* status: `"pending" | "completed" | "declined"`
* createdAt
* visibleToUser

### depositAddresses

Fields:

* id
* label
* network
* address
* qrCodeUrl
* active
* createdAt

### supportChats

Fields:

* id
* userId
* userName
* lastMessage
* lastMessageAt
* unreadByAdmin
* unreadByUser

### supportMessages

Fields:

* id
* chatId
* senderId
* senderRole: `"user" | "admin"`
* message
* createdAt

### adminCredits

Fields:

* id
* userId
* assetId
* assetName
* ticker
* amountAdded
* quantityAdded
* priceAtTime
* creditedBy: `"admin"`
* createdAt

---

## 4. Security and Data Integrity Rules

Implement Firestore security rules with the following principles:

1. Users may read their own profile, holdings, visible transactions, and support messages.
2. Users must not directly modify holdings.
3. Users must not directly approve, decline, or complete transactions.
4. Users may create deposit and withdrawal requests only for themselves.
5. Users must never read `adminCredits`.
6. Users must never see transactions where `visibleToUser === false`.
7. Only users with `role === "admin"` may access admin-only data.
8. Admins may approve deposits, decline deposits, approve withdrawals, freeze withdrawals, manage assets, manage deposit addresses, and respond to support chats.
9. The admin role must only be granted manually in Firestore, never through the app.
10. Use atomic updates or Firestore transactions when approving deposits or adding holdings.

---

## 5. Balance Rule

Never store user balance.

Always calculate portfolio value as:

`sum(holding.quantity × assetPrices[holding.ticker].price)`

Use this calculation on dashboard and portfolio pages.

---

## 6. Vercel Cron Price Updates

Create:

`/api/cron/update-stock-prices`

* Runs every 3 hours.
* Reads stock assets from Firestore.
* Fetches prices from Twelve Data.
* Upserts prices into `assetPrices`.

`/api/cron/update-crypto-prices`

* Runs every 3 hours.
* Reads crypto assets from Firestore.
* Fetches prices from CoinGecko.
* Upserts prices into `assetPrices`.

Add `CRON_SECRET` protection to both endpoints.

Add `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/update-stock-prices", "schedule": "0 */3 * * *" },
    { "path": "/api/cron/update-crypto-prices", "schedule": "0 */3 * * *" }
  ]
}
```

---

## 7. Required Routes

Create:

* `/`
* `/auth`
* `/dashboard`
* `/deposit`
* `/deposit/:assetId`
* `/portfolio`
* `/transactions`
* `/withdraw`
* `/support`
* `/admin`
* `/admin/users`
* `/admin/users/:userId`
* `/admin/investments`
* `/admin/deposit-addresses`
* `/admin/support`
* `/admin/transactions`

All user routes except `/` and `/auth` are protected.

All `/admin` routes are protected and hidden.

If a non-admin tries to visit `/admin` or `/admin/*`, silently redirect to `/dashboard` without showing any access-denied message.

Do not show any admin link, admin button, admin text, or admin reference anywhere in the user-facing app.

---

## 8. User Features

Build:

### Landing Page

Include:

* Navbar
* Hero section
* Animated candlestick visual background
* Live market ticker from Firestore
* How it works
* Live markets preview
* Platform features
* Stats bar
* CTA banner
* Footer

### Auth Page

Include register/login toggle.

Register fields:

* Full Name
* Email
* Password
* Confirm Password

Login fields:

* Email
* Password

On success, redirect to `/dashboard`.

### Dashboard

Include:

* Greeting
* Portfolio value
* Deposit button
* Withdraw button
* Stocks/Crypto toggle
* Top holdings
* Recent visible transactions
* Floating support button

### Deposit Flow

`/deposit`:

* Asset cards filtered by stock/crypto.

`/deposit/:assetId`:

* Show asset details.
* Show live price.
* Amount input.
* Calculate quantity.
* Validate min/max deposit.
* Confirm deposit.
* Reveal active wallet address and QR code.
* “I have made the payment” creates pending transaction.

### Portfolio

Show holdings, quantity, live price, current value, and filtered total.

### Transactions

Show only user-visible transactions.

Never show `admin_credit`.

### Withdraw

If `withdrawalFrozen === true`, show restriction message and reason.

If not frozen, allow withdrawal request and create pending withdrawal transaction.

### Support Chat

Use Firestore real-time listeners.

User messages right-aligned in gold.

Admin messages left-aligned as “Support Team.”

---

## 9. Admin Portal Features

Admin portal must include:

### Admin Dashboard

* Total users
* Pending deposits
* Assets count
* Open support tickets
* Recent users
* Recent pending deposits

### User Detail

Include:

* User profile
* Freeze withdrawal toggle
* Freeze reason input
* Holdings table
* Add holding value modal
* Deposit history
* Withdrawal history

Approving a deposit must:

1. Set transaction status to completed.
2. Add transaction quantity to user holding.
3. Use atomic update logic.
4. Prevent duplicate approval.

Declining a deposit must set status to declined.

Adding admin credit must:

1. Increase holding quantity.
2. Create `adminCredits` audit record.
3. Not create visible user transaction.
4. Not appear in user transaction history.

### Investment Library

Allow admin to:

* Add assets
* Edit min/max deposit
* Delete assets
* View live price from `assetPrices`

### Deposit Address Manager

Allow admin to:

* Add address
* Edit address
* Delete address
* Mark one address as active

Only active address appears to users.

### Support Inbox

Allow admin to:

* View all conversations
* Open chat thread
* Reply as support team
* Mark messages read/unread properly

### Transaction Audit Log

Show all transaction types, including admin credits.

Allow filters by:

* User
* Type
* Status
* Date range

---

## 10. Recommended Architecture

Use a clean folder structure:

```txt
src/
  components/
  pages/
  routes/
  layouts/
  hooks/
  services/
  firebase/
  utils/
  types/
  guards/
  admin/
  user/
api/
  cron/
```

Use service/repository functions for Firestore operations instead of scattering Firestore calls throughout components.

Use reusable components:

* Button
* Card
* Input
* Modal
* Badge
* Table
* Loader
* EmptyState
* ProtectedRoute
* AdminRoute
* AssetCard
* TransactionRow
* SupportChatWindow

---

## 11. Error Handling and Loading States

Every Firestore query and async action must include:

* Loading state
* Error state
* Empty state
* Success feedback where appropriate

Do not leave blank screens.

---

## 12. Build Order

Build in this exact order:

1. Project setup.
2. Tailwind and design system.
3. Firebase setup.
4. Firestore types and services.
5. Auth.
6. Protected routes.
7. Cron endpoints.
8. Seed test assets.
9. Landing page.
10. Dashboard.
11. Deposit flow.
12. Portfolio.
13. Transactions.
14. Withdraw.
15. Support chat.
16. Admin route protection.
17. Admin dashboard.
18. Admin user management.
19. Admin investment library.
20. Admin deposit addresses.
21. Admin support inbox.
22. Admin audit log.
23. Firestore security rules.
24. Testing and polish.
25. Deployment readiness.

---

## 13. Final Quality Requirements

Before finishing, verify:

* No user-facing admin references exist.
* Users cannot see admin credits.
* Users cannot modify holdings directly.
* Portfolio balance is calculated, not stored.
* Prices come only from Firestore.
* Admin access requires Firestore role.
* Deposit approval updates holdings once only.
* Withdrawal freeze works.
* Support chat is real time.
* Cron endpoints are secured.
* UI follows the design system everywhere.
* App is deployable to Vercel.
