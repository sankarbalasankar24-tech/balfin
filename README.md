# BalFin — Finance Tracker Pro

A private, professional finance tracker: daily expenses and income with
categories/subcategories/accounts, budgets and savings goals, interactive
analytics across month/3M/6M/1Y/all-time, and a full investment ledger —
stocks (any NSE/BSE symbol, buy/sell charges, staggered partial or full exits,
dividends, long/short-term P&L) and mutual funds at live prices — backed by
your own free Convex cloud database.

## Android quick-add (without opening the app)

- **Home-screen widget**: long-press the home screen → Widgets → BalFin →
  drag the quick-add widget. Two buttons: expense and income — each opens the
  entry sheet pre-set to that type; one tap more to save, synced to cloud.
- **App shortcuts**: long-press the BalFin app icon → "Add expense",
  "Add income" or "Investments".

## Run locally

```bash
npm install
npx convex dev        # one-time: creates your free Convex deployment (browser login)
npm run dev           # http://localhost:5173
```

`npx convex dev` also writes your deployment URL into `.env.local` as
`VITE_CONVEX_URL`. The app can also take the URL at first launch if the env
file is missing.

## Android APK (no Android Studio needed)

1. Push this folder to GitHub (main branch).
2. Add the repository secret `VITE_CONVEX_URL` =
   your `https://<something>.convex.cloud` URL
   (Settings → Secrets and variables → Actions).
3. Open the repo's **Actions** tab → workflow "Build Android APK" → download
   the **BalFin-APK** artifact → sideload `app-debug.apk` on your phone.

With Android Studio or the Android SDK installed locally, you can instead run:

```bash
npm run android:apk
```

(output: `android/app/build/outputs/apk/debug/app-debug.apk`)

## Notes

- Live prices for any NSE (.NS) or BSE (.BO) stock via symbol search, plus
  Nifty 50 & Sensex indices — Yahoo Finance's free endpoint, no API key.
- Buy/sell **charges** are deducted from P&L (buy charges allocated per exit).
- CSV export **and** one-tap "Send to Google Sheets" (clipboard + sheets.new).
- The app is intentionally single-user; there is no hosting or publishing.
