import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import { RefreshCw, Users, Plus, ShieldCheck, UserPlus, ClipboardList } from "lucide-react";
import { EmptyState, Page, PageHeader, Panel } from "@/components/mel";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/equipes")({
  head: () => ({
    meta: [
      { title: "Équipes — Monsters ELO League" },
      { name: "description", content: "Créer, inscrire et gérer les équipes de la saison MEL." },
      { property: "og:title", content: "Équipes — MEL" },
      { property: "og:description", content: "Découvrez les équipes de la Monsters ELO League." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Equipes,
});

type RosterPlayer = {
  id: string;
  user_id: string;
  role: "starter" | "substitute";
  status: "active" | "left" | "removed";
  profiles: { username: string; display_name: string } | null;
};
type TeamRegistration = {
  id: string;
  team_id: string;
  season_id: string;
  status: "pending" | "approved" | "withdrawn" | "disqualified";
  elo: number;
  validated_matches: number;
  wins: number;
  losses: number;
  teams: { id: string; name: string; slug: string; logo_url: string | null } | null;
  season_roster: RosterPlayer[] | null;
};
type CreatedTeam = { id: string; name: string; slug: string; status: string };
type Season = { id: string; name: string; season_number: number };
type ProfileResult = { id: string; username: string; display_name: string };

function makeSlug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50).replace(/-+$/g, "");
}

