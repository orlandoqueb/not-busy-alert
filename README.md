# Not Busy Alert

An Android, iOS and web app (Expo) that lets people save places and get a push notification when a place is not busy.

- **Languages**: French (default, for Quebec), English and Spanish. The app follows the phone's language and has an FR / EN / ES switch. Push alerts are sent in the language the user picked.
- **Sign-up**: email and password (with email confirmation and password reset) or Google.

- **App**: `app/`, built with Expo SDK 58 (one codebase for Android, iOS and web)
- **Backend**: `supabase/`, with Postgres tables, two Edge Functions and a 10-minute scheduled job
- **Busyness data**: SerpApi (Google's Popular Times and live busyness). It lives in `supabase/functions/_shared/busyness.ts`, so it can be swapped for another provider.
- **Place search**: Google Places API (New)

## How it works

1. The user signs in with Google (Supabase Auth).
2. They search for a place. The app shows Google's Popular Times chart and the live busyness for it (`place-busyness` function; readings are cached for 10 minutes).
3. They tap **Add to favorites** and pick an alert rule: under X% busy, on these days, between these hours.
4. Every 10 minutes `check-busyness` checks each favorited place once, saves the reading, and sends an Expo push notification to everyone whose rule matches. After an alert it waits 2 hours before alerting that person about the same place again.

## Setup (about 30 minutes)

### 1. Accounts and keys
| What | Where | Used for |
|---|---|---|
| Supabase project | supabase.com | Database, sign-in, backend functions |
| SerpApi key | serpapi.com > Dashboard | Busyness data |
| Google Cloud project | console.cloud.google.com | (a) Places API (New) key for search, (b) OAuth client for Google sign-in |
| Expo account | expo.dev | Push notifications, builds |

### 2. Email sign-up
Email and password sign-up is on by default in Supabase (Authentication > Providers > Email). Keep **Confirm email** on.
For French emails, edit the templates under Authentication > Email Templates (Confirm signup, Reset password).
Supabase's built-in email sender is rate-limited and meant for testing. Before launch, add your own SMTP provider
(for example Resend or Postmark) under Project Settings > Authentication > SMTP.

### 3. Google sign-in
1. Google Cloud > APIs & Services > Credentials > **Create OAuth client ID** (type: Web application).
2. Authorized redirect URI: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
3. Supabase > Authentication > Providers > **Google**: paste the client ID and secret and enable it.
4. Supabase > Authentication > URL Configuration > **Redirect URLs**: add
   - `notbusyalert://auth-callback` (installed app)
   - your Expo Go URL, e.g. `exp://192.168.1.20:8081/--/auth-callback` (shown when you run `npx expo start`)
   - `http://localhost:8081` (web while developing)

### 4. Backend
```bash
npm i -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase db push                                   # creates the tables
supabase secrets set SERPAPI_KEY=your-serpapi-key  # BUSYNESS_PROVIDER=sample uses fake data
supabase functions deploy place-busyness
supabase functions deploy check-busyness --no-verify-jwt
```
Then open Supabase > SQL Editor and run the `cron.schedule(...)` block at the bottom of `supabase/migrations/0001_init.sql`, filling in your project URL and service role key.

### 5. App
```bash
cd app
cp .env.example .env     # fill in the Supabase URL, anon key and Google Maps key
npm install
npx expo start           # scan the QR code with Expo Go; press w for web
```

## App icon
A map pin with a small busyness chart where the current bar is low and green ("not busy").
Source: `app/assets/logo.svg`. The PNGs in `app/assets/` (iOS icon, Android adaptive icon, splash, favicon, in-app logo) are made from it.

## Known limits
- **Push alerts on Android need a development build.** Expo Go on Android can't receive remote notifications. Run `npx eas build --profile development --platform android` and install that build. On iPhone, Expo Go works.
- **The web version** supports search, charts and favorites, but not push alerts yet.
- **SerpApi cost**: each check of a place uses one search. One place checked every 10 minutes for 12 hours a day uses about 2,200 searches a month. Checks only run while at least one person's alert window is open. You can widen the interval in the cron schedule to save searches.
- Not every place has Popular Times on Google. Small or new places often have none.
