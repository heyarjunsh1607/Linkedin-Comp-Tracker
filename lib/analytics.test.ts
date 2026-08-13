import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildDashboard } from "@/lib/analytics";
import type { LinkedInPost, TrackerStore } from "@/lib/types";
import { createStarterStore } from "@/lib/watchlist";

function populatedStore(): TrackerStore {
  const store = createStarterStore();
  const arjun = store.profiles.find((profile) => profile.isSelf)!;
  const justin = store.profiles.find((profile) => profile.name === "Justin Welsh")!;
  store.snapshots = [
    { id: "arjun-old", profileId: arjun.id, capturedAt: "2026-07-20T08:00:00.000Z", followers: 900 },
    { id: "arjun-new", profileId: arjun.id, capturedAt: "2026-08-14T08:00:00.000Z", followers: 930 },
    { id: "justin-old", profileId: justin.id, capturedAt: "2026-07-20T08:00:00.000Z", followers: 870_000 },
    { id: "justin-new", profileId: justin.id, capturedAt: "2026-08-14T08:00:00.000Z", followers: 875_000 },
  ];
  const posts: LinkedInPost[] = [
    { id: "arjun-1", profileId: arjun.id, url: "https://linkedin.com/post/arjun", text: "Arjun post", publishedAt: "2026-08-12T08:00:00.000Z", reactions: 20, comments: 3, reposts: 1, mediaType: "text", fetchedAt: "2026-08-14T08:00:00.000Z" },
    { id: "justin-low", profileId: justin.id, url: "https://linkedin.com/post/low", text: "Lower post", publishedAt: "2026-08-11T08:00:00.000Z", reactions: 100, comments: 5, reposts: 1, mediaType: "text", fetchedAt: "2026-08-14T08:00:00.000Z" },
    { id: "justin-high", profileId: justin.id, url: "https://linkedin.com/post/high", text: "Winning post", publishedAt: "2026-08-13T08:00:00.000Z", reactions: 100, comments: 20, reposts: 10, mediaType: "text", fetchedAt: "2026-08-14T08:00:00.000Z" },
  ];
  store.posts = posts;
  return store;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-14T12:00:00.000Z"));
});

afterEach(() => vi.useRealTimers());

describe("buildDashboard", () => {
  it("uses the saved 14-person watchlist and computes audience growth", () => {
    const result = buildDashboard(populatedStore(), 30);
    const self = result.profiles.find((profile) => profile.isSelf);

    expect(result.profiles).toHaveLength(14);
    expect(self).toMatchObject({ followers: 930, growth: 30 });
    expect(result.summary.totalProfiles).toBe(14);
  });

  it("selects one highest-scoring weekly post per profile", () => {
    const result = buildDashboard(populatedStore(), 30);
    const justin = result.weeklyWinners.find((winner) => winner.profile.name === "Justin Welsh");

    expect(result.weeklyWinners).toHaveLength(14);
    expect(justin?.post).toMatchObject({ id: "justin-high", engagement: 170 });
    expect(result.summary.weeklyWinnerCount).toBe(2);
  });

  it("sorts the global post list using weighted engagement", () => {
    const result = buildDashboard(populatedStore(), 30);
    const scores = result.topPosts.map((post) => post.engagement);

    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });
});
