import type { LinkedInPost, Profile, Snapshot } from "@/lib/types";

const API_BASE = "https://api.monid.ai/v1";
const POLL_INTERVAL = 2_000;
const POLL_TIMEOUT = 120_000;

type MonidRun = {
  runId: string;
  status: "READY" | "RUNNING" | "COMPLETED" | "FAILED" | "BLOCKED" | "STOPPED" | "TIME_OUT";
  output?: unknown;
  providerResponse?: { httpStatus?: number; error?: unknown };
};

function key() {
  if (!process.env.MONID_API_KEY) throw new Error("MONID_API_KEY is not configured.");
  return process.env.MONID_API_KEY;
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 202) {
    throw new Error((data as { message?: string }).message || `Monid returned HTTP ${response.status}.`);
  }
  return data as MonidRun;
}

async function run(provider: string, endpoint: string, input: Record<string, unknown>) {
  let result = await request("/run", {
    method: "POST",
    body: JSON.stringify({ provider, endpoint, input }),
  });
  if (result.status === "COMPLETED") return checkResult(result);

  const started = Date.now();
  while (result.status === "READY" || result.status === "RUNNING") {
    if (Date.now() - started > POLL_TIMEOUT) throw new Error(`Monid run ${result.runId} timed out.`);
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    result = await request(`/runs/${result.runId}`);
  }
  return checkResult(result);
}

function checkResult(result: MonidRun) {
  if (result.status !== "COMPLETED") {
    throw new Error(`Monid run ${result.runId} ended with status ${result.status}.`);
  }
  const status = result.providerResponse?.httpStatus || 200;
  if (status >= 400) throw new Error(`Monid provider returned HTTP ${status}.`);
  return result.output;
}

function firstObject(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return firstObject(value[0]);
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    for (const field of ["data", "result", "profile", "items"]) {
      if (object[field]) return firstObject(object[field]);
    }
    return object;
  }
  return {};
}

function outputItems(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === "object") as Record<string, unknown>[];
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    for (const field of ["data", "items", "results", "posts", "output"]) {
      if (object[field]) return outputItems(object[field]);
    }
  }
  return [];
}

function text(record: Record<string, unknown>, keys: string[], fallback = "") {
  for (const field of keys) if (typeof record[field] === "string" && record[field]) return String(record[field]);
  return fallback;
}

