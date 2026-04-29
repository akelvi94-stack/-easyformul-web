import { useState } from "react";
import toast from "react-hot-toast";
import { LockKeyhole, Mail, Wheat } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (mode === "signin") {
        const { error } = await signIn({
          email: form.email,
          password: form.password,
        });
        if (error) {
          throw error;
        }
        toast.success("Connexion reussie.");
      } else {
        const { error } = await signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              full_name: form.fullName,
            },
          },
        });
        if (error) {
          throw error;
        }
        toast.success("Compte cree. Verifiez votre boite mail si la confirmation est active.");
      }
    } catch (error) {
      toast.error(error.message || "Operation impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-hero">
        <div className="brand">
          <div className="brand__mark">
            <Wheat size={20} />
          </div>
          <div>
            <p className="eyebrow">Formulation animale</p>
            <h1>EasyFormul Web</h1>
          </div>
        </div>

        <h2>Concevoir vos formules, suivre vos besoins et piloter vos intrants.</h2>
        <p>
          Une version web orientee production pour centraliser les nutriments,
          ingredients, besoins d'animaux et formulations least-cost dans
          Supabase.
        </p>

        <div className="hero-bullets">
          <span>Selection progressive des ingredients par categorie</span>
          <span>Contraintes nutritionnelles obligatoires et optionnelles</span>
          <span>Import et export Excel du referentiel</span>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-card__switch">
          <button
            type="button"
            className={mode === "signin" ? "is-active" : ""}
            onClick={() => setMode("signin")}
          >
            Connexion
          </button>
          <button
            type="button"
            className={mode === "signup" ? "is-active" : ""}
            onClick={() => setMode("signup")}
          >
            Creation de compte
          </button>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          {mode === "signup" ? (
            <label className="field">
              <span>Nom complet</span>
              <input
                name="fullName"
                placeholder="Administrateur alimentation"
                value={form.fullName}
                onChange={updateField}
              />
            </label>
          ) : null}

          <label className="field">
            <span>Email</span>
            <div className="input-icon">
              <Mail size={16} />
              <input
                type="email"
                name="email"
                placeholder="vous@easyformul.app"
                value={form.email}
                onChange={updateField}
                required
              />
            </div>
          </label>

          <label className="field">
            <span>Mot de passe</span>
            <div className="input-icon">
              <LockKeyhole size={16} />
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={updateField}
                required
              />
            </div>
          </label>

          <button className="btn btn--primary btn--block" type="submit" disabled={submitting}>
            {submitting
              ? "Traitement..."
              : mode === "signin"
                ? "Se connecter"
                : "Creer mon compte"}
          </button>
        </form>
      </section>
    </div>
  );
}
