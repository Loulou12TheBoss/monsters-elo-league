import { createFileRoute } from "@tanstack/react-router";
import { MatchCard, Page, PageHeader, Panel, TeamLogo, Winrate } from "@/components/mel";
import { matchesOf, rankOf, teamById } from "@/lib/demo-data";

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
  // Profil d'exemple : les statistiques sont dérivées des mêmes données
  // fictives que le reste du site (équipe Vortex Fangs, capitaine Kryo).
  const team = teamById("vortex");
  const player = team.players[0]!;
  const history = matchesOf(team.id);
  return (
    <Page>
      <PageHeader eyebrow="Mon compte" title="Profil" desc="Profil d'exemple : les statistiques ci-dessous sont calculées à partir des données fictives du site. La connexion réelle sera ajoutée dans une prochaine version." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <Panel>
          <div className="flex items-center gap-4">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-primary/15 font-display text-2xl font-bold text-primary glow">
              {player.name.slice(0, 2).toUpperCase()}
            </span>
            <div><p className="font-display text-2xl font-bold">{player.name}</p><code className="text-xs text-accent">{player.tag}</code><p className="text-sm text-muted-foreground">{player.role}</p></div>
          </div>
          <div className="mt-6 flex items-center gap-3 rounded-lg bg-muted/50 p-3"><TeamLogo team={team} /><div><p className="font-semibold">{team.name}</p><p className="text-xs text-muted-foreground">{team.elo} ELO · {team.region} · Rang #{rankOf(team.id)}</p></div></div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md bg-muted/50 p-3"><p className="font-display text-xl font-bold text-primary">{team.played}</p>Matchs</div>
            <div className="rounded-md bg-muted/50 p-3"><p className="font-display text-xl font-bold text-primary">{team.wins}V / {team.losses}D</p>Bilan</div>
            <div className="rounded-md bg-muted/50 p-3"><p className="font-display text-xl font-bold text-primary"><Winrate t={team} /></p>Victoires</div>
          </div>
        </Panel>
        <Panel>
          <h2 className="mb-4 text-lg font-semibold">Historique récent</h2>
          <div className="space-y-2">{history.map((m) => <MatchCard key={m.id} m={m} focus={team.id} />)}</div>
        </Panel>
      </div>
    </Page>
  );
}
