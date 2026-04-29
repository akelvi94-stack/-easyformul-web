import { LogOut, UserCircle2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export function HeaderBar() {
  const { profile, session, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
  }

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Pilotage nutritionnel</p>
        <h2>EasyFormul pour le web</h2>
      </div>

      <div className="topbar__actions">
        <div className="user-badge">
          <UserCircle2 size={18} />
          <div>
            <strong>{profile?.full_name || "Utilisateur"}</strong>
            <span>{session?.user?.email}</span>
          </div>
        </div>

        <button className="btn btn--ghost" onClick={handleSignOut} type="button">
          <LogOut size={16} />
          <span>Deconnexion</span>
        </button>
      </div>
    </header>
  );
}
