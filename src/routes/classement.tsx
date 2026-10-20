import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { EmptyState, Page, PageHeader, TeamLink, TeamLogo, Winrate } from "@/components/mel";
import { rankOf, ranked } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/classement")({
  head: () => ({
    meta: [
      { title: "Classement ELO — Monsters ELO League" },
      { name: "description", content: "Classement ELO des équipes Brawl Stars de la MEL." },
      { property: "og:title", content: "Classement ELO — MEL" },
      { property: "og:description", content: "Le classement des meilleures équipes de la Monsters ELO League." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Classement,
});

const sorts = { elo: "ELO", wins: "Victoires", played: "Matchs joués" } as const;
type SortKey = keyof typeof sorts;

function Classement() {
  const [sort, setSort] = useState<SortKey>("elo");
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return [...ranked].filter((t) => !s || t.name.toLowerCase().includes(s) || t.tag.toLowerCase().includes(s)).sort((a, b) => b[sort] - a[sort]);
  }, [sort, q]);
  const podium = [ranked[1]!, ranked[0]!, ranked[2]!];

  return (
    <Page>
      <PageHeader sim eyebrow="Saison 1" title="Classement" desc="ELO simulé localement à partir de l'historique fictif (départ 0, K=40 les 10 premiers matchs puis K=24). Aucun calcul officiel n'est actif." />

      <div className="fade-up mb-10 grid grid-cols-3 items-end gap-2 sm:gap-4">
        {podium.map((t) => { const r = rankOf(t.id); return (
          <div key={t.id} className={cn("flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center sm:p-5", r === 1 ? "border-gold/50 bg-hero pb-10 glow" : r === 2 ? "pb-6" : "pb-4")}>
            <span className={cn("font-display text-2xl font-bold", r === 1 ? "text-gold" : "text-muted-foreground")}>#{r}</span>
            <TeamLogo team={t} size={r === 1 ? 64 : 48} />
            <TeamLink team={t} className="font-display text-sm font-bold sm:text-base" />
            <span className="font-display text-primary">{t.elo}</span>
            <span className="text-xs text-muted-foreground">{t.wins}V · {t.losses}D</span>
          </div>); })}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 rounded-lg border bg-card px-3 sm:w-72">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un nom ou un tag…" className="h-10 w-full bg-transparent text-sm outline-none" />
        </label>
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {(Object.keys(sorts) as SortKey[]).map((k) => (
            <button key={k} onClick={() => setSort(k)} className={cn("rounded-md px-3 py-1.5 text-sm transition-colors", sort === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{sorts[k]}</button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? <EmptyState title="Aucune équipe trouvée" desc={`Aucun résultat pour « ${q} ». Essayez un autre nom ou tag.`} /> : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>{["Rang", "Équipe", "ELO", "Matchs", "Bilan V / D", "Win %"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((t) => { const r = rankOf(t.id); return (
                <tr key={t.id} className="border-b last:border-0 transition-colors hover:bg-muted/50">
                  <td className={cn("px-4 py-3 font-display text-lg font-bold", r <= 3 ? "text-gold" : "text-muted-foreground")}>#{r}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><TeamLogo team={t} size={34} /><div><TeamLink team={t} className="font-semibold" /><p className="text-xs text-muted-foreground">[{t.tag}] · {t.region}</p></div></div></td>
                  <td className="px-4 py-3 font-display text-base font-bold text-primary">{t.elo}</td>
                  <td className="px-4 py-3">{t.played}</td>
                  <td className="px-4 py-3"><span className="text-primary">{t.wins}V</span> / <span className="text-destructive">{t.losses}D</span></td>
                  <td className="px-4 py-3 text-muted-foreground"><Winrate t={t} /></td>
                </tr>); })}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}
