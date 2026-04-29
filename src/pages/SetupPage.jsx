export function SetupPage() {
  return (
    <div className="fullscreen-state">
      <div className="setup-card">
        <p className="eyebrow">Configuration requise</p>
        <h1>EasyFormul Web est pret a etre branche a Supabase</h1>
        <p>
          Le front React/Vite est en place, mais les variables d'environnement
          Supabase ne sont pas encore renseignees.
        </p>

        <div className="setup-card__grid">
          <article>
            <h3>1. Variables d'environnement</h3>
            <p>Copiez le fichier `.env.example` vers `.env` puis renseignez :</p>
            <code>VITE_SUPABASE_URL</code>
            <code>VITE_SUPABASE_ANON_KEY</code>
            <code>VITE_BOOTSTRAP_ADMIN_EMAIL</code>
            <p>
              Les variantes <code>NEXT_PUBLIC_SUPABASE_URL</code> et{" "}
              <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> sont aussi
              acceptees.
            </p>
          </article>

          <article>
            <h3>2. Base de donnees</h3>
            <p>
              Executez la migration SQL situee dans
              <strong> `supabase/migrations/20260429_easyformul.sql`</strong>.
            </p>
          </article>

          <article>
            <h3>3. Lancer le projet</h3>
            <p>
              Depuis `easyformul-web`, lancez <code>npm install</code> puis{" "}
              <code>npm run dev</code>.
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}
