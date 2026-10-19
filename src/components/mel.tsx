import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { matchScore, matchWinner, teamById, type Match, type Team } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Accueil" },
  { to: "/classement", label: "Classement" },
  { to: "/matchmaking", label: "Matchmaking" },
  { to: "/equipes", label: "Équipes" },
  { to: "/historique", label: "Historique" },
  { to: "/profil", label: "Profil" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground glow">MEL</span>
          <span className="hidden font-display text-sm font-semibold uppercase tracking-widest sm:block">Monsters ELO League</span>
        </Link>
        <nav className="hidden gap-1 md:flex">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "!text-primary bg-primary/10" }}>{n.label}</Link>
          ))}
        </nav>
        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
      </div>
      {open && (
        <nav className="flex flex-col border-t px-4 py-2 md:hidden">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)} activeOptions={{ exact: n.to === "/" }}
              className="rounded-md px-3 py-3 text-muted-foreground" activeProps={{ className: "!text-primary" }}>{n.label}</Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t py-8 text-center text-xs text-muted-foreground">
      <p>Monsters ELO League · par Monsters Stars — Maquette de démonstration, toutes les données sont fictives.</p>
      <p className="mt-1">Non affilié à Supercell. Brawl Stars est une marque de Supercell.</p>
    </footer>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-gold", className)}>● Données fictives</span>;
}

/** Fonctionnalité simulée localement (ex. recherche de match, variations d'ELO). */
export function SimBadge({ className }: { className?: string }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-dashed border-accent/50 bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-accent", className)}>◇ Simulation</span>;
}

export function PageHeader({ eyebrow, title, desc, sim }: { eyebrow: string; title: string; desc?: string; sim?: boolean }) {
  return (
    <div className="fade-up mb-8 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-primary">{eyebrow}</span>
        <DemoBadge />
        {sim && <SimBadge />}
      </div>
      <h1 className="text-3xl font-bold md:text-5xl">{title}</h1>
      {desc && <p className="max-w-2xl text-muted-foreground">{desc}</p>}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border bg-card p-5 transition-colors hover:border-primary/30", className)}>{children}</div>;
}

export function TeamLogo({ team, size = 40 }: { team: Team; size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-lg border font-display font-bold"
      style={{ width: size, height: size, fontSize: size * 0.3, color: team.color, borderColor: team.color, background: `color-mix(in oklab, ${team.color} 14%, transparent)` }}>
      {team.tag}
    </span>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto max-w-6xl px-4 py-10 md:py-14">{children}</main>;
}

export function Winrate({ t }: { t: Team }) {
  return <>{Math.round((t.wins / t.played) * 100)}%</>;
}

export function TeamLink({ team, className }: { team: Team; className?: string }) {
  return <Link to="/equipes/$teamId" params={{ teamId: team.id }} className={cn("hover:text-primary hover:underline underline-offset-4", className)}>{team.name}</Link>;
}

export function EmptyState({ title, desc }: { title: string; desc: string }) {
  return <div className="rounded-xl border border-dashed p-10 text-center"><p className="font-display text-lg font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{desc}</p></div>;
}

export function MatchCard({ m, focus }: { m: Match; focus?: string }) {
  const a = teamById(m.a), b = teamById(m.b);
  const [sa, sb] = matchScore(m); const w = matchWinner(m);
  const res = focus ? (w === focus ? "V" : "D") : null;
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <div className="flex items-center gap-2">
        <TeamLogo team={a} size={30} />
        <TeamLink team={a} className={cn("flex-1 truncate text-sm", w === a.id ? "font-semibold" : "text-muted-foreground")} />
        <span className="font-display text-lg font-bold">{sa} – {sb}</span>
        <TeamLink team={b} className={cn("flex-1 truncate text-right text-sm", w === b.id ? "font-semibold" : "text-muted-foreground")} />
        <TeamLogo team={b} size={30} />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>BO3 · {m.mode} · Manches : {m.rounds.map((r) => r.join("-")).join(" / ")}</span>
        <span className="flex items-center gap-2">
          {res && <span className={cn("rounded px-1.5 font-display font-bold", res === "V" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive")}>{res}</span>}
          <span className="text-primary">Vainqueur : {teamById(w).tag} · ±{m.delta} ELO (simulé)</span>
          <span>{m.date}</span>
        </span>
      </div>
    </div>
  );
}
