# LinkedIn Watchlist MVP

A small dashboard for saving one weekly winning post from each tracked LinkedIn profile and comparing audience growth and posting consistency. LinkedIn data is fetched through Monid; this app never needs your LinkedIn login or cookies.

## What it does

- Starts with Arjun plus the 13-person watchlist in `lib/watchlist.ts`.
- Stores weekly follower snapshots so growth can be measured over 7, 30, or 90 days.
- Ranks your growth rate against tracked peers.
- Selects the highest weighted-engagement post published by each person in the last seven days.
- Compares posting cadence and weighted engagement.
- Exports a 90-day benchmark as CSV.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Connect Monid

1. Create a key at [app.monid.ai/access/api-keys](https://app.monid.ai/access/api-keys).
2. Add it to `.env.local` as `MONID_API_KEY`.
3. In the Monid CLI, inspect the configured endpoints before the first paid run:

```bash
npx @monid-ai/cli inspect -p tikhub -e /api/v1/linkedin/web_v2/get_user_profile
npx @monid-ai/cli inspect -p tikhub -e /api/v1/linkedin/web_v2/get_user_posts
```

Monid's catalog is dynamic. If either endpoint is no longer available, discover a current profile/profile-post option and change the corresponding provider and endpoint values in `.env.local`. The normalizers in `lib/monid.ts` accept the common field variants returned by LinkedIn data providers.

The default profile lookup takes a LinkedIn profile URL and reads follower count. The default post lookup makes one bounded call per tracked profile and retains up to 15 recent posts from the last month.

At the current TikHub catalog prices, refreshing the fixed 14-profile watchlist costs about $0.23 per weekly run. Provider pricing can change, so check Monid before increasing the frequency.

## Schedule the weekly run

Set a strong `CRON_SECRET`, then have a scheduler call:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.example/api/cron/refresh
```

The Vercel schedule runs every Monday at 05:00 UTC. The route replaces a same-day snapshot rather than creating duplicates.

## Deploy on Vercel

1. Import this GitHub repository into Vercel.
2. In the project's **Storage** tab, create a **Private Blob** store and connect it to all environments. Vercel adds `BLOB_READ_WRITE_TOKEN` automatically.
3. Add these project environment variables:

   - `MONID_API_KEY` — your Monid live key.
   - `CRON_SECRET` — a random string of at least 16 characters.
   - `APP_USERNAME` — the username for the dashboard, such as `admin`.
   - `APP_PASSWORD` — a strong, unique dashboard password.

4. Deploy. `vercel.json` registers a production refresh every Monday at 05:00 UTC. Vercel automatically sends `CRON_SECRET` as a Bearer token to the protected cron route.

The tracker state is kept in the private Blob object `linkedin-comp-tracker/store.json`. Reads bypass the CDN cache and writes use ETags to avoid silently overwriting concurrent changes. The file is not publicly accessible.

For local development, leave `BLOB_READ_WRITE_TOKEN` empty and the app uses `./data/linkedin-tracker.json`. `TRACKER_DATA_FILE` can point that local/self-hosted fallback at another persistent path.

## Validation

```bash
npm test
npm run lint
npm run build
```

Unit-test output is synthetic. A successful build does not prove live LinkedIn data retrieval; that requires a funded Monid key and a hand-check of at least one returned profile and post.

## Responsible use

Only track public professional profiles for legitimate research. Review LinkedIn's terms and the privacy/data-protection rules that apply to you before collecting or retaining public profile data.
