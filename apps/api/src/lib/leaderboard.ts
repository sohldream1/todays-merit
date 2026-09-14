import type { LeaderboardEntry } from "@todays-merit/shared-types";

export interface Standing {
  user: { id: string; firstName: string; lastName: string };
  verifiedHours: number;
}

// Sports-style ranking: ties share a rank, and the rank after a tie skips
// ahead by the number tied (1, 2, 2, 4) rather than compressing (1, 2, 2, 3)
// — this is Olympic-medal-table behavior (two golds, no silver, next is
// bronze). Ties are broken by first name for a stable display order only;
// they still report the same rank number.
export function rankStandings(standings: Standing[]): LeaderboardEntry[] {
  const sorted = [...standings].sort(
    (a, b) => b.verifiedHours - a.verifiedHours || a.user.firstName.localeCompare(b.user.firstName),
  );

  const entries: LeaderboardEntry[] = sorted.map((s, i) => ({
    rank: i > 0 && s.verifiedHours === sorted[i - 1].verifiedHours ? -1 : i + 1,
    user: s.user,
    verifiedHours: s.verifiedHours,
  }));
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].rank === -1) entries[i].rank = entries[i - 1].rank;
  }
  return entries;
}
