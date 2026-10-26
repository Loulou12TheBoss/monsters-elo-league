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

function normalizeBrawlTag(value: string) {
  const cleaned = value.trim().replace(/^#/, "").replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z0-9]{3,15}$/.test(cleaned)) {
    throw new Error("Le tag Brawl Stars doit contenir entre 3 et 15 lettres ou chiffres (avec ou sans #). ");
  }
  return `#${cleaned}`;
}

async function saveBrawlTag(userId: string, rawTag: string) {
  const tag = normalizeBrawlTag(rawTag);
  const db = supabase as any;
  const { data: existing, error: readError } = await db
    .from("brawl_accounts")
    .select("id, player_tag, verified_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) throw readError;

  if (existing && existing.verified_at) {
    const existingTag = normalizeBrawlTag(existing.player_tag);
    if (existingTag !== tag) {
      throw new Error("Ce compte Brawl Stars est verrouillé car il est marqué comme vérifié. Contacte un administrateur pour le modifier.");
    }
    return tag;
  }

  if (existing) {
    const existingTag = normalizeBrawlTag(existing.player_tag);
    if (existingTag === tag) return tag;
    const { error: deleteError } = await db.from("brawl_accounts").delete().eq("id", existing.id);
    if (deleteError) throw deleteError;
  }

  const { error: insertError } = await db.from("brawl_accounts").insert({
    user_id: userId,
    player_tag: tag,
    player_name: null,
    verified_at: null,
    verification_method: null,
  });
  if (insertError) {
    if (String(insertError.code) === "23505") {
      throw new Error("Ce tag Brawl Stars est déjà associé à un autre compte MEL.");
    }
    throw insertError;
  }
  return tag;
}

function Connexion() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [brawlTag, setBrawlTag] = useState("");
  const [accountTag, setAccountTag] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setUserId(data.session?.user.id ?? null);
      setSignedInEmail(data.session?.user.email ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setSignedInEmail(session?.user.email ?? null);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadAccountTag() {
      if (!userId) {
        setAccountTag(null);
        return;
      }
      const { data, error: readError } = await (supabase as any)
        .from("brawl_accounts")
        .select("player_tag")
        .eq("user_id", userId)
        .maybeSingle();
      if (!active) return;
      if (readError) setError(readError.message);
      else {
        setAccountTag(data?.player_tag ?? null);
        if (data?.player_tag) setBrawlTag(data.player_tag);
      }
    }
    void loadAccountTag();
    return () => { active = false; };
  }, [userId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signup") {
        const cleanUsername = username.trim();
        const cleanDisplayName = displayName.trim();
        if (cleanUsername.length < 3 || cleanUsername.length > 24) {
          throw new Error("L’identifiant MEL doit contenir entre 3 et 24 caractères.");
        }
        if (cleanDisplayName.length < 1 || cleanDisplayName.length > 40) {
          throw new Error("Le nom affiché doit contenir entre 1 et 40 caractères.");
        }
        const cleanBrawlTag = normalizeBrawlTag(brawlTag);
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: cleanUsername,
              display_name: cleanDisplayName,
              brawl_tag: cleanBrawlTag,
            },
          },
        });
        if (signUpError) throw signUpError;
        if (!data.user) throw new Error("Le compte a été créé, mais ses informations ne sont pas disponibles. Essaie de te connecter.");

        if (!data.session) {
          setMessage("Compte créé ! Confirme ton adresse e-mail. Ton tag Brawl Stars est conservé et sera enregistré à ta première connexion.");
        } else {
          const savedTag = await saveBrawlTag(data.user.id, cleanBrawlTag);
          setAccountTag(savedTag);
          setMessage("Compte créé et tag Brawl Stars enregistré.");
          await navigate({ to: "/equipes" });
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        const metadataTag = data.user.user_metadata?.brawl_tag;
        if (typeof metadataTag === "string" && metadataTag.trim()) {
          const savedTag = await saveBrawlTag(data.user.id, metadataTag);
          setAccountTag(savedTag);
        }
        setMessage("Connexion réussie !");
        await navigate({ to: "/equipes" });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Une erreur est survenue. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const savedTag = await saveBrawlTag(userId, brawlTag);
      const { error: metadataError } = await supabase.auth.updateUser({ data: { brawl_tag: savedTag } });
      if (metadataError) throw metadataError;
      setAccountTag(savedTag);
      setBrawlTag(savedTag);
      setMessage("Tag Brawl Stars enregistré.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible d’enregistrer ce tag.");
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
      setUserId(null);
      setAccountTag(null);
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
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="text-muted-foreground">Tag Brawl Stars associé</p>
                {accountTag ? (
                  <p className="mt-1 font-semibold">{accountTag}</p>
                ) : (
                  <p className="mt-1">Aucun tag enregistré pour le moment.</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">Le tag est déclaré par le joueur et n’est pas vérifié automatiquement.</p>
              </div>
              <form onSubmit={handleSaveTag} className="space-y-2">
                <label className="block space-y-1">
                  <span className="text-sm font-medium">{accountTag ? "Modifier mon tag Brawl Stars" : "Ajouter mon tag Brawl Stars"}</span>
                  <input
                    required
                    value={brawlTag}
                    onChange={(event) => setBrawlTag(event.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="#ABC123XYZ"
                    maxLength={16}
                  />
                </label>
                <button type="submit" disabled={loading} className="w-full rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50">
                  {loading ? "Enregistrement…" : "Enregistrer le tag"}
                </button>
              </form>
              {message && <p role="status" className="text-sm text-primary">{message}</p>}
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <button type="button" onClick={handleSignOut} disabled={loading} className="w-full rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50">
                {loading ? "Déconnexion…" : "Se déconnecter"}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
                <button type="button" onClick={() => { setMode("login"); setError(""); setMessage(""); }} className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === "login" ? "bg-background shadow" : "text-muted-foreground"}`}>
                  Connexion
                </button>
                <button type="button" onClick={() => { setMode("signup"); setError(""); setMessage(""); }} className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === "signup" ? "bg-background shadow" : "text-muted-foreground"}`}>
                  Inscription
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <>
                    <label className="block space-y-1">
                      <span className="text-sm font-medium">Identifiant unique MEL</span>
                      <input required autoComplete="username" minLength={3} maxLength={24} value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="ex. Pugnae" />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-sm font-medium">Nom affiché</span>
                      <input required autoComplete="nickname" maxLength={40} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Le nom visible sur MEL" />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-sm font-medium">Tag Brawl Stars (obligatoire)</span>
                      <input required value={brawlTag} onChange={(event) => setBrawlTag(event.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="#ABC123XYZ" maxLength={16} />
                      <span className="block text-xs text-muted-foreground">Saisis le tag de ton profil Brawl Stars, avec ou sans #. Il sera enregistré sans vérification de propriété.</span>
                    </label>
                  </>
                )}
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Adresse e-mail</span>
                  <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="toi@exemple.fr" />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Mot de passe</span>
                  <input required type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="6 caractères minimum" />
                </label>

                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                {message && <p role="status" className="text-sm text-primary">{message}</p>}

                <button type="submit" disabled={loading} className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
                  {loading ? "Patiente…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
                </button>
              </form>
              {mode === "signup" && <p className="mt-4 text-xs text-muted-foreground">Une confirmation sera envoyée par e-mail avant de pouvoir te connecter.</p>}
            </>
          )}
        </Panel>
      </div>
    </Page>
  );
}
