import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Page, PageHeader, Panel } from "@/components/mel";

export const Route = createFileRoute("/connexion")({
  head: () => ({
    meta: [
      { title: "Connexion — Monsters ELO League" },
      { name: "description", content: "Créer un compte ou se connecter à la Monsters ELO League." },
    ],
  }),
  component: Connexion,
});

function Connexion() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setSignedInEmail(data.session?.user.email ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedInEmail(session?.user.email ?? null);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signup") {
        const cleanUsername = username.trim();
        const cleanDisplayName = displayName.trim();
        if (!cleanUsername || !cleanDisplayName) {
          setError("Renseigne ton identifiant et ton nom affiché.");
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: cleanUsername,
              display_name: cleanDisplayName,
            },
          },
        });
        if (signUpError) throw signUpError;

        if (!data.session) {
          setMessage("Compte créé ! Vérifie ta boîte mail et clique sur le lien de confirmation avant de te connecter.");
        } else {
          setMessage("Compte créé et connecté.");
          await navigate({ to: "/equipes" });
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        setMessage("Connexion réussie !");
        await navigate({ to: "/equipes" });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Une erreur est survenue. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    setLoading(true);
    setError("");
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
    else {
      setSignedInEmail(null);
      setMessage("Tu es déconnecté.");
    }
    setLoading(false);
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Espace joueur"
        title={signedInEmail ? "Ton compte MEL" : mode === "login" ? "Connexion" : "Créer un compte"}
        desc="Connecte-toi pour accéder aux fonctionnalités liées à ton équipe."
      />
      <div className="mx-auto max-w-xl">
        <Panel>
          {signedInEmail ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Connecté avec l’adresse :</p>
              <p className="break-all font-semibold">{signedInEmail}</p>
              {message && <p role="status" className="text-sm text-primary">{message}</p>}
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <button
                type="button"
                onClick={handleSignOut}
                disabled={loading}
                className="w-full rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
              >
                {loading ? "Déconnexion…" : "Se déconnecter"}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(""); setMessage(""); }}
                  className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === "login" ? "bg-background shadow" : "text-muted-foreground"}`}
                >
                  Connexion
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setError(""); setMessage(""); }}
                  className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === "signup" ? "bg-background shadow" : "text-muted-foreground"}`}
                >
                  Inscription
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <>
                    <label className="block space-y-1">
                      <span className="text-sm font-medium">Identifiant unique</span>
                      <input
                        required
                        autoComplete="username"
                        minLength={3}
                        maxLength={24}
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        placeholder="ex. Pugnae"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-sm font-medium">Nom affiché</span>
                      <input
                        required
                        autoComplete="nickname"
                        maxLength={40}
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        placeholder="Le nom visible sur MEL"
                      />
                    </label>
                  </>
                )}
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Adresse e-mail</span>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="toi@exemple.fr"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Mot de passe</span>
                  <input
                    required
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="6 caractères minimum"
                  />
                </label>

                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                {message && <p role="status" className="text-sm text-primary">{message}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Patiente…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
                </button>
              </form>
              {mode === "signup" && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Une confirmation sera envoyée par e-mail avant de pouvoir te connecter.
                </p>
              )}
            </>
          )}
        </Panel>
      </div>
    </Page>
  );
}
