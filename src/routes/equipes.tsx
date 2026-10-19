import { createFileRoute } from "@tanstack/react-router";
import { Page, PageHeader, Panel, TeamLogo, Winrate } from "@/components/mel";
import { ranked } from "@/lib/demo-data";

export const Route = createFileRoute("/equipes")({
  head: () => ({
    meta: [
      { title: "Équipes — Monsters ELO League" },
      { name: "description", content: "Profils des équipes Brawl Stars de la MEL (données fictives)." },
      { property: "og:title", content: "Équipes — MEL" },
      { property: "og:description", content: "Découvrez les équipes et joueurs de la Monsters ELO League." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Equipes,
});

function Equipes() {
  return (
    <Page>
      <PageHeader eyebrow="Roster" title="Équipes" desc="Profils d'équipes de démonstration. Les noms de joueurs et tags Brawl Stars sont inventés." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ranked.map((t, i) => (
          <Panel key={t.id} className="fade-up">
            <div className="flex items-center gap-4">
              <TeamLogo team={t} size={56} />
              <div className="flex-1"><p className="font-display text-lg font-bold">{t.name}</p><p className="text-xs text-muted-foreground">#{i + 1} · {t.region}</p></div>
              <p className="font-display text-xl font-bold text-primary">{t.elo}</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-md bg-muted/50 p-2"><p className="font-display text-base font-bold">{t.wins}</p>Victoires</div>
              <div className="rounded-md bg-muted/50 p-2"><p className="font-display text-base font-bold">{t.losses}</p>Défaites</div>
              <div className="rounded-md bg-muted/50 p-2"><p className="font-display text-base font-bold"><Winrate t={t} /></p>Win %</div>
            </div>
            <ul className="mt-4 space-y-1.5">
              {t.players.map((p) => (
                <li key={p.name} className="flex items-center justify-between text-sm">
                  <span><span className="font-medium">{p.name}</span> <span className="text-xs text-muted-foreground">· {p.role}</span></span>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-accent">{p.tag}</code>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </Page>
  );
}
