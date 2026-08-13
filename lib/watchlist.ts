import type { Profile, TrackerStore } from "@/lib/types";

const ACCENTS = [
  "#1d4ed8",
  "#c2410c",
  "#6d28d9",
  "#047857",
  "#92400e",
  "#be185d",
  "#0f766e",
  "#6d28d9",
  "#9a3412",
  "#075985",
  "#9f1239",
  "#4338ca",
  "#166534",
  "#172035",
];

const WATCHLIST = [
  { name: "Arjun Sharma", slug: "arjunsh1607", isSelf: true },
  { name: "Cam Trew", slug: "camerontrew" },
  { name: "Charles Floate", slug: "charlesfloate" },
  { name: "Diandra Escobar", slug: "diandraescobar" },
  { name: "Harry Phokou", slug: "hphokou" },
  { name: "Jake Ward", slug: "jakezward" },
  { name: "Joe Davies", slug: "joe-davies-seo" },
  { name: "Justin Welsh", slug: "justinwelsh" },
  { name: "Kate Sotsenko", slug: "kate-sotsenko-thegoodbusy" },
  { name: "Lara Acosta", slug: "laraacostar" },
  { name: "Martin Zarian", slug: "martinzarian" },
  { name: "Matt Lakajev", slug: "mattlakajev" },
  { name: "Richard Moore", slug: "richardjamesmoore" },
  { name: "Sahil Bloom", slug: "sahilbloom" },
] as const;

export function canonicalLinkedInUrl(value: string) {
  const slug = value.match(/linkedin\.com\/in\/([^/?#]+)/i)?.[1];
  return slug ? `https://www.linkedin.com/in/${slug.toLowerCase()}` : value.replace(/\/$/, "");
}

export function watchlistProfiles(createdAt = new Date().toISOString()): Profile[] {
  return WATCHLIST.map((person, index) => ({
    id: `watch-${person.slug}`,
    name: person.name,
    headline: "",
    linkedinUrl: `https://www.linkedin.com/in/${person.slug}`,
    accent: ACCENTS[index],
    isSelf: "isSelf" in person && person.isSelf,
    createdAt,
  }));
}

export function createStarterStore(): TrackerStore {
  return {
    version: 1,
    seededDemo: false,
    profiles: watchlistProfiles(),
    snapshots: [],
    posts: [],
  };
}

export function mergeWatchlist(store: TrackerStore): TrackerStore {
  const existing = new Map(
    store.profiles.map((profile) => [canonicalLinkedInUrl(profile.linkedinUrl), profile]),
  );
  const profiles = watchlistProfiles().map((saved) => {
    const current = existing.get(saved.linkedinUrl);
    return current ? { ...current, name: saved.name, linkedinUrl: saved.linkedinUrl, accent: saved.accent, isSelf: saved.isSelf } : saved;
  });
  const savedUrls = new Set(profiles.map((profile) => profile.linkedinUrl));

  for (const profile of store.profiles) {
    const linkedinUrl = canonicalLinkedInUrl(profile.linkedinUrl);
    if (!savedUrls.has(linkedinUrl)) profiles.push({ ...profile, linkedinUrl });
  }

  return { ...store, seededDemo: false, profiles };
}
