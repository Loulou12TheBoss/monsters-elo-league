
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { EmptyState, Page, PageHeader, Panel } from "@/components/mel";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/classement")({
  head: () => ({
    meta: [
      { title: "Classement ELO — Monsters ELO League" },
      {
        name: "description",
        content: "Classement officiel des équipes Brawl Stars de la MEL.",
      },
      { property: "og:title", content: "Classement ELO — MEL" },
      {
        property: "og:description",
        content: "Le classement des équipes de la Monsters ELO League.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Classement,
});

const sorts = {
  elo: "ELO",
  wins: "Victoires",
  played: "Matchs joués",
} as const;

type SortKey = keyof typeof sorts;

type Registration = {
  id: string;
  team_id: string;
  elo: number;
  validated_matches: number;
  wins: number;
  losses: number;
  status: string;
  teams: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  } | null;
};

function Classement() {
  const [sort, setSort] = useState<SortKey>("elo");
  const [q, setQ] = useState("");
  const [seasonName, setSeasonName] = useState<string | null>(null);
  const [rowsFromDb, setRowsFromDb] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadLeaderboard() {
    setLoading(true);
    setError(null);

    try {
      const db = supabase as any;

      const { data: season, error: seasonError } = await db
        .from("seasons")
        .select("id, name, season_number, status")
        .in("status", ["active", "registration_open"])
        .order("season_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (seasonError) throw seasonError;

      if (!season) {
        setSeasonName(null);
        setRowsFromDb([]);
        return;
      }

      setSeasonName(season.name);

      const { data, error: registrationsError } = await db
        .from("season_registrations")
        .select(
          "id, team_id, elo, validated_matches, wins, losses, status, teams(id, name, slug, logo_url)"
        )
        .eq("season_id", season.id)
        .eq("status", "approved");

      if (registrationsError) throw registrationsError;

      setRowsFromDb((data ?? []) as Registration[]);
    } catch (cause) {
      console.error("[MEL] Impossible de charger le classement", cause);
      setError(
        "Impossible de charger le classement depuis Supabase. Vérifie la connexion et les autorisations RLS."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLeaderboard();
  }, []);

  const rows = useMemo(() => {
    const search = q.trim().toLowerCase();

    return rowsFromDb
      .filter(
        (row) =>
          row.teams &&
          (!search ||
            row.teams.name.toLowerCase().includes(search) ||
            row.teams.slug.toLowerCase().includes(search))
      )
      .sort((a, b) => {
        if (sort === "wins") {
          return b.wins - a.wins || b.elo - a.elo;
        }

        if (sort === "played") {
          return (
            b.validated_matches - a.validated_matches ||
            b.elo - a.elo
          );
        }

        return b.elo - a.elo || b.wins - a.wins;
      });
  }, [rowsFromDb, sort, q]);

  return (
    <Page>
      <PageHeader
        eyebrow={seasonName ?? "Aucune saison active"}
        title="Classement"
        desc="Classement chargé depuis les inscriptions approuvées de la saison en cours. Seuls les matchs validés comptent dans les statistiques."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 rounded-lg border bg-card px-3 sm:w-80">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Rechercher une équipe…"
            className="h-10 w-full bg-transparent text-sm outline-none"
          />
        </label>

        <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
          {(Object.keys(sorts) as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                sort === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {sorts[key]}
            </button>
          ))}

          <button
            onClick={() => void loadLeaderboard()}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            aria-label="Actualiser le classement"
            title="Actualiser"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <Panel>
          <p className="text-sm text-muted-foreground">
            Chargement du classement…
          </p>
        </Panel>
      ) : error ? (
        <Panel>
          <p className="text-sm text-destructive">{error}</p>
          <button
            className="mt-3 rounded-md border px-3 py-2 text-sm"
            onClick={() => void loadLeaderboard()}
          >
            Réessayer
          </button>
        </Panel>
      ) : rows.length === 0 ? (
        <EmptyState
          title={seasonName ? "Aucune équipe inscrite" : "Aucune saison ouverte"}
          desc={
            seasonName
              ? q
                ? `Aucune équipe ne correspond à « ${q} ».`
                : "Les équipes apparaîtront ici lorsqu'une inscription sera approuvée pour cette saison."
              : "Le classement sera disponible lorsqu'une saison sera active ou ouverte aux inscriptions."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                {[
                  "Rang",
                  "Équipe",
                  "ELO",
                  "Matchs",
                  "Bilan V / D",
                  "Win %",
                ].map((heading) => (
                  <th key={heading} className="px-4 py-3 font-medium">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => {
                const team = row.teams!;
                const winRate =
                  row.validated_matches > 0
                    ? Math.round(
                        (row.wins / row.validated_matches) * 100
                      )
                    : 0;

                return (
                  <tr
                    key={row.id}
                    className="border-b last:border-0 transition-colors hover:bg-muted/50"
                  >
                    <td
                      className={cn(
                        "px-4 py-3 font-display text-lg font-bold",
                        index < 3 ? "text-gold" : "text-muted-foreground"
                      )}
                    >
                      #{index + 1}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {team.logo_url ? (
                          <img
                            src={team.logo_url}
                            alt=""
                            className="h-9 w-9 rounded-lg border object-cover"
                          />
                        ) : (
                          <span className="grid h-9 w-9 place-items-center rounded-lg border bg-primary/10 font-display font-bold text-primary">
                            {team.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}

                        <div>
                          <p className="font-semibold">{team.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {team.slug}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-display text-base font-bold text-primary">
                      {row.elo}
                    </td>

                    <td className="px-4 py-3">
                      {row.validated_matches}
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-primary">{row.wins}V</span>
                      {" / "}
                      <span className="text-destructive">
                        {row.losses}D
                      </span>
                    </td>

                    <td className="px-4 py-3 text-muted-foreground">
                      {winRate}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}
