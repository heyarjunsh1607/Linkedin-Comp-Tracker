import { describe, expect, it } from "vitest";
import { canonicalLinkedInUrl, createStarterStore } from "@/lib/watchlist";

describe("saved LinkedIn watchlist", () => {
  it("contains the supplied profiles plus Arjun", () => {
    const store = createStarterStore();

    expect(store.profiles).toHaveLength(14);
    expect(store.profiles.map((profile) => profile.name)).toEqual([
      "Arjun Sharma", "Cam Trew", "Charles Floate", "Diandra Escobar", "Harry Phokou", "Jake Ward", "Joe Davies",
      "Justin Welsh", "Kate Sotsenko", "Lara Acosta", "Martin Zarian", "Matt Lakajev", "Richard Moore", "Sahil Bloom",
    ]);
  });

  it("normalizes recent-activity links to canonical profile URLs", () => {
    expect(canonicalLinkedInUrl("https://www.linkedin.com/in/justinwelsh/recent-activity/all/"))
      .toBe("https://www.linkedin.com/in/justinwelsh");
  });
});
