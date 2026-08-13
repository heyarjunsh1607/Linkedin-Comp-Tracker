import type { LinkedInPost, Profile, Snapshot, TrackerStore } from "@/lib/types";

const DAY = 86_400_000;
const accents = ["#1769e0", "#e3572b", "#8b5cf6", "#119c7e", "#d59a00"];

function isoDaysAgo(days: number, hour = 8) {
  const date = new Date(Date.now() - days * DAY);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

export function createDemoStore(): TrackerStore {
  const profiles: Profile[] = [
    ["you", "Arjun Sharma", "Founder, PIXELUP LABS", "arjun-sharma", true],
    ["liam", "Liam Carter", "B2B growth, minus the theatre", "liam-carter", false],
    ["maya", "Maya Chen", "Building category-defining brands", "maya-chen", false],
    ["noah", "Noah Williams", "SaaS, content and sharp opinions", "noah-williams", false],
    ["sara", "Sara Patel", "CMO · operator · occasional writer", "sara-patel", false],
  ].map(([id, name, headline, slug, isSelf], index) => ({
    id: String(id),
    name: String(name),
    headline: String(headline),
    linkedinUrl: `https://www.linkedin.com/in/${slug}`,
    accent: accents[index],
    isSelf: Boolean(isSelf),
    createdAt: isoDaysAgo(90),
    lastRefreshedAt: isoDaysAgo(0),
  }));

  const starts = [66_152, 82_460, 73_040, 59_850, 48_910];
  const daily = [28.3, 21.2, 34.5, 14.2, 23.7];
  const snapshots: Snapshot[] = [];

  for (let day = 90; day >= 0; day -= 1) {
    profiles.forEach((profile, index) => {
      const elapsed = 90 - day;
      const rhythm = Math.sin(elapsed / (3.8 + index)) * (8 + index * 3);
      const lift = elapsed > 58 && index === 0 ? (elapsed - 58) * 3.2 : 0;
      snapshots.push({
        id: `${profile.id}-${day}`,
        profileId: profile.id,
        capturedAt: isoDaysAgo(day),
        followers: Math.round(starts[index] + daily[index] * elapsed + rhythm + lift),
      });
    });
  }

  const seeds = [
    ["liam", 2, "Most B2B teams do not have a content problem. They have a point-of-view problem.", 1284, 87, 24, "text"],
    ["you", 4, "We rebuilt a checkout flow last month. The highest-impact change was the least impressive one.", 1106, 64, 17, "image"],
    ["maya", 7, "A category is not a tagline. It is the shortcut your buyer uses when they explain you to their team.", 948, 53, 31, "document"],
    ["sara", 11, "I reviewed 200 SaaS homepages. Here are the five patterns that made the good ones obvious.", 812, 46, 12, "document"],
    ["noah", 15, "The content calendar is often where original thinking goes to die.", 734, 71, 9, "text"],
    ["you", 18, "A client asked us to make the website feel more premium. That request is almost never about aesthetics.", 689, 39, 8, "video"],
    ["maya", 24, "Your competitors are not your positioning. They are context.", 641, 28, 7, "image"],
    ["liam", 28, "Posting every day did not grow my audience. Learning what I was willing to repeat did.", 577, 42, 6, "text"],
  ] as const;

  const posts: LinkedInPost[] = seeds.map(([profileId, days, text, reactions, comments, reposts, mediaType], index) => ({
    id: `demo-post-${index + 1}`,
    profileId,
    url: `https://www.linkedin.com/feed/update/urn:li:activity:demo${index + 1}`,
    text,
    publishedAt: isoDaysAgo(days, 12),
    reactions,
    comments,
    reposts,
    mediaType,
    fetchedAt: isoDaysAgo(0),
  }));

  return { version: 1, seededDemo: true, profiles, snapshots, posts };
}
