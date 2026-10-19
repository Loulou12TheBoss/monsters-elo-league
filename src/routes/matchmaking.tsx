import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, Loader2, Swords, X } from "lucide-react";
import { TeamLink, Page, PageHeader, Panel, TeamLogo } from "@/components/mel";
import { bo3Maps, queue, teamById } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/matchmaking")({
  head: () => ({
    meta: [
      { title: "Matchmaking — Monsters ELO League" },
      { name: "description", content: "File d'attente et aperçu d'affrontement BO3 de la MEL (démo)." },
      { property: "og:title", content: "Matchmaking — MEL" },
      { property: "og:description", content: "Trouvez un adversaire de votre niveau en BO3." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Matchmaking,
});

function Matchmaking() {
  const [phase, setPhase] = useState<"idle" | "searching" | "cancelled" | "demo">("idle");
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (phase !== "searching") return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);
  const searching = phase === "searching";
  const time = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  const a = teamById("vortex"), b = teamById("onyx");

  return (
    <Page>
      <PageHeader eyebrow="File compétitive" title="Matchmaking" desc="Simulation visuelle : la recherche ne lance aucun vrai match et n'est pas encore reliée à un serveur." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">File d'attente</h2>
            <span className="flex items-center gap-2 text-xs text-primary"><span className="pulse-dot h-2 w-2 rounded-full bg-primary" /> {queue.length} équipes</span>
          </div>
          <ul className="space-y-2">
            {queue.map((q) => { const t = teamById(q.team); return (
              <li key={q.team} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <TeamLogo team={t} size={34} />
                <div className="flex-1"><p className="text-sm font-semibold">{t.name}</p><p className="text-xs text-muted-foreground">Plage ELO {q.range}</p></div>
                <span className="font-display text-sm text-muted-foreground">{q.wait}</span>
              </li>); })}
          </ul>
          <div className="mt-5 rounded-lg border bg-background/60 p-3 text-sm" aria-live="polite">
            {phase === "idle" && <p className="text-muted-foreground">Prêt. Lancez une recherche simulée.</p>}
            {phase === "searching" && <p className="flex items-center gap-2 text-primary"><Loader2 className="h-4 w-4 animate-spin" /> Recherche simulée en cours… {time}</p>}
            {phase === "cancelled" && <p className="text-destructive">Recherche annulée après {time}. Aucune équipe n'a été contactée.</p>}
            {phase === "demo" && <p className="text-gold">Démonstration : voici à quoi ressemblerait un match trouvé. Ce n'est pas un vrai adversaire.</p>}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {searching ? (
              <Button className="flex-1" size="lg" variant="destructive" onClick={() => setPhase("cancelled")}><X /> Arrêter la recherche</Button>
            ) : (
              <Button className="flex-1 glow font-display uppercase tracking-wider" size="lg" onClick={() => { setSecs(0); setPhase("searching"); }}><Swords /> Lancer la recherche</Button>
            )}
            <Button size="lg" variant="outline" onClick={() => setPhase("demo")}><Eye /> Voir la démo « match trouvé »</Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">⚠ Le matchmaking réel n'est pas encore connecté : la recherche tourne indéfiniment et ne trouvera jamais d'adversaire.</p>
        </Panel>

        <Panel className={phase === "demo" ? "bg-hero border-gold/50 glow" : "bg-hero"}>
          <p className="text-center font-display text-xs uppercase tracking-[0.3em] text-primary">{phase === "demo" ? "Match trouvé — démonstration" : "Exemple d'affrontement"} · BO3</p>
          <div className="my-8 flex items-center justify-around gap-4">
            {[a, b].map((t, i) => (
              <div key={t.id} className={`flex flex-col items-center gap-3 text-center ${i === 1 ? "order-3" : ""}`}>
                <TeamLogo team={t} size={80} />
                <TeamLink team={t} className="font-display text-lg font-bold" />
                <p className="font-display text-primary">{t.elo} ELO</p>
              </div>
            ))}
            <span className="order-2 font-display text-4xl font-bold text-muted-foreground">VS</span>
          </div>
          <div className="space-y-2">
            {bo3Maps.map((m, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border bg-background/60 p-3">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-primary/15 font-display text-sm font-bold text-primary">{i + 1}</span>
                <div className="flex-1"><p className="text-sm font-semibold">{m.mode}</p><p className="text-xs text-muted-foreground">{m.map}</p></div>
                <span className="text-xs text-muted-foreground">{i === 2 ? "Si nécessaire" : "À jouer"}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">Gain estimé : +12 / −12 ELO (exemple, aucun résultat n'est vérifié)</p>
        </Panel>
      </div>
    </Page>
  );
}
