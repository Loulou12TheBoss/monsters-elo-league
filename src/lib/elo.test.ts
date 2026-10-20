import { describe, expect, it } from "vitest";
import { K_NEW, K_STD, START_ELO, applyDelta, eloDelta, eloLoss, isValidBo3, kFor } from "./elo";
import { matches, ranked, teams, matchScore } from "./demo-data";

describe("ELO", () => {
  it("départ à 0, K=40 puis K=24 après 10 matchs", () => {
    expect(START_ELO).toBe(0);
    expect(kFor(0)).toBe(K_NEW);
    expect(kFor(9)).toBe(K_NEW);
    expect(kFor(10)).toBe(K_STD);
  });
  it("équipes de même ELO : +20 avec K=40, +12 avec K=24", () => {
    expect(eloDelta(0, 0, 0)).toBe(20);
    expect(eloDelta(100, 100, 10)).toBe(12);
  });
  it("la perte du perdant utilise son propre K", () => {
    expect(eloLoss(0, 0, 0)).toBe(20);
    expect(eloLoss(100, 100, 12)).toBe(12);
  });
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
  it("aucun ELO n'est négatif et chaque match a des variations positives", () => {
    for (const t of teams) expect(t.elo).toBeGreaterThanOrEqual(0);
    for (const m of matches) {
      expect(m.deltaWin).toBeGreaterThan(0);
      expect(m.deltaLose).toBeGreaterThan(0);
    }
  });
});
