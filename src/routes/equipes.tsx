import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import { RefreshCw, Users, Plus, ShieldCheck } from "lucide-react";
import { EmptyState, Page, PageHeader, Panel } from "@/components/mel";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/equipes")({
  head: () => ({
    meta: [
      { title: "Équipes — Monsters ELO League" },
      { name: "description", content: "Créez une équipe et découvrez les équipes inscrites à la saison MEL en cours." },
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
  elo: number;
  validated_matches: number;
  wins: number;
  losses: number;
  teams: { id: string; name: string; slug: string; logo_url: string | null } | null;
  season_roster: RosterPlayer[] | null;
};
type CreatedTeam = { id: string; name: string; slug: string; status: string };

function makeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
}

function Equipes() {
  const [seasonName, setSeasonName] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<TeamRegistration[]>([]);
  const [createdTeams, setCreatedTeams] = useState<CreatedTeam[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  async function loadCreatedTeams(currentUserId: string) {
    const db = supabase as any;
    const { data, error: teamsError } = await db
      .from("teams")
      .select("id, name, slug, status")
      .eq("created_by", currentUserId)
      .order("created_at", { ascending: false });
    if (teamsError) throw teamsError;
    setCreatedTeams((data ?? []) as CreatedTeam[]);
  }

  async function loadTeams() {
    setLoading(true);
    setError(null);
    try {
      const db = supabase as any;
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const currentUserId = userData.user?.id ?? null;
      setUserId(currentUserId);
      if (currentUserId) await loadCreatedTeams(currentUserId);
      else setCreatedTeams([]);

      const { data: season, error: seasonError } = await db
        .from("seasons")
        .select("id, name, season_number")
        .in("status", ["active", "registration_open"])
        .order("season_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (seasonError) throw seasonError;
      if (!season) {
        setSeasonName(null);
        setRegistrations([]);
        return;
      }
      setSeasonName(season.name);
      const { data, error: registrationsError } = await db
        .from("season_registrations")
        .select("id, elo, validated_matches, wins, losses, teams(id, name, slug, logo_url), season_roster(id, user_id, role, status, profiles(username, display_name))")
        .eq("season_id", season.id)
        .eq("status", "approved");
      if (registrationsError) throw registrationsError;
      setRegistrations((data ?? []) as TeamRegistration[]);
    } catch (cause) {
      console.error("[MEL] Impossible de charger les équipes", cause);
      setError("Impossible de charger les équipes depuis Supabase. Vérifie la connexion et les autorisations RLS.");
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
      setCreateError("Le nom doit contenir entre 2 et 40 caractères.");
      return;
    }
    if (!slug) {
      setCreateError("Ce nom ne permet pas de créer un identifiant d’équipe valide. Essaie un autre nom.");
      return;
    }

    setCreating(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) {
        setCreateError("Connecte-toi pour créer une équipe.");
        return;
      }

      // Cette RPC sécurisée crée l'équipe et ajoute automatiquement son créateur comme capitaine.
      const db = supabase as any;
      const { data, error: rpcError } = await db.rpc("mel_create_team", {
        p_name: cleanName,
        p_slug: slug,
      });
      if (rpcError) throw rpcError;

      setTeamName("");
      setCreateMessage(`L’équipe « ${cleanName} » a été créée. Tu en es maintenant le capitaine.`);
      await loadCreatedTeams(userData.user.id);
      // Recharge aussi la liste des inscriptions approuvées; une équipe nouvellement créée
      // n'apparaît dans le classement public qu'après son inscription à la saison et approbation.
      void data;
    } catch (cause) {
      console.error("[MEL] Impossible de créer l’équipe", cause);
      const message = cause instanceof Error ? cause.message : "Une erreur inattendue est survenue.";
      if (/duplicate|unique|already exists/i.test(message)) {
        setCreateError("Ce nom ou cet identifiant d’équipe est déjà utilisé. Essaie un autre nom.");
      } else if (/captain|manager|authenticated|auth/i.test(message)) {
        setCreateError("Ta session semble avoir expiré. Reconnecte-toi puis réessaie.");
      } else {
        setCreateError(`La création a échoué : ${message}`);
      }
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => { void loadTeams(); }, []);

  return (
    <Page>
      <PageHeader eyebrow={seasonName ?? "Saison"} title="Équipes" desc="Crée ton équipe et consulte les équipes dont l'inscription à la saison est approuvée." />

      <div className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Panel>
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Plus className="h-5 w-5" /></span>
            <div><h2 className="font-display text-lg font-bold">Créer une équipe</h2><p className="text-sm text-muted-foreground">Tu deviendras automatiquement capitaine.</p></div>
          </div>
          {!userId ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Connecte-toi à ton compte MEL pour créer une équipe.</p>
              <a href="/connexion" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90">Se connecter / s’inscrire</a>
            </div>
          ) : (
            <form onSubmit={handleCreateTeam} className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Nom de l’équipe</span>
                <input value={teamName} onChange={(event) => { setTeamName(event.target.value); setCreateError(null); setCreateMessage(null); }} required minLength={2} maxLength={40} placeholder="Ex. Monsters Stars" className="w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
              </label>
              <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Identifiant : <span className="font-mono text-foreground">{makeSlug(teamName) || "nom-de-equipe"}</span>
              </div>
              {createError && <p role="alert" className="text-sm text-destructive">{createError}</p>}
              {createMessage && <p role="status" className="text-sm text-primary">{createMessage}</p>}
              <button type="submit" disabled={creating || teamName.trim().length < 2} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                <Plus className="h-4 w-4" />{creating ? "Création…" : "Créer mon équipe"}
              </button>
              <p className="text-xs text-muted-foreground">Nom : 2 à 40 caractères. L’identifiant URL est généré automatiquement.</p>
            </form>
          )}
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5" /></span>
            <div><h2 className="font-display text-lg font-bold">Mes équipes créées</h2><p className="text-sm text-muted-foreground">Les équipes que tu as créées avec ton compte.</p></div>
          </div>
          {!userId ? <p className="text-sm text-muted-foreground">Connecte-toi pour consulter tes équipes.</p>
            : createdTeams.length === 0 ? <p className="text-sm text-muted-foreground">Tu n’as pas encore créé d’équipe.</p>
            : <ul className="space-y-2">{createdTeams.map((team) => <li key={team.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-3"><div className="min-w-0"><p className="truncate font-semibold">{team.name}</p><p className="truncate text-xs text-muted-foreground">{team.slug}</p></div><span className="shrink-0 rounded bg-background px-2 py-1 text-[10px] uppercase text-muted-foreground">{team.status}</span></li>)}</ul>}
        </Panel>
      </div>

      <div className="mb-5 flex items-center justify-between gap-3">
        <div><h2 className="font-display text-xl font-bold">Équipes inscrites</h2><p className="text-sm text-muted-foreground">Seules les inscriptions approuvées sont affichées ici.</p></div>
        <button onClick={() => void loadTeams()} disabled={loading} className="inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Actualiser</button>
      </div>
      {loading ? <Panel><p className="text-sm text-muted-foreground">Chargement des équipes…</p></Panel>
        : error ? <Panel><p className="text-sm text-destructive">{error}</p><button className="mt-3 rounded-md border px-3 py-2 text-sm" onClick={() => void loadTeams()}>Réessayer</button></Panel>
        : registrations.length === 0 ? <EmptyState title={seasonName ? "Aucune équipe inscrite" : "Aucune saison ouverte"} desc={seasonName ? "Les équipes apparaîtront ici lorsque leur inscription sera approuvée." : "Les équipes seront affichées lorsqu'une saison sera active ou ouverte aux inscriptions."} />
        : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {registrations.filter((registration) => registration.teams).map((registration) => {
            const team = registration.teams!;
            const roster = (registration.season_roster ?? []).filter((player) => player.status === "active");
            const winRate = registration.validated_matches > 0 ? Math.round(registration.wins / registration.validated_matches * 100) : 0;
            return <Panel key={registration.id}>
              <div className="flex items-center gap-4">
                {team.logo_url ? <img src={team.logo_url} alt={`Logo ${team.name}`} className="h-14 w-14 rounded-lg border object-cover" /> : <span className="grid h-14 w-14 place-items-center rounded-lg border bg-primary/10 font-display text-lg font-bold text-primary">{team.name.slice(0, 2).toUpperCase()}</span>}
                <div className="min-w-0 flex-1"><h3 className="truncate font-display text-lg font-bold">{team.name}</h3><p className="text-xs text-muted-foreground">{team.slug}</p></div>
                <p className="font-display text-xl font-bold text-primary">{registration.elo}</p>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-md bg-muted/50 p-2"><p className="font-display text-base font-bold">{registration.wins}</p>Victoires</div>
                <div className="rounded-md bg-muted/50 p-2"><p className="font-display text-base font-bold">{registration.losses}</p>Défaites</div>
                <div className="rounded-md bg-muted/50 p-2"><p className="font-display text-base font-bold">{winRate}%</p>Win rate</div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Users className="h-4 w-4" /> Roster saisonnier ({roster.length}/4)</div>
              {roster.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Aucun joueur visible pour le moment.</p> : <ul className="mt-2 space-y-2">
                {roster.map((player) => <li key={player.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate font-medium">{player.profiles?.display_name ?? player.profiles?.username ?? "Joueur"}</span>
                  <span className="shrink-0 rounded bg-background px-2 py-1 text-[10px] uppercase text-muted-foreground">{player.role === "starter" ? "Titulaire" : "Remplaçant"}</span>
                </li>)}
              </ul>}
            </Panel>;
          })}
        </div>}
    </Page>
  );
}
