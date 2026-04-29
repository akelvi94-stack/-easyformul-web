import { useState } from "react";
import toast from "react-hot-toast";
import { LockKeyhole, Mail, Wheat } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { signIn, signUp, resendConfirmation } = useAuth();
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");

  function isEmailNotConfirmed(error) {
    const value = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
    return value.includes("email not confirmed") || value.includes("email_not_confirmed");
  }

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setConfirmationEmail("");

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
        setConfirmationEmail(form.email.trim());
        toast.success("Compte cree. Verifiez votre boite mail si la confirmation est active.");
      }
    } catch (error) {
      if (isEmailNotConfirmed(error)) {
        setConfirmationEmail(form.email.trim());
        toast.error("Email non confirme. Verifiez votre boite mail ou renvoyez le lien.");
      } else {
        toast.error(error.message || "Operation impossible.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendConfirmation() {
    if (!confirmationEmail) {
      return;
    }

    setResending(true);

    try {
      const { error } = await resendConfirmation(confirmationEmail);
      if (error) {
        throw error;
      }
      toast.success("Email de confirmation renvoye.");
    } catch (error) {
      const message = `${error?.message || ""}`.toLowerCase();
      if (message.includes("rate limit")) {
        toast.error("Trop de demandes pour le moment. Reessayez dans quelques minutes.");
      } else {
        toast.error(error.message || "Impossible de renvoyer l'email de confirmation.");
      }
    } finally {
      setResending(false);
    }
  }

  function handleModeChange(nextMode) {
    setMode(nextMode);
    if (nextMode === "signup") {
      setConfirmationEmail(form.email.trim());
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
            onClick={() => handleModeChange("signin")}
          >
            Connexion
          </button>
          <button
            type="button"
            className={mode === "signup" ? "is-active" : ""}
            onClick={() => handleModeChange("signup")}
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

          {confirmationEmail ? (
            <div className="auth-notice auth-notice--warning">
              <strong>Confirmation requise</strong>
              <p>
                Le compte <strong>{confirmationEmail}</strong> doit confirmer son
                adresse email avant la connexion.
              </p>
              <div className="auth-notice__actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={handleResendConfirmation}
                  disabled={resending}
                >
                  {resending ? "Envoi..." : "Renvoyer l'email"}
                </button>
              </div>
            </div>
          ) : null}
        </form>
      </section>
    </div>
  );
}
