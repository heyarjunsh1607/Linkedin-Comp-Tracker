import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPosts, fetchProfile } from "@/lib/monid";
import type { Profile } from "@/lib/types";

const profile: Profile = {
  id: "arjun",
  name: "Arjun Sharma",
  headline: "Founder",
  linkedinUrl: "https://www.linkedin.com/in/arjunsh1607",
  accent: "#1769e0",
  isSelf: true,
  createdAt: "2026-08-14T00:00:00.000Z",
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-14T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete process.env.MONID_API_KEY;
});

function completed(output: unknown) {
  process.env.MONID_API_KEY = "monid_live_test";
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
    runId: "run-1",
    status: "COMPLETED",
    providerResponse: { httpStatus: 200 },
    output,
  }), { status: 200 })));
}

describe("Monid LinkedIn normalization", () => {
  it("maps the current TikHub profile payload", async () => {
    completed({
      name: "Arjun Sharma",
      position: "Inbound Engineer",
      avatar: "https://example.com/arjun.jpg",
      followers: 909,
      connections: 500,
    });

    const result = await fetchProfile(profile);

    expect(result.profile).toMatchObject({
      name: "Arjun Sharma",
      headline: "Inbound Engineer",
      avatarUrl: "https://example.com/arjun.jpg",
    });
    expect(result.snapshot).toMatchObject({ followers: 909, connections: 500 });
  });

  it("maps and deduplicates the current TikHub post payload", async () => {
    const post = {
      urn: "7493577092979142656",
      post_url: "https://www.linkedin.com/feed/update/urn:li:activity:7493577092979142656/",
      posted: "2026-08-13 08:00:02",
      text: "A useful post",
      num_reactions: 7,
      num_comments: 3,
      num_reposts: 1,
      poster_linkedin_url: profile.linkedinUrl,
      images: [{ url: "https://example.com/post.jpg" }],
    };
    completed({ data: [post, { ...post }] });

    const posts = await fetchPosts([profile]);

    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      id: post.urn,
      profileId: profile.id,
      url: post.post_url,
      publishedAt: "2026-08-13T08:00:02.000Z",
      reactions: 7,
      comments: 3,
      reposts: 1,
      mediaType: "image",
    });
  });

  it("reports terminal Monid run statuses", async () => {
    process.env.MONID_API_KEY = "monid_live_test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      runId: "run-blocked",
      status: "BLOCKED",
    }), { status: 200 })));

    await expect(fetchProfile(profile)).rejects.toThrow("ended with status BLOCKED");
  });
});
