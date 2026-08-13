# Pulseboard — LinkedIn competitor tracker

A local-first dashboard for comparing your LinkedIn follower growth, posting cadence, and top-performing posts against a list of peers. LinkedIn data is fetched through Monid; this app never needs your LinkedIn login or cookies.

## What it does

- Stores daily follower snapshots so growth can be measured over 7, 30, or 90 days.
- Ranks your growth rate against tracked peers.
- Compares posting cadence and weighted post engagement.
- Surfaces the highest-performing peer posts for inspiration.
- Adds and removes profiles from the UI.
- Exports a 90-day benchmark as CSV.
- Ships with realistic demo data so the dashboard is usable before credentials are added.

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

## Schedule daily snapshots

Set a strong `CRON_SECRET`, then have a scheduler call:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.example/api/cron/refresh
```

Once per day is enough for audience-growth comparisons. The route replaces a same-day snapshot rather than creating duplicates.

## Deploy on Vercel

1. Import this GitHub repository into Vercel.
2. In the project's **Storage** tab, create a **Private Blob** store and connect it to all environments. Vercel adds `BLOB_READ_WRITE_TOKEN` automatically.
3. Add these project environment variables:

   - `MONID_API_KEY` — your Monid live key.
   - `CRON_SECRET` — a random string of at least 16 characters.
   - `APP_USERNAME` — the username for the dashboard, such as `admin`.
   - `APP_PASSWORD` — a strong, unique dashboard password.

4. Deploy. `vercel.json` registers a production refresh every day at 05:00 UTC. Vercel automatically sends `CRON_SECRET` as a Bearer token to the protected cron route.

The tracker state is kept in the private Blob object `linkedin-comp-tracker/store.json`. Reads bypass the CDN cache and writes use ETags to avoid silently overwriting concurrent changes. The file is not publicly accessible.

For local development, leave `BLOB_READ_WRITE_TOKEN` empty and the app uses `./data/linkedin-tracker.json`. `TRACKER_DATA_FILE` can point that local/self-hosted fallback at another persistent path.

## Validation

```bash
npm test
npm run lint
npm run build
```

Demo output is synthetic. A successful build or demo refresh does not prove live LinkedIn data retrieval; that requires a funded Monid key and a hand-check of at least one returned profile and post.

## Responsible use

Only track public professional profiles for legitimate research. Review LinkedIn's terms and the privacy/data-protection rules that apply to you before collecting or retaining public profile data.
