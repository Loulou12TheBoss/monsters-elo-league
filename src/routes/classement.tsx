import { createFileRoute } from "@tanstack/react-router";
import { Page, PageHeader, TeamLogo, Winrate } from "@/components/mel";
import { ranked } from "@/lib/demo-data";

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

function Classement() {
  return (
    <Page>
      <PageHeader eyebrow="Saison 1" title="Classement" desc="Les équipes classées par ELO. Les valeurs affichées sont des exemples, aucun calcul ELO n'est encore actif." />
      <div className="fade-up overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>{["Rang", "Équipe", "ELO", "Joués", "V", "D", "Win %"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {ranked.map((t, i) => (
              <tr key={t.id} className="border-b last:border-0 transition-colors hover:bg-muted/50">
                <td className={`px-4 py-3 font-display text-lg font-bold ${i < 3 ? "text-gold" : "text-muted-foreground"}`}>#{i + 1}</td>
                <td className="px-4 py-3"><div className="flex items-center gap-3"><TeamLogo team={t} size={34} /><div><p className="font-semibold">{t.name}</p><p className="text-xs text-muted-foreground">{t.region}</p></div></div></td>
                <td className="px-4 py-3 font-display text-base font-bold text-primary">{t.elo}</td>
                <td className="px-4 py-3">{t.played}</td>
                <td className="px-4 py-3 text-primary">{t.wins}</td>
                <td className="px-4 py-3 text-destructive">{t.losses}</td>
                <td className="px-4 py-3 text-muted-foreground"><Winrate t={t} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
