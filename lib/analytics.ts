import type { DashboardData, DashboardProfile, ScoredPost, TrackerStore } from "@/lib/types";

const DAY = 86_400_000;

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function buildDashboard(store: TrackerStore, range: number): DashboardData {
  const cutoff = Date.now() - range * DAY;
  const weeklyCutoff = Date.now() - 7 * DAY;
  const profiles: DashboardProfile[] = store.profiles.map((profile) => {
    const allSnapshots = store.snapshots
      .filter((item) => item.profileId === profile.id)
      .sort((a, b) => +new Date(a.capturedAt) - +new Date(b.capturedAt));
    const latest = allSnapshots.at(-1);
    const firstInRange = allSnapshots.find((item) => +new Date(item.capturedAt) >= cutoff) || allSnapshots[0];
    const history = allSnapshots
      .filter((item) => +new Date(item.capturedAt) >= cutoff)
      .map((item) => ({ date: item.capturedAt, followers: item.followers }));
    const rangePosts = store.posts.filter(
      (post) => post.profileId === profile.id && +new Date(post.publishedAt) >= cutoff,
    );
    const growth = (latest?.followers || 0) - (firstInRange?.followers || 0);
    const engagement = rangePosts.map((post) => post.reactions + post.comments * 2 + post.reposts * 3);

    return {
      ...profile,
      followers: latest?.followers || 0,
      growth,
      growthPercent: firstInRange?.followers ? (growth / firstInRange.followers) * 100 : 0,
      postsInRange: rangePosts.length,
      avgEngagement: engagement.length ? Math.round(engagement.reduce((a, b) => a + b, 0) / engagement.length) : 0,
      rank: 0,
      history,
    };
  });

  [...profiles]
    .sort((a, b) => b.growthPercent - a.growthPercent)
    .forEach((profile, index) => {
      profiles.find((item) => item.id === profile.id)!.rank = index + 1;
    });

  const profileMap = new Map(store.profiles.map((profile) => [profile.id, profile]));
  const scoredPosts: ScoredPost[] = store.posts
    .filter((post) => +new Date(post.publishedAt) >= cutoff && profileMap.has(post.profileId))
    .map((post) => ({
      ...post,
      author: profileMap.get(post.profileId)!,
      engagement: post.reactions + post.comments * 2 + post.reposts * 3,
    }))
    .sort((a, b) => b.engagement - a.engagement);
  const topPosts = scoredPosts.slice(0, 12);
  const weeklyWinners = store.profiles.map((profile) => ({
    profile,
    post: scoredPosts.find(
      (post) => post.profileId === profile.id && +new Date(post.publishedAt) >= weeklyCutoff,
    ),
  }));
  const self = profiles.find((profile) => profile.isSelf);
  const peers = profiles.filter((profile) => !profile.isSelf);
  const refreshed = store.profiles.map((profile) => profile.lastRefreshedAt).filter(Boolean).sort().at(-1);

  return {
    range,
    generatedAt: new Date().toISOString(),
    isDemo: store.seededDemo,
    hasMonidKey: Boolean(process.env.MONID_API_KEY),
    lastRefreshedAt: refreshed,
    profiles,
    topPosts,
    weeklyWinners,
    summary: {
      selfGrowth: self?.growth || 0,
      selfGrowthPercent: self?.growthPercent || 0,
      peerMedianGrowthPercent: median(peers.map((profile) => profile.growthPercent)),
      selfPosts: self?.postsInRange || 0,
      selfRank: self?.rank || 0,
      totalProfiles: profiles.length,
      weeklyWinnerCount: weeklyWinners.filter((winner) => winner.post).length,
    },
  };
}
