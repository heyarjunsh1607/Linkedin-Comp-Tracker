export type Profile = {
  id: string;
  name: string;
  headline: string;
  linkedinUrl: string;
  avatarUrl?: string;
  accent: string;
  isSelf: boolean;
  createdAt: string;
  lastRefreshedAt?: string;
};

export type Snapshot = {
  id: string;
  profileId: string;
  capturedAt: string;
  followers: number;
  connections?: number;
};

export type LinkedInPost = {
  id: string;
  profileId: string;
  url: string;
  text: string;
  publishedAt: string;
  reactions: number;
  comments: number;
  reposts: number;
  mediaType: "text" | "image" | "video" | "document" | "link";
  fetchedAt: string;
};

export type TrackerStore = {
  version: 1;
  seededDemo: boolean;
  profiles: Profile[];
  snapshots: Snapshot[];
  posts: LinkedInPost[];
};

export type DashboardProfile = Profile & {
  followers: number;
  growth: number;
  growthPercent: number;
  postsInRange: number;
  avgEngagement: number;
  rank: number;
  history: Array<{ date: string; followers: number }>;
};

export type DashboardData = {
  range: number;
  generatedAt: string;
  isDemo: boolean;
  hasMonidKey: boolean;
  lastRefreshedAt?: string;
  profiles: DashboardProfile[];
  topPosts: ScoredPost[];
  weeklyWinners: Array<{ profile: Profile; post?: ScoredPost }>;
  summary: {
    selfGrowth: number;
    selfGrowthPercent: number;
    peerMedianGrowthPercent: number;
    selfPosts: number;
    selfRank: number;
    totalProfiles: number;
    weeklyWinnerCount: number;
  };
};

export type ScoredPost = LinkedInPost & { author: Profile; engagement: number };
