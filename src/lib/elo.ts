// Règles ELO de la maquette (simulation locale, pas de calcul serveur).
export const START_ELO = 1500;
export const K_FACTOR = 32;

/** Probabilité de victoire attendue de A face à B (formule ELO standard). */
export const expected = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400));

/** Variation d'ELO pour le vainqueur (le perdant perd le même montant). */
export const eloDelta = (winner: number, loser: number) => Math.round(K_FACTOR * (1 - expected(winner, loser)));

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
