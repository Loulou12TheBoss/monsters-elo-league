import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { DemoBadge, EmptyState, MatchCard, Page, Panel, TeamLogo, Winrate } from "@/components/mel";
import { findTeam, matchesOf, rankOf } from "@/lib/demo-data";

export const Route = createFileRoute("/equipes_/$teamId")({
  loader: ({ params }) => {
    const team = findTeam(params.teamId);
    if (!team) throw notFound();
    return { team };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.team.name ?? "Équipe introuvable";
    return {
      meta: [
        { title: `${name} — Monsters ELO League` },
        { name: "description", content: `Profil de démonstration de l'équipe ${name} sur la MEL.` },
        { property: "og:title", content: `${name} — MEL` },
        { property: "og:description", content: `ELO, joueurs et historique BO3 de ${name} (données fictives).` },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: () => (
    <Page><EmptyState title="Équipe introuvable" desc="Cette équipe n'existe pas dans les données de démonstration." />
      <div className="mt-4 text-center"><Link to="/equipes" className="text-primary">← Retour aux équipes</Link></div></Page>
  ),
  component: TeamPage,
});

function TeamPage() {
  const { team: t } = Route.useLoaderData();
  const history = matchesOf(t.id);
  const stats = [["Rang", `#${rankOf(t.id)}`], ["ELO", t.elo], ["Matchs joués", t.played], ["Bilan V/D", `${t.wins} / ${t.losses}`]] as const;
  return (
    <Page>
      <Link to="/equipes" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Toutes les équipes</Link>
      <div className="fade-up flex flex-col gap-5 rounded-xl border bg-card bg-hero p-6 sm:flex-row sm:items-center">
        <TeamLogo team={t} size={96} />
        <div className="flex-1">
          <DemoBadge />
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">{t.name}</h1>
          <p className="text-muted-foreground">[{t.tag}] · {t.region} · <Winrate t={t} /> de victoires</p>
        </div>
        <p className="font-display text-4xl font-bold text-neon">{t.elo}</p>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([l, v]) => <Panel key={l}><p className="font-display text-2xl font-bold text-primary">{v}</p><p className="text-sm text-muted-foreground">{l}</p></Panel>)}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <Panel>
          <h2 className="mb-4 text-lg font-semibold">Joueurs</h2>
          <ul className="space-y-2">
            {t.players.map((p) => (
              <li key={p.name} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div><p className="font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">{p.role}</p></div>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-accent">{p.tag}</code>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Tags Brawl Stars inventés, non vérifiés.</p>
        </Panel>
        <Panel>
          <h2 className="mb-4 text-lg font-semibold">Historique des matchs</h2>
          {history.length ? <div className="space-y-2">{history.map((m) => <MatchCard key={m.id} m={m} focus={t.id} />)}</div>
            : <EmptyState title="Aucun match" desc="Cette équipe n'a pas encore de match dans la démo." />}
        </Panel>
      </div>
    </Page>
  );
}
