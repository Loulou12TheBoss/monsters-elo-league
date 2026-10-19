import { createFileRoute } from "@tanstack/react-router";
import { Page, PageHeader, Panel, TeamLogo } from "@/components/mel";
import { teamById } from "@/lib/demo-data";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Profil — Monsters ELO League" },
      { name: "description", content: "Profil joueur de démonstration sur la MEL." },
      { property: "og:title", content: "Profil — MEL" },
      { property: "og:description", content: "Votre profil joueur Monsters ELO League." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profil,
});

function Profil() {
  const team = teamById("vortex");
  const history = [["V", "Hydra Pulse", "2–1", "+14"], ["V", "Titan Howl", "2–0", "+10"], ["D", "Onyx Reapers", "1–2", "−13"], ["V", "Ember Wolves", "2–0", "+8"]];
  return (
    <Page>
      <PageHeader eyebrow="Mon compte" title="Profil" desc="Profil d'exemple. La connexion réelle sera ajoutée dans une prochaine version." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <Panel>
          <div className="flex items-center gap-4">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-primary/15 font-display text-2xl font-bold text-primary glow">KR</span>
            <div><p className="font-display text-2xl font-bold">Kryo</p><code className="text-xs text-accent">#DEMO8Q0X</code><p className="text-sm text-muted-foreground">Capitaine</p></div>
          </div>
          <div className="mt-6 flex items-center gap-3 rounded-lg bg-muted/50 p-3"><TeamLogo team={team} /><div><p className="font-semibold">{team.name}</p><p className="text-xs text-muted-foreground">{team.elo} ELO · {team.region}</p></div></div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-md bg-muted/50 p-3"><p className="font-display text-xl font-bold text-primary">50</p>Matchs</div>
            <div className="rounded-md bg-muted/50 p-3"><p className="font-display text-xl font-bold text-primary">82%</p>Victoires</div>
          </div>
        </Panel>
        <Panel>
          <h2 className="mb-4 text-lg font-semibold">Historique récent</h2>
          <ul className="space-y-2">
            {history.map(([r, opp, s, d], i) => (
              <li key={i} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 text-sm">
                <span className={`grid h-8 w-8 place-items-center rounded-md font-display font-bold ${r === "V" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>{r}</span>
                <span className="flex-1">vs {opp}</span><span className="font-display">{s}</span>
                <span className={`w-10 text-right font-display ${r === "V" ? "text-primary" : "text-destructive"}`}>{d}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </Page>
  );
}
