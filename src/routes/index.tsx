import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Swords, Trophy } from "lucide-react";
import { DemoBadge, Page, Panel, TeamLogo } from "@/components/mel";
import { platformStats, ranked, recentMatches, teamById } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Monsters ELO League — Matchmaking Brawl Stars" },
      { name: "description", content: "MEL, la ligue compétitive ELO pour équipes Brawl Stars par Monsters Stars." },
      { property: "og:title", content: "Monsters ELO League" },
      { property: "og:description", content: "Matchmaking compétitif ELO pour équipes Brawl Stars." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <>
      <section className="relative overflow-hidden border-b bg-hero">
        <div className="absolute inset-0 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="fade-up max-w-3xl">
            <p className="mb-4 font-display text-xs font-semibold uppercase tracking-[0.3em] text-primary">Saison 1 · Portée par Monsters Stars</p>
            <h1 className="text-4xl font-bold leading-[1.05] md:text-7xl">Grimpez l'échelle.<br /><span className="text-neon">Prouvez votre ELO.</span></h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">Monsters ELO League affronte les équipes Brawl Stars de niveau équivalent en BO3. Chaque victoire compte, chaque défaite se paie.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="glow font-display uppercase tracking-wider"><Link to="/matchmaking"><Swords /> Rechercher un match</Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/classement">Voir le classement</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <Page>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">Statistiques de la plateforme</h2><DemoBadge /></div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {platformStats.map((s) => (
            <Panel key={s.label}><p className="font-display text-3xl font-bold text-primary">{s.value}</p><p className="mt-1 text-sm text-muted-foreground">{s.label}</p></Panel>
          ))}
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Panel>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-semibold"><Trophy className="h-5 w-5 text-gold" /> Top 5 des équipes</h2>
              <Link to="/classement" className="flex items-center gap-1 text-sm text-primary">Tout voir <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <ol className="space-y-2">
              {ranked.slice(0, 5).map((t, i) => (
                <li key={t.id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                  <span className={`w-6 font-display font-bold ${i === 0 ? "text-gold" : "text-muted-foreground"}`}>{i + 1}</span>
                  <TeamLogo team={t} size={36} />
                  <span className="flex-1 font-medium">{t.name}</span>
                  <span className="font-display font-bold text-primary">{t.elo}</span>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel>
            <h2 className="mb-4 text-xl font-semibold">Derniers matchs</h2>
            <ul className="space-y-2">
              {recentMatches.map((m, i) => {
                const a = teamById(m.a), b = teamById(m.b); const aWon = m.score[0] > m.score[1];
                return (
                  <li key={i} className="rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center gap-2">
                      <TeamLogo team={a} size={30} />
                      <span className={`flex-1 truncate text-sm ${aWon ? "font-semibold" : "text-muted-foreground"}`}>{a.name}</span>
                      <span className="font-display text-lg font-bold">{m.score[0]} – {m.score[1]}</span>
                      <span className={`flex-1 truncate text-right text-sm ${!aWon ? "font-semibold" : "text-muted-foreground"}`}>{b.name}</span>
                      <TeamLogo team={b} size={30} />
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>BO3 · {m.mode}</span><span className="text-primary">±{m.delta} ELO · {m.ago}</span></div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </Page>
    </>
  );
}