function number(record: Record<string, unknown>, keys: string[]) {
  for (const field of keys) {
    const value = record[field];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

export async function fetchProfile(profile: Profile): Promise<{ profile: Profile; snapshot: Snapshot }> {
  const provider = process.env.MONID_PROFILE_PROVIDER || "tikhub";
  const endpoint = process.env.MONID_PROFILE_ENDPOINT || "/api/v1/linkedin/web_v2/get_user_profile";
  const output = await run(provider, endpoint, {
    queryParams: { url: profile.linkedinUrl },
  });
  const data = firstObject(output);
  const now = new Date().toISOString();
  const followers = number(data, ["followers", "followers_count", "follower_count", "followerCount", "numFollowers"]);
  if (!followers) throw new Error(`No follower count returned for ${profile.name}. Inspect the configured Monid profile endpoint.`);

  return {
    profile: {
      ...profile,
      name: text(data, ["full_name", "fullName", "name"], profile.name),
      headline: text(data, ["headline", "occupation", "position", "title"], profile.headline),
      avatarUrl: text(data, ["profile_picture", "profilePicture", "avatar", "avatarUrl", "photo"], profile.avatarUrl),
      lastRefreshedAt: now,
    },
    snapshot: {
      id: crypto.randomUUID(),
      profileId: profile.id,
      capturedAt: now,
      followers,
      connections: number(data, ["connections", "connections_count", "connectionCount"]) || undefined,
    },
  };
}

function mediaType(record: Record<string, unknown>): LinkedInPost["mediaType"] {
  const value = text(record, ["contentType", "mediaType", "type"], "text").toLowerCase();
  if (value.includes("video")) return "video";
  if (value.includes("document") || value.includes("carousel")) return "document";
  if (value.includes("image") || record.image || record.images) return "image";
  if (value.includes("link") || record.article) return "link";
  return "text";
}

function postProfileId(record: Record<string, unknown>, profiles: Profile[], fallbackProfileId?: string) {
  const url = text(record, ["poster_linkedin_url", "authorProfileUrl", "authorLinkedInUrl", "profileUrl", "linkedinUrl"]);
  const slug = url.match(/linkedin\.com\/in\/([^/?#]+)/i)?.[1]?.toLowerCase();
  if (slug) return profiles.find((profile) => profile.linkedinUrl.toLowerCase().includes(`/in/${slug}`))?.id;
  const author = record.author || record.poster;
  if (author && typeof author === "object") {
    return postProfileId(author as Record<string, unknown>, profiles, fallbackProfileId);
  }
  const name = text(record, ["authorFullName", "authorName", "name"]).toLowerCase();
  return profiles.find((profile) => profile.name.toLowerCase() === name)?.id || fallbackProfileId;
}

function isAuthoredBy(record: Record<string, unknown>, profile: Profile) {
  const directUrl = text(record, ["poster_linkedin_url", "authorProfileUrl", "authorLinkedInUrl", "profileUrl", "linkedinUrl"]);
  const nested = record.author || record.poster;
  const nestedUrl = nested && typeof nested === "object"
    ? text(nested as Record<string, unknown>, ["linkedin_url", "linkedinUrl", "profileUrl", "url"])
    : "";
  const authorSlug = (directUrl || nestedUrl).match(/linkedin\.com\/in\/([^/?#]+)/i)?.[1]?.toLowerCase();
  const profileSlug = profile.linkedinUrl.match(/linkedin\.com\/in\/([^/?#]+)/i)?.[1]?.toLowerCase();
  return !authorSlug || !profileSlug || authorSlug === profileSlug;
}

function publishedAt(record: Record<string, unknown>, fallback: string, keys = ["posted", "posted_at", "postedAtISO", "publishedAt", "createdAt", "date"]) {
  const value = text(record, keys, fallback);
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  const parsed = new Date(normalized);
  return Number.isNaN(+parsed) ? fallback : parsed.toISOString();
}

export async function fetchPosts(profiles: Profile[]): Promise<LinkedInPost[]> {
  if (!profiles.length) return [];
  const provider = process.env.MONID_POSTS_PROVIDER || "tikhub";
  const endpoint = process.env.MONID_POSTS_ENDPOINT || "/api/v1/linkedin/web_v2/get_user_posts";
  const fetchedAt = new Date().toISOString();
  const cutoff = Date.now() - 31 * 86_400_000;
  const perProfile = await Promise.all(profiles.map(async (profile) => {
    const output = await run(provider, endpoint, {
      queryParams: { url: profile.linkedinUrl, type: "posts", start: 0 },
    });
    const normalized = outputItems(output).flatMap((record, index) => {
      const resharerComment = text(record, ["resharer_comment", "resharerComment"]).trim();
      const isCommentedReshare = record.reshared === true && Boolean(resharerComment);
      if ((record.reshared === true && !isCommentedReshare) || (!isCommentedReshare && !isAuthoredBy(record, profile))) return [];
      const profileId = isCommentedReshare ? profile.id : postProfileId(record, profiles, profile.id) || profile.id;
      const repostStats = record.repost_stats && typeof record.repost_stats === "object"
        ? record.repost_stats as Record<string, unknown>
        : undefined;
      const engagement = isCommentedReshare && repostStats
        ? repostStats
        : record.engagement && typeof record.engagement === "object"
        ? (record.engagement as Record<string, unknown>)
        : record;
      const publishedDate = publishedAt(record, fetchedAt, isCommentedReshare ? ["reposted"] : undefined);
      if (+new Date(publishedDate) < cutoff) return [];
      const id = text(record, isCommentedReshare ? ["repost_urn", "repostUrn"] : ["urn", "id", "postId", "activityId"], `${profileId}-${publishedDate}-${index}`);
      return [{
        id,
        profileId,
        url: isCommentedReshare && id
          ? `https://www.linkedin.com/feed/update/urn:li:activity:${id}/`
          : text(record, ["post_url", "url", "postUrl", "shareUrl"], "#"),
        text: isCommentedReshare ? resharerComment : text(record, ["content", "text", "commentary"], "LinkedIn post"),
        publishedAt: publishedDate,
        reactions: number(engagement, ["num_reactions", "total_reactions", "reactions", "numLikes", "likes", "reactionCount"]),
        comments: number(engagement, ["num_comments", "comments", "numComments", "commentCount"]),
        reposts: number(engagement, ["num_reposts", "shares", "reposts", "numShares", "shareCount"]),
        mediaType: mediaType(record),
        fetchedAt,
      } satisfies LinkedInPost];
    });
    return [...new Map(normalized.map((post) => [post.id, post])).values()].slice(0, 15);
  }));
  return perProfile.flat();
}
