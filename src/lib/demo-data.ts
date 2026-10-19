// Toutes les données ci-dessous sont FICTIVES (démonstration).
export type Team = {
  id: string; name: string; tag: string; elo: number; played: number; wins: number; losses: number;
  region: string; color: string; players: { name: string; tag: string; role: string }[];
};

const mk = (id: string, name: string, tag: string, elo: number, wins: number, losses: number, region: string, color: string, players: string[]): Team => ({
  id, name, tag, elo, wins, losses, played: wins + losses, region, color,
  players: players.map((p, i) => ({ name: p, tag: `#DEMO${(id.length * 7 + i * 13).toString(36).toUpperCase()}${i}X`, role: ["Capitaine", "Tank", "Support"][i] ?? "Joueur" })),
});

export const teams: Team[] = [
  mk("vortex", "Vortex Fangs", "VTX", 2184, 41, 9, "EU Ouest", "oklch(0.87 0.24 145)", ["Kryo", "Nébula", "Spike_Z"]),
  mk("onyx", "Onyx Reapers", "ONX", 2097, 38, 12, "EU Centre", "oklch(0.72 0.14 200)", ["Zéphyr", "Mortis.exe", "Lumen"]),
  mk("hydra", "Hydra Pulse", "HYD", 2031, 35, 14, "EU Ouest", "oklch(0.83 0.15 85)", ["Axel", "Vyper", "Oko"]),
  mk("titan", "Titan Howl", "TTN", 1968, 33, 16, "EU Sud", "oklch(0.7 0.2 30)", ["Brakk", "Seren", "Juno"]),
  mk("glitch", "Glitch Monarchs", "GLM", 1912, 30, 18, "EU Nord", "oklch(0.7 0.18 300)", ["Pixl", "Ravn", "Teo"]),
  mk("ember", "Ember Wolves", "EMB", 1874, 28, 19, "EU Ouest", "oklch(0.75 0.18 50)", ["Ash", "Kenzo", "Milo"]),
  mk("frost", "Frostbite Crew", "FRB", 1831, 26, 21, "EU Nord", "oklch(0.8 0.1 230)", ["Yeti", "Nova", "Siko"]),
  mk("neon", "Neon Ghouls", "NGH", 1790, 24, 22, "EU Centre", "oklch(0.85 0.2 160)", ["Wisp", "Drax", "Lila"]),
  mk("rogue", "Rogue Signal", "RGS", 1745, 21, 24, "EU Sud", "oklch(0.68 0.2 10)", ["Kai", "Venn", "Rook"]),
  mk("drift", "Drift Kings", "DFK", 1702, 19, 26, "EU Ouest", "oklch(0.78 0.12 120)", ["Nox", "Ezra", "Pip"]),
];

export const ranked = [...teams].sort((a, b) => b.elo - a.elo);
export const findTeam = (id: string) => teams.find((t) => t.id === id);
export const teamById = (id: string) => findTeam(id)!;

export const recentMatches = [
  { a: "vortex", b: "hydra", score: [2, 1] as [number, number], delta: 14, mode: "Razzia de gemmes", ago: "il y a 12 min" },
  { a: "onyx", b: "titan", score: [2, 0] as [number, number], delta: 11, mode: "Brawl Ball", ago: "il y a 27 min" },
  { a: "glitch", b: "ember", score: [1, 2] as [number, number], delta: 16, mode: "Prime", ago: "il y a 41 min" },
  { a: "frost", b: "neon", score: [2, 1] as [number, number], delta: 9, mode: "Zone réservée", ago: "il y a 1 h" },
];

export const platformStats = [
  { label: "Équipes inscrites", value: "128" },
  { label: "Matchs joués", value: "3 412" },
  { label: "Joueurs actifs", value: "384" },
  { label: "ELO moyen", value: "1 540" },
];

export const queue = [
  { team: "rogue", wait: "0:42", range: "1700–1800" },
  { team: "drift", wait: "1:15", range: "1650–1750" },
  { team: "neon", wait: "2:03", range: "1740–1840" },
  { team: "frost", wait: "3:28", range: "1780–1880" },
];

export const bo3Maps = [
  { mode: "Razzia de gemmes", map: "Mine de cristal" },
  { mode: "Brawl Ball", map: "Terrain central" },
  { mode: "Prime", map: "Canyon des primes" },
];

export type Match = { id: string; a: string; b: string; rounds: [number, number][]; delta: number; mode: string; date: string };

const modes = ["Razzia de gemmes", "Brawl Ball", "Prime", "Zone réservée", "Braquage"];
const pairs: [string, string, number[]][] = [
  ["vortex", "hydra", [1, 0, 1]], ["onyx", "titan", [1, 1]], ["glitch", "ember", [0, 1, 0]], ["frost", "neon", [1, 0, 1]],
  ["vortex", "onyx", [1, 1]], ["hydra", "titan", [0, 1, 1]], ["rogue", "drift", [1, 1]], ["ember", "frost", [1, 0, 0]],
  ["neon", "rogue", [0, 0]], ["glitch", "vortex", [0, 1, 0]], ["titan", "drift", [1, 1]], ["onyx", "hydra", [1, 0, 0]],
];
// Matchs simulés : rounds[i] = [scoreA, scoreB] d'une manche (1 = manche gagnée par A).
export const matches: Match[] = pairs.map(([a, b, r], i) => ({
  id: `m${i + 1}`, a, b,
  rounds: r.map((w) => (w ? [1, 0] : [0, 1]) as [number, number]),
  delta: 8 + ((i * 5) % 10), mode: modes[i % modes.length]!,
  date: `${19 - Math.floor(i / 3)} oct. 2026`,
}));
export const matchScore = (m: Match) => m.rounds.reduce(([x, y], [p, q]) => [x + p, y + q], [0, 0]);
export const matchWinner = (m: Match) => { const [x, y] = matchScore(m); return x > y ? m.a : m.b; };
export const matchesOf = (id: string) => matches.filter((m) => m.a === id || m.b === id);
export const rankOf = (id: string) => ranked.findIndex((t) => t.id === id) + 1;
