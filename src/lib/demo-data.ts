// Toutes les données ci-dessous sont FICTIVES (démonstration).
// Seules les "sources" (équipes, joueurs, matchs + manches) sont saisies à la main ;
// ELO, victoires, défaites, rangs et variations sont DÉRIVÉS de l'historique.
import { START_ELO, applyDelta, eloDelta, eloLoss, isValidBo3 } from "./elo";

export type Player = { name: string; tag: string; role: string };
export type Team = {
  id: string; name: string; tag: string; region: string; color: string; players: Player[];
  elo: number; played: number; wins: number; losses: number;
};
export type Match = {
  id: string; a: string; b: string; rounds: [number, number][]; mode: string; date: string;
  winner: string; deltaWin: number; deltaLose: number; eloBefore: [number, number];
};

const roles = ["Capitaine", "Tank", "Support"];
const seedTeams: Omit<Team, "elo" | "played" | "wins" | "losses">[] = ([
  ["vortex", "Vortex Fangs", "VTX", "EU Ouest", "oklch(0.87 0.24 145)", ["Kryo", "Nébula", "Spike_Z"]],
  ["onyx", "Onyx Reapers", "ONX", "EU Centre", "oklch(0.72 0.14 200)", ["Zéphyr", "Mortis.exe", "Lumen"]],
  ["hydra", "Hydra Pulse", "HYD", "EU Ouest", "oklch(0.83 0.15 85)", ["Axel", "Vyper", "Oko"]],
  ["titan", "Titan Howl", "TTN", "EU Sud", "oklch(0.7 0.2 30)", ["Brakk", "Seren", "Juno"]],
  ["glitch", "Glitch Monarchs", "GLM", "EU Nord", "oklch(0.7 0.18 300)", ["Pixl", "Ravn", "Teo"]],
  ["ember", "Ember Wolves", "EMB", "EU Ouest", "oklch(0.75 0.18 50)", ["Ash", "Kenzo", "Milo"]],
  ["frost", "Frostbite Crew", "FRB", "EU Nord", "oklch(0.8 0.1 230)", ["Yeti", "Nova", "Siko"]],
  ["neon", "Neon Ghouls", "NGH", "EU Centre", "oklch(0.85 0.2 160)", ["Wisp", "Drax", "Lila"]],
  ["rogue", "Rogue Signal", "RGS", "EU Sud", "oklch(0.68 0.2 10)", ["Kai", "Venn", "Rook"]],
  ["drift", "Drift Kings", "DFK", "EU Ouest", "oklch(0.78 0.12 120)", ["Nox", "Ezra", "Pip"]],
] as const).map(([id, name, tag, region, color, ps]) => ({
  id, name, tag, region, color,
  players: ps.map((p, i) => ({ name: p, tag: `#DEMO${tag}${i + 1}`, role: roles[i] ?? "Joueur" })),
}));

const modes = ["Razzia de gemmes", "Brawl Ball", "Prime", "Zone réservée", "Braquage"];
// Historique fictif, du plus ANCIEN au plus récent. Lettres = vainqueur de chaque manche.
const rawMatches: [string, string, string][] = [
  ["vortex", "drift", "aa"], ["onyx", "rogue", "aba"], ["hydra", "neon", "aa"], ["titan", "frost", "bab"],
  ["glitch", "ember", "aa"], ["vortex", "titan", "aba"], ["onyx", "glitch", "aa"], ["hydra", "ember", "baa"],
  ["frost", "drift", "aa"], ["neon", "rogue", "abb"], ["onyx", "hydra", "aa"], ["glitch", "frost", "bb"],
  ["vortex", "hydra", "aba"], ["onyx", "titan", "aa"], ["glitch", "ember", "abb"], ["frost", "neon", "aba"],
  ["vortex", "onyx", "aa"], ["rogue", "drift", "aa"], ["titan", "glitch", "abb"], ["neon", "ember", "bab"],
];

function build() {
  const elo = new Map(seedTeams.map((t) => [t.id, START_ELO]));
  const rec = new Map(seedTeams.map((t) => [t.id, { w: 0, l: 0 }]));
  const ms: Match[] = rawMatches.map(([a, b, seq], i) => {
    const winners = [...seq] as ("a" | "b")[];
    if (!isValidBo3(winners)) throw new Error(`BO3 invalide : match ${i + 1}`);
    const rounds = winners.map((w) => (w === "a" ? [1, 0] : [0, 1]) as [number, number]);
    const aWins = winners.filter((w) => w === "a").length === 2;
    const [winner, loser] = aWins ? [a, b] : [b, a];
    const before: [number, number] = [elo.get(a)!, elo.get(b)!];
    // Les deux variations partent des ELO avant le match, chacune avec le K
    // propre à l'équipe (selon ses matchs déjà joués), plancher à 0 appliqué séparément.
    const playedW = rec.get(winner)!.w + rec.get(winner)!.l;
    const playedL = rec.get(loser)!.w + rec.get(loser)!.l;
    const deltaWin = eloDelta(before[aWins ? 0 : 1], before[aWins ? 1 : 0], playedW);
    const deltaLose = eloLoss(before[aWins ? 0 : 1], before[aWins ? 1 : 0], playedL);
    elo.set(winner, applyDelta(elo.get(winner)!, deltaWin));
    elo.set(loser, applyDelta(elo.get(loser)!, -deltaLose));
    rec.get(winner)!.w++; rec.get(loser)!.l++;
    const day = 5 + Math.floor(i / 2);
    return { id: `m${i + 1}`, a, b, rounds, mode: modes[i % modes.length]!, date: `${day} oct. 2026`, winner, deltaWin, deltaLose, eloBefore: before };
  });
  const ts: Team[] = seedTeams.map((t) => {
    const r = rec.get(t.id)!;
    return { ...t, elo: elo.get(t.id)!, wins: r.w, losses: r.l, played: r.w + r.l };
  });
  return { teams: ts, matches: ms.reverse() }; // affichage : plus récent d'abord
}

const built = build();
export const teams = built.teams;
export const matches = built.matches;

export const ranked = [...teams].sort((a, b) => b.elo - a.elo || b.wins - a.wins);
export const findTeam = (id: string) => teams.find((t) => t.id === id);
export const teamById = (id: string) => findTeam(id)!;
export const rankOf = (id: string) => ranked.findIndex((t) => t.id === id) + 1;
export const matchesOf = (id: string) => matches.filter((m) => m.a === id || m.b === id);
export const matchScore = (m: Match) => m.rounds.reduce(([x, y], [p, q]) => [x + p, y + q], [0, 0]);
export const matchWinner = (m: Match) => m.winner;

const players = teams.reduce((n, t) => n + t.players.length, 0);
export const platformStats = [
  { label: "Équipes (démo)", value: String(teams.length) },
  { label: "Matchs simulés", value: String(matches.length) },
  { label: "Joueurs (démo)", value: String(players) },
  { label: "ELO moyen", value: String(Math.round(teams.reduce((s, t) => s + t.elo, 0) / teams.length)) },
];

// File d'attente fictive : la plage ELO dérive de l'ELO de l'équipe.
export const queue = [["rogue", "0:42"], ["drift", "1:15"], ["neon", "2:03"], ["frost", "3:28"]].map(([team, wait]) => {
  const e = teamById(team!).elo;
  return { team: team!, wait: wait!, range: `${Math.max(0, e - 50)}–${e + 50}` };
});

export const bo3Maps = [
  { mode: "Razzia de gemmes", map: "Mine de cristal" },
  { mode: "Brawl Ball", map: "Terrain central" },
  { mode: "Prime", map: "Canyon des primes" },
];
