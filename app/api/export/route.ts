import { buildDashboard } from "@/lib/analytics";
import { readStore } from "@/lib/store";

function csvCell(value: string | number) {
  const escaped = String(value).replaceAll('"', '""');
  return `"${escaped}"`;
}

export async function GET() {
  const dashboard = buildDashboard(await readStore(), 90);
  const rows = [
    ["Name", "LinkedIn URL", "Followers", "90-day growth", "Growth %", "Posts", "Avg engagement", "Rank"],
    ...dashboard.profiles.map((profile) => [
      profile.name,
      profile.linkedinUrl,
      profile.followers,
      profile.growth,
      profile.growthPercent.toFixed(2),
      profile.postsInRange,
      profile.avgEngagement,
      profile.rank,
    ]),
  ];
  return new Response(rows.map((row) => row.map(csvCell).join(",")).join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="linkedin-benchmark-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
