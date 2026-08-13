import { describe, expect, it } from "vitest";
import { buildDashboard } from "@/lib/analytics";
import { createDemoStore } from "@/lib/demo";

describe("buildDashboard", () => {
  it("ranks profiles and computes a self benchmark", () => {
    const result = buildDashboard(createDemoStore(), 30);
    const self = result.profiles.find((profile) => profile.isSelf);

    expect(result.profiles).toHaveLength(5);
    expect(self?.followers).toBeGreaterThan(67_000);
    expect(self?.growth).toBeGreaterThan(0);
    expect(result.summary.selfRank).toBeGreaterThan(0);
    expect(result.summary.peerMedianGrowthPercent).toBeGreaterThan(0);
  });

  it("sorts top posts using the weighted engagement score", () => {
    const result = buildDashboard(createDemoStore(), 30);
    const scores = result.topPosts.map((post) => post.engagement);

    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(result.topPosts[0].author).toBeDefined();
  });

  it("changes posting cadence with the selected range", () => {
    const store = createDemoStore();
    const week = buildDashboard(store, 7);
    const month = buildDashboard(store, 30);

    expect(month.summary.selfPosts).toBeGreaterThanOrEqual(week.summary.selfPosts);
  });
});
