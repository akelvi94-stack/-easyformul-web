import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);
const bootstrapAdminEmail = (
  import.meta.env.VITE_BOOTSTRAP_ADMIN_EMAIL ||
  import.meta.env.NEXT_PUBLIC_BOOTSTRAP_ADMIN_EMAIL ||
  ""
)
  .trim()
  .toLowerCase();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      setSession(currentSession ?? null);
      if (currentSession?.user) {
        await loadProfile(currentSession.user.id, mounted, currentSession);
      } else {
        setProfile(null);
      }
      setLoading(false);
    }

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession ?? null);
      if (nextSession?.user) {
        await loadProfile(nextSession.user.id, true, nextSession);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(userId, mounted = true, currentSession = session) {
    let data = null;

    const profileResponse = await supabase
      .from("profiles")
      .select("id, full_name, role, locale, is_active")
      .eq("id", userId)
      .maybeSingle();

    data = profileResponse.data ?? null;

    const sessionUser = currentSession?.user;
    const sessionEmail = sessionUser?.email?.trim().toLowerCase() || "";
    const shouldBootstrapAdmin =
      bootstrapAdminEmail &&
      sessionEmail === bootstrapAdminEmail &&
      data?.role !== "admin";

    if (shouldBootstrapAdmin) {
      const fullName =
        data?.full_name ||
        sessionUser?.user_metadata?.full_name ||
        sessionEmail.split("@")[0] ||
        "Administrateur";

      const { data: refreshedProfile } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            full_name: fullName,
            role: "admin",
            locale: data?.locale || "fr",
            is_active: data?.is_active ?? true,
          },
          { onConflict: "id" },
        )
        .select("id, full_name, role, locale, is_active")
        .maybeSingle();

      data = refreshedProfile ?? data;
    }

    if (mounted) {
      setProfile(data ?? null);
    }
  }

  const value = useMemo(
    () => ({
      session,
      profile,
      loading,
      signIn: (payload) => supabase.auth.signInWithPassword(payload),
      signUp: (payload) => supabase.auth.signUp(payload),
      signOut: () => supabase.auth.signOut(),
      refreshProfile: async () => {
        if (session?.user?.id) {
          await loadProfile(session.user.id, true);
        }
      },
    }),
    [loading, profile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
