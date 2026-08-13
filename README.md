# LinkedIn Watchlist MVP

A local-only dashboard for saving one weekly winning post from each tracked LinkedIn profile and comparing audience growth and posting consistency. LinkedIn data is fetched through Monid; the app never needs your LinkedIn login or cookies.

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

Add your Monid key to `.env.local`, then open [http://localhost:3000](http://localhost:3000). Click **Run weekly refresh** once a week. Results are stored in `data/linkedin-tracker.json` and remain on your computer.

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

## Weekly routine

1. Run `npm run dev`.
2. Open the dashboard.
3. Click **Run weekly refresh**.
4. Review each profile's winning post and the growth table.

The refresh replaces a same-day snapshot instead of creating duplicates. `TRACKER_DATA_FILE` can point the local data file at another path if needed.

## Validation

```bash
npm test
npm run lint
npm run build
```

Unit-test output is synthetic. A successful build does not prove live LinkedIn data retrieval; that requires a funded Monid key and a hand-check of at least one returned profile and post.

## Responsible use

Only track public professional profiles for legitimate research. Review LinkedIn's terms and the privacy/data-protection rules that apply to you before collecting or retaining public profile data.