function Equipes() {
  const [season, setSeason] = useState<Season | null>(null);
  const [registrations, setRegistrations] = useState<TeamRegistration[]>([]);
  const [createdTeams, setCreatedTeams] = useState<CreatedTeam[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyRegistration, setBusyRegistration] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [playerQueries, setPlayerQueries] = useState<Record<string, string>>({});
  const [playerResults, setPlayerResults] = useState<Record<string, ProfileResult[]>>({});
  const [playerRoles, setPlayerRoles] = useState<Record<string, "starter" | "substitute">>({});
  const [rosterBusy, setRosterBusy] = useState<string | null>(null);
  const [rosterMessages, setRosterMessages] = useState<Record<string, string>>({});
  const [rosterErrors, setRosterErrors] = useState<Record<string, string>>({});

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const db = supabase as any;
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const currentUserId = authData.user?.id ?? null;
      setUserId(currentUserId);

      const { data: seasonData, error: seasonError } = await db.from("seasons")
        .select("id, name, season_number")
        .in("status", ["active", "registration_open"])
        .order("season_number", { ascending: false }).limit(1).maybeSingle();
      if (seasonError) throw seasonError;
      const currentSeason = (seasonData ?? null) as Season | null;
      setSeason(currentSeason);

      let owned: CreatedTeam[] = [];
      if (currentUserId) {
        const { data: teamsData, error: teamsError } = await db.from("teams")
          .select("id, name, slug, status")
          .eq("created_by", currentUserId).order("created_at", { ascending: false });
        if (teamsError) throw teamsError;
        owned = (teamsData ?? []) as CreatedTeam[];
      }
      setCreatedTeams(owned);

      if (currentSeason) {
        const { data: publicData, error: publicError } = await db.from("season_registrations")
          .select("id, team_id, season_id, status, elo, validated_matches, wins, losses, teams(id, name, slug, logo_url), season_roster(id, user_id, role, status, profiles(username, display_name))")
          .eq("season_id", currentSeason.id);
        if (publicError) throw publicError;
        setRegistrations((publicData ?? []) as TeamRegistration[]);
      } else {
        setRegistrations([]);
      }
    } catch (cause) {
      console.error("[MEL] Impossible de charger les équipes", cause);
      setError("Impossible de charger les données depuis Supabase. Vérifie la connexion et les autorisations RLS.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setCreateMessage(null);
    const cleanName = teamName.trim();
    const slug = makeSlug(cleanName);
    if (cleanName.length < 2 || cleanName.length > 40) {
      setCreateError("Le nom doit contenir entre 2 et 40 caractères."); return;
    }
    if (!slug) { setCreateError("Ce nom ne permet pas de créer un identifiant URL valide."); return; }

    setCreating(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) { setCreateError("Connecte-toi pour créer une équipe."); return; }
      const db = supabase as any;
      const { error: rpcError } = await db.rpc("mel_create_team", { p_name: cleanName, p_slug: slug });
      if (rpcError) throw rpcError;
      setTeamName("");
      setCreateMessage(`L’équipe « ${cleanName} » a été créée. Tu en es le capitaine. Inscris-la à la saison ci-dessous pour préparer son roster.`);
      await loadData();
    } catch (cause) {
      console.error("[MEL] Impossible de créer l’équipe", cause);
      const message = cause instanceof Error ? cause.message : "Une erreur inattendue est survenue.";
      setCreateError(/duplicate|unique|already exists/i.test(message)
        ? "Ce nom ou cet identifiant est déjà utilisé. Essaie un autre nom."
        : `La création a échoué : ${message}`);
    } finally { setCreating(false); }
  }

  async function registerTeam(team: CreatedTeam) {
    if (!season) return;
    setBusyRegistration(team.id);
    setRosterMessages((old) => ({ ...old, [team.id]: "" }));
    setRosterErrors((old) => ({ ...old, [team.id]: "" }));
    try {
      const db = supabase as any;
      const { error: rpcError } = await db.rpc("mel_register_team", {
        p_team_id: team.id,
        p_season_id: season.id,
      });
      if (rpcError) throw rpcError;
      setRosterMessages((old) => ({ ...old, [team.id]: "Inscription créée. L’équipe rejoindra automatiquement le classement dès qu’elle aura 3 titulaires actifs." }));
      await loadData();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Erreur inconnue.";
      setRosterErrors((old) => ({ ...old, [team.id]: `Inscription impossible : ${message}` }));
    } finally { setBusyRegistration(null); }
  }

  async function searchPlayers(teamId: string) {
    const term = (playerQueries[teamId] ?? "").trim().replace(/^@/, "");
    setRosterErrors((old) => ({ ...old, [teamId]: "" }));
    setRosterMessages((old) => ({ ...old, [teamId]: "" }));
    if (term.length < 3) {
      setPlayerResults((old) => ({ ...old, [teamId]: [] }));
      setRosterErrors((old) => ({ ...old, [teamId]: "Saisis au moins 3 caractères du pseudo." }));
      return;
    }
    try {
      const db = supabase as any;
      const { data, error: searchError } = await db.from("profiles")
        .select("id, username, display_name")
        .ilike("username", `%${term}%`)
        .limit(8);
      if (searchError) throw searchError;
      setPlayerResults((old) => ({ ...old, [teamId]: (data ?? []) as ProfileResult[] }));
      if (!data?.length) setRosterMessages((old) => ({ ...old, [teamId]: "Aucun compte trouvé avec ce pseudo." }));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Erreur inconnue.";
      setRosterErrors((old) => ({ ...old, [teamId]: `Recherche impossible : ${message}` }));
    }
  }

  async function addPlayer(registration: TeamRegistration, player: ProfileResult) {
    const role = playerRoles[registration.id] ?? "starter";
    setRosterBusy(`${registration.id}:${player.id}`);
    setRosterErrors((old) => ({ ...old, [registration.id]: "" }));
    setRosterMessages((old) => ({ ...old, [registration.id]: "" }));
    try {
      const db = supabase as any;
      const { error: rpcError } = await db.rpc("mel_add_roster_player", {
        p_registration_id: registration.id,
        p_user_id: player.id,
        p_role: role,
      });
      if (rpcError) throw rpcError;
      setRosterMessages((old) => ({ ...old, [registration.id]: `${player.display_name} ajouté(e) comme ${role === "starter" ? "titulaire" : "remplaçant"}.` }));
      setPlayerResults((old) => ({ ...old, [registration.id]: [] }));
      setPlayerQueries((old) => ({ ...old, [registration.id]: "" }));
      await loadData();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Erreur inconnue.";
      setRosterErrors((old) => ({ ...old, [registration.id]: `Ajout impossible : ${message}` }));
    } finally { setRosterBusy(null); }
  }

  useEffect(() => { void loadData(); }, []);

  const publicTeams = registrations.filter((registration) => registration.teams && registration.status === "approved");

  return (
    <Page>
      <PageHeader eyebrow={season?.name ?? "Saison"} title="Équipes" desc="Crée ton équipe, inscris-la à la saison et gère son roster." />

      <div className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Panel>
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Plus className="h-5 w-5" /></span>
            <div><h2 className="font-display text-lg font-bold">Créer une équipe</h2><p className="text-sm text-muted-foreground">Tu deviendras automatiquement capitaine.</p></div>
          </div>
          {!userId ? <div className="space-y-3"><p className="text-sm text-muted-foreground">Connecte-toi à ton compte MEL pour créer une équipe.</p><a href="/connexion" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Se connecter / s’inscrire</a></div>
            : <form onSubmit={handleCreateTeam} className="space-y-3">
              <label className="block space-y-1.5"><span className="text-sm font-medium">Nom de l’équipe</span><input value={teamName} onChange={(event) => { setTeamName(event.target.value); setCreateError(null); setCreateMessage(null); }} required minLength={2} maxLength={40} placeholder="Ex. Monsters Stars" className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40" /></label>
              <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">Identifiant : <span className="font-mono text-foreground">{makeSlug(teamName) || "nom-de-equipe"}</span></div>
              {createError && <p role="alert" className="text-sm text-destructive">{createError}</p>}
              {createMessage && <p role="status" className="text-sm text-primary">{createMessage}</p>}
              <button type="submit" disabled={creating || teamName.trim().length < 2} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"><Plus className="h-4 w-4" />{creating ? "Création…" : "Créer mon équipe"}</button>
            </form>}
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="font-display text-lg font-bold">Mes équipes créées</h2><p className="text-sm text-muted-foreground">Inscription saisonnière et gestion du roster.</p></div></div>
          {!userId ? <p className="text-sm text-muted-foreground">Connecte-toi pour consulter tes équipes.</p>
            : createdTeams.length === 0 ? <p className="text-sm text-muted-foreground">Tu n’as pas encore créé d’équipe.</p>
            : <div className="space-y-4">{createdTeams.map((team) => {
              const registration = registrations.find((item) => item.team_id === team.id);
              const roster = (registration?.season_roster ?? []).filter((player) => player.status === "active");
              const canEdit = !!registration && ["pending", "approved"].includes(registration.status);
              return <div key={team.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold">{team.name}</p><p className="text-xs text-muted-foreground">{team.slug}</p></div><span className="shrink-0 rounded bg-muted px-2 py-1 text-[10px] uppercase text-muted-foreground">{team.status}</span></div>
                {!season ? <p className="mt-3 text-sm text-muted-foreground">Aucune saison ouverte pour le moment.</p>
                  : !registration ? <div className="mt-3"><p className="mb-2 text-xs text-muted-foreground">Cette équipe n’est pas encore inscrite à {season.name}.</p><button onClick={() => void registerTeam(team)} disabled={busyRegistration === team.id} className="w-full rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">{busyRegistration === team.id ? "Inscription…" : "Inscrire à la saison"}</button></div>
                  : <>
                    <p className="mt-3 text-xs text-muted-foreground">Inscription : <strong className="text-foreground">{registration.status === "pending" ? "En attente de 3 titulaires actifs" : registration.status === "approved" ? "Admissible — classement officiel" : registration.status === "withdrawn" ? "Retirée" : "Disqualifiée"}</strong></p>
                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Users className="h-4 w-4" /> Composition ({roster.length}/4)</div>
                    {roster.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Aucun joueur dans le roster saisonnier.</p>
                      : <ul className="mt-2 space-y-2">{roster.map((player) => <li key={player.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm"><span className="min-w-0 truncate">{player.profiles?.display_name ?? player.profiles?.username ?? "Joueur"}</span><span className="shrink-0 rounded bg-background px-2 py-1 text-[10px] uppercase text-muted-foreground">{player.role === "starter" ? "Titulaire" : "Remplaçant"}</span></li>)}</ul>}
                    {canEdit && <div className="mt-4 border-t pt-3">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><UserPlus className="h-4 w-4" /> Ajouter un joueur</div>
                      <label className="block space-y-1"><span className="text-xs text-muted-foreground">Pseudo MEL (identifiant ou nom affiché)</span><input value={playerQueries[registration.id] ?? ""} onChange={(event) => setPlayerQueries((old) => ({ ...old, [registration.id]: event.target.value }))} placeholder="Ex. Pugnae" className="w-full rounded-md border bg-background px-3 py-2 text-sm" /></label>
                      <div className="mt-2 flex gap-2"><select value={playerRoles[registration.id] ?? "starter"} onChange={(event) => setPlayerRoles((old) => ({ ...old, [registration.id]: event.target.value as "starter" | "substitute" }))} className="min-w-0 flex-1 rounded-md border bg-background px-2 py-2 text-sm"><option value="starter">Titulaire</option><option value="substitute">Remplaçant</option></select><button onClick={() => void searchPlayers(registration.id)} className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm"><ClipboardList className="h-4 w-4" /> Rechercher</button></div>
                      {rosterErrors[registration.id] && <p role="alert" className="mt-2 text-xs text-destructive">{rosterErrors[registration.id]}</p>}
                      {rosterMessages[registration.id] && <p role="status" className="mt-2 text-xs text-primary">{rosterMessages[registration.id]}</p>}
                      {(playerResults[registration.id] ?? []).length > 0 && <ul className="mt-2 space-y-2">{playerResults[registration.id].map((player) => <li key={player.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-2"><div className="min-w-0"><p className="truncate text-sm font-medium">{player.display_name}</p><p className="truncate text-xs text-muted-foreground">@{player.username}</p></div><button onClick={() => void addPlayer(registration, player)} disabled={!!rosterBusy} className="shrink-0 rounded-md bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">{rosterBusy === `${registration.id}:${player.id}` ? "Ajout…" : "Ajouter"}</button></li>)}</ul>}
                    </div>}
                  </>}
                {rosterErrors[team.id] && <p role="alert" className="mt-2 text-xs text-destructive">{rosterErrors[team.id]}</p>}
                {rosterMessages[team.id] && <p role="status" className="mt-2 text-xs text-primary">{rosterMessages[team.id]}</p>}
              </div>;
            })}</div>}
        </Panel>
      </div>

      <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="font-display text-xl font-bold">Classement des équipes inscrites</h2><p className="text-sm text-muted-foreground">Les équipes rejoignent automatiquement le classement dès que leur composition compte 3 titulaires actifs.</p></div><button onClick={() => void loadData()} disabled={loading} className="inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Actualiser</button></div>
      {loading ? <Panel><p className="text-sm text-muted-foreground">Chargement des équipes…</p></Panel>
        : error ? <Panel><p className="text-sm text-destructive">{error}</p><button className="mt-3 rounded-md border px-3 py-2 text-sm" onClick={() => void loadData()}>Réessayer</button></Panel>
        : publicTeams.length === 0 ? <EmptyState title={season ? "Aucune équipe inscrite" : "Aucune saison ouverte"} desc={season ? "Les équipes apparaîtront ici dès que leur composition comptera 3 titulaires actifs." : "Les équipes seront affichées lorsqu'une saison sera ouverte."} />
        : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{publicTeams.map((registration) => {
          const team = registration.teams!;
          const roster = (registration.season_roster ?? []).filter((player) => player.status === "active");
          const winRate = registration.validated_matches > 0 ? Math.round(registration.wins / registration.validated_matches * 100) : 0;
          return <Panel key={registration.id}><div className="flex items-center gap-4">{team.logo_url ? <img src={team.logo_url} alt={`Logo ${team.name}`} className="h-14 w-14 rounded-lg border object-cover" /> : <span className="grid h-14 w-14 place-items-center rounded-lg border bg-primary/10 font-display text-lg font-bold text-primary">{team.name.slice(0, 2).toUpperCase()}</span>}<div className="min-w-0 flex-1"><h3 className="truncate font-display text-lg font-bold">{team.name}</h3><p className="text-xs text-muted-foreground">{team.slug}</p></div><p className="font-display text-xl font-bold text-primary">{registration.elo}</p></div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-md bg-muted/50 p-2"><p className="font-display text-base font-bold">{registration.wins}</p>Victoires</div><div className="rounded-md bg-muted/50 p-2"><p className="font-display text-base font-bold">{registration.losses}</p>Défaites</div><div className="rounded-md bg-muted/50 p-2"><p className="font-display text-base font-bold">{winRate}%</p>Win rate</div></div>
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Users className="h-4 w-4" /> Roster ({roster.length}/4)</div>{roster.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Aucun joueur visible pour le moment.</p> : <ul className="mt-2 space-y-2">{roster.map((player) => <li key={player.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm"><span className="min-w-0 truncate">{player.profiles?.display_name ?? player.profiles?.username ?? "Joueur"}</span><span className="shrink-0 rounded bg-background px-2 py-1 text-[10px] uppercase text-muted-foreground">{player.role === "starter" ? "Titulaire" : "Remplaçant"}</span></li>)}</ul>}
          </Panel>;
        })}</div>}
    </Page>
  );
}
