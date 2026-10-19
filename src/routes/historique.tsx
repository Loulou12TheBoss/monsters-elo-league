import { createFileRoute } from "@tanstack/react-router";
import { MatchCard, Page, PageHeader } from "@/components/mel";
import { matches } from "@/lib/demo-data";

export const Route = createFileRoute("/historique")({
  head: () => ({
    meta: [
      { title: "Historique des matchs — Monsters ELO League" },
      { name: "description", content: "Derniers matchs BO3 simulés de la MEL avec scores et variations d'ELO." },
      { property: "og:title", content: "Historique — MEL" },
      { property: "og:description", content: "Scores, vainqueurs et variations d'ELO simulées." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Page>
      <PageHeader eyebrow="Résultats" title="Historique des matchs" desc="Matchs fictifs : les scores et variations d'ELO sont simulés, aucun résultat n'a été vérifié." />
      <div className="space-y-2">{matches.map((m) => <MatchCard key={m.id} m={m} />)}</div>
    </Page>
  ),
});
