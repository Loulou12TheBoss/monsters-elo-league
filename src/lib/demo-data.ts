// Toutes les données ci-dessous sont FICTIVES (démonstration).
export type Team = {
  id: string; name: string; tag: string; elo: number; played: number; wins: number; losses: number;
  region: string; color: string; players: { name: string; tag: string; role: string }[];
};

const mk = (id: string, name: string, tag: string, elo: number, wins: number, losses: number, region: string, color: string, players: string[]): Team => ({
  id, name, tag, elo, wins, losses, played: wins + losses, region, color,
  players: players.map((p, i) => ({ name: p, tag: `#DEMO${(id.length * 7 + i * 13).toString(36).toUpperCase()}${i}X`, role: ["Capitaine", "Tank", "Support"][i] })),
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
export const teamById = (id: string) => teams.find((t) => t.id === id)!;

export const recentMatches = [
  { a: "vortex", b: "hydra", score: [2, 1], delta: 14, mode: "Razzia de gemmes", ago: "il y a 12 min" },
  { a: "onyx", b: "titan", score: [2, 0], delta: 11, mode: "Brawl Ball", ago: "il y a 27 min" },
  { a: "glitch", b: "ember", score: [1, 2], delta: 16, mode: "Prime", ago: "il y a 41 min" },
  { a: "frost", b: "neon", score: [2, 1], delta: 9, mode: "Zone réservée", ago: "il y a 1 h" },
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
