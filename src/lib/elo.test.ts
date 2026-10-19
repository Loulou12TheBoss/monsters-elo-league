import { describe, expect, it } from "vitest";
import { applyDelta, eloDelta, isValidBo3 } from "./elo";
import { matches, ranked, teams, matchScore } from "./demo-data";

describe("ELO", () => {
  it("équipes de même ELO : +16 / −16 (K=32)", () => expect(eloDelta(1500, 1500)).toBe(16));
  it("l'ELO ne descend jamais sous zéro", () => expect(applyDelta(10, -16)).toBe(0));
});

describe("BO3", () => {
  it("se termine dès 2 manches gagnées", () => {
    expect(isValidBo3(["a", "a"])).toBe(true);
    expect(isValidBo3(["a", "b", "b"])).toBe(true);
    expect(isValidBo3(["a", "a", "b"])).toBe(false);
    expect(isValidBo3(["a", "b"])).toBe(false);
  });
  it("tous les matchs fictifs ont un score 2-0, 2-1, 0-2 ou 1-2", () => {
    for (const m of matches) expect(Math.max(...matchScore(m))).toBe(2);
  });
});

describe("Cohérence des données fictives", () => {
  it("V + D = matchs joués et correspond à l'historique", () => {
    for (const t of teams) {
      const mine = matches.filter((m) => m.a === t.id || m.b === t.id);
      expect(t.played).toBe(mine.length);
      expect(t.wins).toBe(mine.filter((m) => m.winner === t.id).length);
      expect(t.wins + t.losses).toBe(t.played);
    }
  });
  it("classement trié par ELO décroissant", () => {
    for (let i = 1; i < ranked.length; i++) expect(ranked[i - 1]!.elo).toBeGreaterThanOrEqual(ranked[i]!.elo);
  });
  it("la somme des ELO est conservée (gain = perte)", () => {
    expect(teams.reduce((s, t) => s + t.elo, 0)).toBe(1500 * teams.length);
  });
});
