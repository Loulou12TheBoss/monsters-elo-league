import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, RefreshCw, Swords } from "lucide-react";
import { EmptyState, Page, PageHeader, Panel, TeamLogo } from "@/components/mel";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage, getLeaderboard, type MelSeason, type MelTeam } from "@/lib/mel-data";

export const Route = createFileRoute("/matchmaking")({
  head: () => ({
    meta: [
      { title: "Matchmaking — Monsters ELO League" },
      { name: "description", content: "Lancez un défi officiel entre équipes inscrites à la MEL." },
      { property: "og:title", content: "Matchmaking — MEL" },
      { property: "og:description", content: "Défis compétitifs entre équipes de la MEL." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Matchmaking,
});

const db = supabase as any;
const logoTeam = (t: MelTeam) => ({ id: t.id, name: t.name, tag: t.name.slice(0, 3).toUpperCase(), region: "EMEA", color: "#39ff88", players: [], elo: t.elo, played: t.played, wins: t.wins, losses: t.losses });

type PendingMatch = { id: string; status: string; created_at: string; a: string; b: string; aElo: number; bElo: number };
function Matchmaking() {
  const [teams, setTeams] = useState<MelTeam[]>([]);
  const [season, setSeason] = useState<MelSeason | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingMatches, setPendingMatches] = useState<PendingMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [challenging, setChallenging] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [{ season: currentSeason, teams: liveTeams }, { data: authData }] = await Promise.all([getLeaderboard(), supabase.auth.getUser()]);
      setSeason(currentSeason); setTeams(liveTeams); setUserId(authData.user?.id ?? null);
      if (!currentSeason) { setPendingMatches([]); return; }
      const { data, error: matchesError } = await db.from("matches")
        .select("id, status, created_at, team_a_sets_won, team_b_sets_won, team_a:season_registrations!matches_team_a_registration_id_fkey(id, elo, teams!inner(name)), team_b:season_registrations!matches_team_b_registration_id_fkey(id, elo, teams!inner(name))")
        .eq("season_id", currentSeason.id)
        .in("status", ["pending", "awaiting_validation", "disputed"])
        .order("created_at", { ascending: false }).limit(30);
      if (matchesError) throw matchesError;
      setPendingMatches((data ?? []).map((row: any) => {
        const a = Array.isArray(row.team_a) ? row.team_a[0] : row.team_a;
        const b = Array.isArray(row.team_b) ? row.team_b[0] : row.team_b;
        const ta = Array.isArray(a?.teams) ? a.teams[0] : a?.teams;
        const tb = Array.isArray(b?.teams) ? b.teams[0] : b?.teams;
        return { id: row.id, status: row.status, created_at: row.created_at, a: ta?.name ?? "Équipe A", b: tb?.name ?? "Équipe B", aElo: a?.elo ?? 0, bElo: b?.elo ?? 0 };
      }));
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function challenge(opponentRegistrationId: string) {
    setChallenging(opponentRegistrationId); setError(""); setMessage("");
    try {
      if (!userId) throw new Error("Connecte-toi pour défier une équipe.");
      if (season?.status !== "active") throw new Error("Le matchmaking n'est disponible que lorsqu'une saison est active.");
      const { data: matchId, error: challengeError } = await db.rpc("mel_create_match", { p_opponent_registration_id: opponentRegistrationId });
      if (challengeError) throw challengeError;
      setMessage(`Défi créé avec succès (match ${String(matchId).slice(0, 8)}…). Le match attend maintenant la saisie des manches et les validations prévues par le règlement.`);
      await load();
    } catch (err) { setError(errorMessage(err)); }
    finally { setChallenging(null); }
  }

  return <Page>
    <PageHeader eyebrow={season?.status === "active" ? "Saison active" : "Matchs officiels"} title="Matchmaking" desc="Crée un défi officiel contre une équipe inscrite. Le backend vérifie les inscriptions, les rôles de gestion et les trois titulaires de chaque équipe." />
    {error && <p role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="mb-4 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm">{message}</p>}
    <div className="mb-6 flex justify-end"><Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" /> Actualiser</Button></div>
    <Panel>
      <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-semibold"><Swords className="h-5 w-5 text-primary" /> Défier une équipe</h2><span className="text-xs text-muted-foreground">{teams.length} équipes</span></div>
      {!userId && <p className="mb-4 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">Connecte-toi sur la page <Link to="/profil" className="text-primary underline">Profil</Link> pour créer un défi.</p>}
      {season?.status !== "active" && <p className="mb-4 rounded-md border border-gold/30 bg-gold/10 p-3 text-sm">La saison doit être au statut « active » pour créer un match. {season ? `Statut actuel : ${season.status}.` : "Aucune saison active n'est configurée."}</p>}
      {loading ? <p className="text-sm text-muted-foreground">Chargement des équipes…</p> : teams.length === 0 ? <EmptyState title="Aucun adversaire disponible" desc="Les équipes apparaîtront ici après l'approbation de leur inscription à la saison." /> : <div className="grid gap-3 md:grid-cols-2">{teams.map((team) => <div key={team.registrationId} className="flex items-center gap-3 rounded-lg border bg-background/50 p-3"><TeamLogo team={logoTeam(team)} size={44} /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{team.name}</p><p className="text-xs text-muted-foreground">{team.elo} ELO · {team.played} matchs</p><p className="text-xs text-muted-foreground">{team.players.filter((p) => p.role === "starter").length}/3 titulaires</p></div><Button size="sm" disabled={!userId || season?.status !== "active" || challenging !== null || team.players.filter((p) => p.role === "starter").length !== 3} onClick={() => void challenge(team.registrationId)}>{challenging === team.registrationId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Défier"}</Button></div>)}</div>}
      <p className="mt-4 text-xs text-muted-foreground">Le défi ne calcule pas encore d'ELO. Les ELO ne changent qu'après validation du résultat par le backend. Il faut également que ton équipe ait exactement trois titulaires actifs.</p>
    </Panel>
    <div className="mt-8"><h2 className="mb-4 text-xl font-semibold">Matchs en cours</h2>{loading ? <Panel><p className="text-sm text-muted-foreground">Chargement…</p></Panel> : pendingMatches.length === 0 ? <EmptyState title="Aucun match en cours" desc="Les défis créés apparaîtront ici." /> : <div className="space-y-2">{pendingMatches.map((match) => <Panel key={match.id}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{match.a} <span className="text-muted-foreground">vs</span> {match.b}</p><p className="text-xs text-muted-foreground">Créé le {new Date(match.created_at).toLocaleString("fr-FR")}</p></div><div className="flex items-center gap-2"><span className="rounded-md bg-muted px-2 py-1 text-xs">{match.status === "pending" ? "En cours" : match.status === "disputed" ? "Contesté" : "À valider"}</span><a href={`/match/${match.id}`} className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted">Ouvrir le match</a></div></div></Panel>)}</div>}</div>
  </Page>;
}
