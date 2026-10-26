import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw, Save, Swords } from "lucide-react";
import { Page, PageHeader, Panel } from "@/components/mel";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/mel-data";

export const Route = createFileRoute("/match/$matchId")({
  head: () => ({
    meta: [
      { title: "Match — Monsters ELO League" },
      { name: "description", content: "Saisissez les manches et les compositions d'un match MEL." },
    ],
  }),
  component: MatchDetails,
});

const db = supabase as any;
type Player = { user_id: string; role: string; username: string; displayName: string };
type Round = { id: string; set_number: number; round_number: number; winner_registration_id: string | null; mode: string | null; map_name: string | null; battle_time: string | null; status: string };
type Team = { registrationId: string; teamId: string; name: string; elo: number; players: Player[] };
type Lineup = { round_id: string; registration_id: string; roster_player_id: string; user_id: string };

function MatchDetails() {
  const { matchId } = Route.useParams();
  const [match, setMatch] = useState<any>(null);
  const [teamA, setTeamA] = useState<Team | null>(null);
  const [teamB, setTeamB] = useState<Team | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [managerRegistrations, setManagerRegistrations] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [setNumber, setSetNumber] = useState("1");
  const [roundNumber, setRoundNumber] = useState("1");
  const [winner, setWinner] = useState("");
  const [mode, setMode] = useState("");
  const [mapName, setMapName] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [savingRound, setSavingRound] = useState(false);
  const [savingLineup, setSavingLineup] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [{ data: auth }, { data: row, error: matchError }] = await Promise.all([
        supabase.auth.getUser(),
        db.from("matches").select("id, season_id, status, created_at, team_a_registration_id, team_b_registration_id, winner_registration_id, team_a_sets_won, team_b_sets_won, team_a:season_registrations!matches_team_a_registration_id_fkey(id, team_id, elo, teams!inner(name)), team_b:season_registrations!matches_team_b_registration_id_fkey(id, team_id, elo, teams!inner(name))").eq("id", matchId).maybeSingle(),
      ]);
      if (matchError) throw matchError;
      if (!row) throw new Error("Match introuvable.");
      setMatch(row); setUserId(auth.user?.id ?? null);
      const a = Array.isArray(row.team_a) ? row.team_a[0] : row.team_a;
      const b = Array.isArray(row.team_b) ? row.team_b[0] : row.team_b;
      const ta = Array.isArray(a?.teams) ? a.teams[0] : a?.teams;
      const tb = Array.isArray(b?.teams) ? b.teams[0] : b?.teams;
      const [rosterAResult, rosterBResult, setsResult] = await Promise.all([
        db.from("season_roster").select("user_id, role, profiles(username, display_name)").eq("registration_id", row.team_a_registration_id).eq("status", "active"),
        db.from("season_roster").select("user_id, role, profiles(username, display_name)").eq("registration_id", row.team_b_registration_id).eq("status", "active"),
        db.from("match_sets").select("id, set_number").eq("match_id", matchId).order("set_number", { ascending: true }),
      ]);
      if (rosterAResult.error) throw rosterAResult.error;
      if (rosterBResult.error) throw rosterBResult.error;
      if (setsResult.error) throw setsResult.error;
      const makeTeam = (reg: any, name: string, roster: any[]): Team => ({
        registrationId: reg.id, teamId: reg.team_id, name: name ?? "Équipe", elo: reg.elo ?? 0,
        players: (roster ?? []).map((p: any) => { const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles; return { user_id: p.user_id, role: p.role, username: profile?.username ?? "joueur", displayName: profile?.display_name ?? profile?.username ?? "Joueur" }; }),
      });
      const builtA = makeTeam(a, ta?.name, rosterAResult.data ?? []);
      const builtB = makeTeam(b, tb?.name, rosterBResult.data ?? []);
      setTeamA(builtA); setTeamB(builtB);
      const setIds = (setsResult.data ?? []).map((s: any) => s.id);
      let allRounds: Round[] = [];
      if (setIds.length) {
        const { data: roundData, error: roundsError } = await db.from("match_rounds").select("id, set_id, round_number, winner_registration_id, mode, map_name, battle_time, status").in("set_id", setIds).order("round_number", { ascending: true });
        if (roundsError) throw roundsError;
        const setNumberById = new Map((setsResult.data ?? []).map((s: any) => [s.id, s.set_number]));
        allRounds = (roundData ?? []).map((r: any) => ({ ...r, set_number: setNumberById.get(r.set_id) ?? 1 }));
      }
      setRounds(allRounds);
      let lineupRows: Lineup[] = [];
      if (allRounds.length) {
        const { data: saved, error: lineupError } = await db.from("match_lineups").select("round_id, registration_id, roster_player_id, season_roster!inner(user_id)").in("round_id", allRounds.map((r) => r.id));
        if (lineupError) throw lineupError;
        lineupRows = (saved ?? []).map((x: any) => { const roster = Array.isArray(x.season_roster) ? x.season_roster[0] : x.season_roster; return { round_id: x.round_id, registration_id: x.registration_id, roster_player_id: x.roster_player_id, user_id: roster?.user_id }; }).filter((x: Lineup) => !!x.user_id);
      }
      setLineups(lineupRows);
      const nextSelections: Record<string, string[]> = {};
      for (const r of allRounds) for (const regId of [row.team_a_registration_id, row.team_b_registration_id]) {
        const ids = lineupRows.filter((x) => x.round_id === r.id && x.registration_id === regId).map((x) => x.user_id);
        if (ids.length) nextSelections[`${r.id}:${regId}`] = ids;
      }
      setSelectedPlayers((prev) => ({ ...nextSelections, ...Object.fromEntries(Object.entries(prev).filter(([key]) => !nextSelections[key])) }));
      if (auth.user?.id) {
        const { data: memberships, error: memberError } = await db.from("team_members").select("team_id, role").eq("user_id", auth.user.id).eq("status", "active").in("role", ["captain", "manager"]).in("team_id", [builtA.teamId, builtB.teamId]);
        if (memberError) throw memberError;
        const managed = new Set((memberships ?? []).map((m: any) => m.team_id));
        setManagerRegistrations([builtA, builtB].filter((t) => managed.has(t.teamId)).map((t) => t.registrationId));
      } else setManagerRegistrations([]);
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [matchId]);

  const statusLabel = useMemo(() => ({ pending: "En cours", awaiting_validation: "En attente de validation", disputed: "Contesté", validated: "Validé", cancelled: "Annulé", forfeit: "Forfait" } as Record<string, string>)[match?.status] ?? match?.status ?? "Chargement", [match?.status]);
  const nextRound = useMemo(() => {
    if ((match?.team_a_sets_won ?? 0) >= 2 || (match?.team_b_sets_won ?? 0) >= 2) return null;
    for (let s = 1; s <= 3; s++) {
      const played = rounds.filter((r) => r.set_number === s && r.winner_registration_id);
      const winsA = played.filter((r) => r.winner_registration_id === match?.team_a_registration_id).length;
      const winsB = played.filter((r) => r.winner_registration_id === match?.team_b_registration_id).length;
      if (winsA >= 2 || winsB >= 2) continue;
      for (let n = 1; n <= 3; n++) if (!rounds.some((r) => r.set_number === s && r.round_number === n)) return { set: s, round: n };
    }
    return null;
  }, [rounds, match]);
  useEffect(() => {
    if (nextRound) { setSetNumber(String(nextRound.set)); setRoundNumber(String(nextRound.round)); }
  }, [nextRound?.set, nextRound?.round]);

  async function recordRound() {
    if (!match || !winner) { setError("Choisis l'équipe qui a gagné cette manche."); return; }
    setSavingRound(true); setError(""); setMessage("");
    try {
      const { data, error: rpcError } = await db.rpc("mel_record_round", {
        p_match_id: matchId, p_set_number: Number(setNumber), p_round_number: Number(roundNumber),
        p_winner_registration_id: winner, p_mode: mode.trim() || null, p_map_name: mapName.trim() || null, p_battle_time: null,
      });
      if (rpcError) throw rpcError;
      setMessage("Manche enregistrée. Pense à renseigner les trois joueurs alignés pour cette manche.");
      setWinner(""); setMode(""); setMapName("");
      await load();
    } catch (err) { setError(errorMessage(err)); }
    finally { setSavingRound(false); }
  }

  function choosePlayer(key: string, index: number, value: string) {
    setSelectedPlayers((prev) => {
      const values = [...(prev[key] ?? ["", "", ""] )];
      while (values.length < 3) values.push("");
      values[index] = value;
      return { ...prev, [key]: values };
    });
  }
  async function saveLineup(roundId: string, team: Team) {
    const key = `${roundId}:${team.registrationId}`;
    const ids = selectedPlayers[key] ?? [];
    if (ids.length !== 3 || ids.some((id) => !id) || new Set(ids).size !== 3) { setError("Sélectionne trois joueurs différents."); return; }
    setSavingLineup(key); setError(""); setMessage("");
    try {
      const { error: rpcError } = await db.rpc("mel_set_round_lineup", { p_round_id: roundId, p_registration_id: team.registrationId, p_player_user_ids: ids });
      if (rpcError) throw rpcError;
      setMessage(`Composition de ${team.name} enregistrée.`);
      await load();
    } catch (err) { setError(errorMessage(err)); }
    finally { setSavingLineup(null); }
  }

  if (loading && !match) return <Page><Panel><p className="text-sm text-muted-foreground">Chargement du match…</p></Panel></Page>;
  if (!match || !teamA || !teamB) return <Page><PageHeader title="Match introuvable" desc="Ce match n'existe pas ou n'est pas accessible." /><a href="/matchmaking" className="text-sm text-primary underline">Retour au matchmaking</a>{error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}</Page>;
  const canRecord = ["pending", "awaiting_validation"].includes(match.status);
  const teams = [teamA, teamB];
  const winsA = rounds.filter((r) => r.winner_registration_id === teamA.registrationId).length;
  const winsB = rounds.filter((r) => r.winner_registration_id === teamB.registrationId).length;

  return <Page>
    <a href="/matchmaking" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Retour au matchmaking</a>
    <PageHeader eyebrow={`Match · ${statusLabel}`} title={`${teamA.name} vs ${teamB.name}`} desc="Un match MEL est un BO3 de sets ; chaque set est un BO3 de manches individuelles." />
    {error && <p role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="mb-4 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm">{message}</p>}
    <Panel>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
        <div><p className="font-semibold">{teamA.name}</p><p className="text-sm text-muted-foreground">{teamA.elo} ELO</p></div>
        <div className="text-3xl font-bold tabular-nums">{match.team_a_sets_won}–{match.team_b_sets_won}</div>
        <div><p className="font-semibold">{teamB.name}</p><p className="text-sm text-muted-foreground">{teamB.elo} ELO</p></div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">Manches remportées au total : {winsA}–{winsB}. L'ELO ne change qu'après validation finale.</p>
    </Panel>

    <Panel>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><Swords className="h-5 w-5 text-primary" /> Enregistrer une manche</h2><Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" /> Actualiser</Button></div>
      {!userId && <p className="mb-3 text-sm text-muted-foreground">Connecte-toi pour enregistrer une manche.</p>}
      {!canRecord ? <p className="text-sm text-muted-foreground">Ce match n'accepte plus de nouveaux résultats avec son statut actuel.</p> : !nextRound ? <p className="text-sm text-muted-foreground">Les manches nécessaires ont été enregistrées. Le résultat attend sa validation.</p> : <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Set<select className="mt-1 w-full rounded-md border bg-background px-3 py-2" value={setNumber} onChange={(e) => setSetNumber(e.target.value)}><option value="1">Set 1</option><option value="2">Set 2</option><option value="3">Set 3</option></select></label>
        <label className="text-sm">Manche du set<select className="mt-1 w-full rounded-md border bg-background px-3 py-2" value={roundNumber} onChange={(e) => setRoundNumber(e.target.value)}><option value="1">Manche 1</option><option value="2">Manche 2</option><option value="3">Manche 3</option></select></label>
        <label className="text-sm">Mode (facultatif)<input className="mt-1 w-full rounded-md border bg-background px-3 py-2" value={mode} onChange={(e) => setMode(e.target.value)} placeholder="Ex. Brawl Ball" /></label>
        <label className="text-sm">Carte (facultatif)<input className="mt-1 w-full rounded-md border bg-background px-3 py-2" value={mapName} onChange={(e) => setMapName(e.target.value)} placeholder="Nom de la carte" /></label>
        <label className="text-sm sm:col-span-2">Équipe gagnante<select className="mt-1 w-full rounded-md border bg-background px-3 py-2" value={winner} onChange={(e) => setWinner(e.target.value)}><option value="">Choisir le vainqueur</option><option value={teamA.registrationId}>{teamA.name}</option><option value={teamB.registrationId}>{teamB.name}</option></select></label>
        <div className="sm:col-span-2"><Button onClick={() => void recordRound()} disabled={!userId || savingRound || !winner}>{savingRound ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Enregistrer la manche {setNumber}.{roundNumber}</Button><p className="mt-2 text-xs text-muted-foreground">Prochaine manche attendue : set {nextRound.set}, manche {nextRound.round}. Le serveur refusera un ordre de saisie invalide.</p></div>
      </div>}
    </Panel>

    <div className="mt-8"><h2 className="mb-3 text-xl font-semibold">Manches enregistrées</h2>{rounds.length === 0 ? <Panel><p className="text-sm text-muted-foreground">Aucune manche enregistrée pour le moment.</p></Panel> : <div className="space-y-3">{rounds.map((round) => {
      const roundWinner = round.winner_registration_id === teamA.registrationId ? teamA.name : round.winner_registration_id === teamB.registrationId ? teamB.name : "Non défini";
      return <Panel key={round.id}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">Set {round.set_number} · Manche {round.round_number}</p><p className="text-sm text-muted-foreground">Vainqueur : {roundWinner}{round.mode ? ` · ${round.mode}` : ""}{round.map_name ? ` · ${round.map_name}` : ""}</p></div><span className="rounded-md bg-muted px-2 py-1 text-xs">{round.status === "validated" ? "Validée" : round.status === "disputed" ? "Contestée" : "Résultat saisi"}</span></div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">{teams.filter((team) => managerRegistrations.includes(team.registrationId)).map((team) => {
          const key = `${round.id}:${team.registrationId}`;
          const chosen = selectedPlayers[key] ?? ["", "", ""];
          const savedCount = lineups.filter((l) => l.round_id === round.id && l.registration_id === team.registrationId).length;
          return <div key={team.registrationId} className="rounded-lg border p-3"><p className="mb-2 text-sm font-semibold">Composition — {team.name} <span className="font-normal text-muted-foreground">({savedCount}/3 enregistrés)</span></p><div className="space-y-2">{[0,1,2].map((idx) => <select key={idx} className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={chosen[idx] ?? ""} onChange={(e) => choosePlayer(key, idx, e.target.value)}><option value="">Joueur {idx + 1}</option>{team.players.map((player) => <option key={player.user_id} value={player.user_id}>{player.displayName} (@{player.username}){player.role === "substitute" ? " · remplaçant" : ""}</option>)}</select>)}</div><Button className="mt-3 w-full" size="sm" variant="outline" onClick={() => void saveLineup(round.id, team)} disabled={savingLineup !== null || round.status === "validated"}>{savingLineup === key ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Enregistrer les 3 joueurs</Button></div>;
        })}</div>
        {!managerRegistrations.length && <p className="mt-3 text-xs text-muted-foreground">Seul le capitaine ou un manager d'une équipe participante peut enregistrer sa composition.</p>}
      </Panel>;
    })}</div>}</div>
    <Panel className="mt-6"><p className="text-sm font-semibold">Validation et ELO</p><p className="mt-1 text-sm text-muted-foreground">Une fois le BO3 de sets terminé et les trois joueurs de chaque équipe renseignés pour chaque manche jouée, le match reste en attente de validation. La validation finale et le calcul ELO sont réservés au système de validation/modération actuel ; cette page ne modifie pas directement les ELO.</p></Panel>
  </Page>;
}
