import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addProfile, readStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { canonicalLinkedInUrl } from "@/lib/watchlist";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  headline: z.string().trim().max(140).default(""),
  linkedinUrl: z.string().url().regex(/^https?:\/\/(?:[a-z]+\.)?linkedin\.com\/in\//i, "Use a LinkedIn personal profile URL."),
  isSelf: z.boolean().default(false),
});

export async function GET() {
  return NextResponse.json((await readStore()).profiles);
}

export async function POST(request: NextRequest) {
  const result = schema.safeParse(await request.json().catch(() => ({})));
  if (!result.success) return NextResponse.json({ error: result.error.issues[0]?.message }, { status: 400 });
  const store = await readStore();
  const linkedinUrl = canonicalLinkedInUrl(result.data.linkedinUrl);
  if (store.profiles.some((profile) => canonicalLinkedInUrl(profile.linkedinUrl) === linkedinUrl)) {
    return NextResponse.json({ error: "That LinkedIn profile is already tracked." }, { status: 409 });
  }
  const colors = ["#1769e0", "#e3572b", "#8b5cf6", "#119c7e", "#d59a00", "#d94684"];
  const profile: Profile = {
    id: crypto.randomUUID(),
    ...result.data,
    linkedinUrl,
    accent: colors[store.profiles.length % colors.length],
    createdAt: new Date().toISOString(),
  };
  await addProfile(profile);
  return NextResponse.json(profile, { status: 201 });
}
