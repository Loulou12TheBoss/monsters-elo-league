
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RefreshCw, Users } from "lucide-react";
import {
  EmptyState,
  Page,
  PageHeader,
  Panel,
} from "@/components/mel";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/equipes")({
  head: () => ({
    meta: [
      { title: "Équipes — Monsters ELO League" },
      {
        name: "description",
        content: "Découvrez les équipes de la Monsters ELO League.",
      },
      { property: "og:title", content: "Équipes — MEL" },
      {
        property: "og:description",
        content: "Les équipes de la Monsters ELO League.",
      },
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
  profiles: {
    username: string;
    display_name: string;
  } | null;
};

type SeasonRegistration = {
  id: string;
  team_id: string;
  elo: number;
  validated_matches: number;
  wins: number;
  losses: number;
  status: string;
  season_roster: RosterPlayer[] | null;
};

type Team = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  registration: SeasonRegistration | null;
};

function Equipes() {
  const [seasonName, setSeasonName] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadTeams() {
    setLoading(true);
    setError(null);

    try {
      const db = supabase as any;

      // Trouver la saison en cours ou ouverte aux inscriptions.
      const { data: season, error: seasonError } = await db
        .from("seasons")
        .select("id, name, season_number")
        .in("status", ["active", "registration_open"])
        .order("season_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (seasonError) throw seasonError;

      setSeasonName(season?.name ?? null);

      // Charger toutes les équipes actives, même celles
      // qui ne sont pas encore inscrites à la saison.
      const { data: teamData, error: teamsError } = await db
        .from("teams")
        .select("id, name, slug, logo_url, status")
        .eq("status", "active")
        .order("name", { ascending: true });

      if (teamsError) throw teamsError;

      const teamList = teamData ?? [];

      if (teamList.length === 0) {
        setTeams([]);
        return;
      }

      let registrations: SeasonRegistration[] = [];

      if (season) {
        const {
          data: registrationData,
          error: registrationsError,
        } = await db
          .from("season_registrations")
          .select(
            "id, team_id, elo, validated_matches, wins, losses, status, season_roster(id, user_id, role, status, profiles(username, display_name))"
          )
          .eq("season_id", season.id);

        if (registrationsError) throw registrationsError;

        registrations = (registrationData ?? []) as SeasonRegistration[];
      }

      const registrationByTeam = new Map(
        registrations.map((registration) => [
          registration.team_id,
          registration,
        ])
      );

      setTeams(
        teamList.map((team: Omit<Team, "registration">) => ({
          ...team,
          registration: registrationByTeam.get(team.id) ?? null,
        }))
      );
    } catch (cause) {
      console.error("[MEL] Impossible de charger les équipes", cause);
      setError(
        "Impossible de charger les équipes depuis Supabase. Vérifie la connexion et les autorisations RLS."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTeams();
  }, []);

  return (
    <Page>
      <PageHeader
        eyebrow={seasonName ?? "Monsters ELO League"}
        title="Équipes"
        desc="Découvrez les équipes actives, leurs statistiques de saison et leurs joueurs inscrits."
      />

      <div className="mb-5 flex justify-end">
        <button
          onClick={() => void loadTeams()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </button>
      </div>

      {loading ? (
        <Panel>
          <p className="text-sm text-muted-foreground">
            Chargement des équipes…
          </p>
        </Panel>
      ) : error ? (
        <Panel>
          <p className="text-sm text-destructive">{error}</p>
          <button
            className="mt-3 rounded-md border px-3 py-2 text-sm"
            onClick={() => void loadTeams()}
          >
            Réessayer
          </button>
        </Panel>
      ) : teams.length === 0 ? (
        <EmptyState
          title="Aucune équipe pour le moment"
          desc="Les équipes apparaîtront ici lorsqu'elles auront été créées dans la MEL."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => {
            const registration =
              team.registration?.status === "approved"
                ? team.registration
                : null;

            const roster = (registration?.season_roster ?? []).filter(
              (player) => player.status === "active"
            );

            const winRate =
              registration && registration.validated_matches > 0
                ? Math.round(
                    (registration.wins /
                      registration.validated_matches) *
                      100
                  )
                : 0;

            const registrationLabel = registration
              ? "Inscrite à la saison"
              : team.registration?.status === "pending"
                ? "Inscription en attente"
                : "Pas encore inscrite";

            return (
              <Panel key={team.id} className="fade-up">
                <div className="flex items-center gap-4">
                  {team.logo_url ? (
                    <img
                      src={team.logo_url}
                      alt={`Logo ${team.name}`}
                      className="h-14 w-14 rounded-lg border object-cover"
                    />
                  ) : (
                    <span className="grid h-14 w-14 place-items-center rounded-lg border bg-primary/10 font-display text-lg font-bold text-primary">
                      {team.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-lg font-bold">
                      {team.name}
                    </h2>
                    <p className="truncate text-xs text-muted-foreground">
                      {team.slug}
                    </p>
                  </div>

                  <p className="font-display text-xl font-bold text-primary">
                    {registration ? registration.elo : "—"}
                  </p>
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  {registrationLabel}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="font-display text-base font-bold">
                      {registration?.wins ?? "—"}
                    </p>
                    Victoires
                  </div>

                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="font-display text-base font-bold">
                      {registration?.losses ?? "—"}
                    </p>
                    Défaites
                  </div>

                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="font-display text-base font-bold">
                      {registration ? `${winRate}%` : "—"}
                    </p>
                    Win %
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Roster saisonnier ({roster.length}/4)
                </div>

                {!registration ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Aucun roster saisonnier approuvé.
                  </p>
                ) : roster.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Aucun joueur actif dans le roster.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {roster.map((player) => (
                      <li
                        key={player.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="min-w-0 truncate">
                          {player.profiles?.display_name ??
                            player.profiles?.username ??
                            "Joueur"}
                        </span>

                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                          {player.role === "starter"
                            ? "Titulaire"
                            : "Remplaçant"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </Page>
  );
}
