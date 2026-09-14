import { describe, expect, it } from "vitest";
import { rankStandings, type Standing } from "./leaderboard.js";

function user(id: string, firstName: string): Standing["user"] {
  return { id, firstName, lastName: "Test" };
}

describe("rankStandings", () => {
  it("ranks strictly descending by verified hours", () => {
    const entries = rankStandings([
      { user: user("1", "Ann"), verifiedHours: 5 },
      { user: user("2", "Bo"), verifiedHours: 10 },
      { user: user("3", "Cy"), verifiedHours: 1 },
    ]);

    expect(entries.map((e) => e.user.id)).toEqual(["2", "1", "3"]);
    expect(entries.map((e) => e.rank)).toEqual([1, 2, 3]);
  });

  it("gives tied scores the same rank and skips the next rank by the tie size", () => {
    // Two tied at the top (both rank 1) — the next distinct score should
    // land on rank 3, not 2 (Olympic medal table: two golds, no silver).
    const entries = rankStandings([
      { user: user("1", "Ann"), verifiedHours: 10 },
      { user: user("2", "Sam"), verifiedHours: 10 },
      { user: user("3", "Cy"), verifiedHours: 5 },
      { user: user("4", "Dee"), verifiedHours: 0 },
    ]);

    expect(entries.map((e) => e.rank)).toEqual([1, 1, 3, 4]);
  });

  it("breaks ties for display order by first name, without changing the rank", () => {
    const entries = rankStandings([
      { user: user("1", "Swag"), verifiedHours: 10 },
      { user: user("2", "Sam"), verifiedHours: 10 },
    ]);

    expect(entries.map((e) => e.user.id)).toEqual(["2", "1"]);
    expect(entries.map((e) => e.rank)).toEqual([1, 1]);
  });

  it("handles a three-way tie followed by a distinct score", () => {
    const entries = rankStandings([
      { user: user("1", "Ann"), verifiedHours: 3 },
      { user: user("2", "Bo"), verifiedHours: 3 },
      { user: user("3", "Cy"), verifiedHours: 3 },
      { user: user("4", "Dee"), verifiedHours: 1 },
    ]);

    expect(entries.map((e) => e.rank)).toEqual([1, 1, 1, 4]);
  });

  it("gives everyone rank 1 when all scores are zero", () => {
    const entries = rankStandings([
      { user: user("1", "Ann"), verifiedHours: 0 },
      { user: user("2", "Bo"), verifiedHours: 0 },
    ]);

    expect(entries.map((e) => e.rank)).toEqual([1, 1]);
  });

  it("returns an empty leaderboard for no participants", () => {
    expect(rankStandings([])).toEqual([]);
  });
});
