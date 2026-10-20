// Règles ELO de la maquette (simulation locale, pas de calcul serveur).
// Départ à 0, plancher à 0, K = 40 pour les 10 premiers matchs classés de
// chaque équipe, puis K = 24. Les deux variations sont calculées à partir
// des ELO AVANT le match, puis le plancher est appliqué séparément.
export const START_ELO = 0;
export const K_NEW = 40;
export const K_STD = 24;
export const PROVISIONAL_MATCHES = 10;

/** Probabilité de victoire attendue de A face à B (formule ELO standard). */
export const expected = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400));

/** Facteur K selon le nombre de matchs classés déjà joués par l'équipe. */
export const kFor = (played: number) => (played < PROVISIONAL_MATCHES ? K_NEW : K_STD);

/** Gain d'ELO du vainqueur, selon SON nombre de matchs joués. */
export const eloDelta = (winner: number, loser: number, winnerPlayed: number) =>
  Math.round(kFor(winnerPlayed) * (1 - expected(winner, loser)));

/** Perte d'ELO du perdant, selon SON nombre de matchs joués. */
export const eloLoss = (winner: number, loser: number, loserPlayed: number) =>
  Math.round(kFor(loserPlayed) * expected(loser, winner));

/** Applique une variation sans jamais descendre sous zéro. */
export const applyDelta = (elo: number, delta: number) => Math.max(0, elo + delta);

/** Un BO3 valide : il s'arrête dès qu'une équipe atteint 2 manches. winners = suite de "a" | "b". */
export function isValidBo3(winners: ("a" | "b")[]) {
  let a = 0, b = 0;
  for (const w of winners) {
    if (a === 2 || b === 2) return false; // manche jouée après la fin
    if (w === "a") a++; else b++;
  }
  return a === 2 || b === 2;
}
