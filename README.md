# EasyFormul Web

Version web de l'application EasyFormul construite avec **React + Vite** et un backend **Supabase**.

## Ce qui est inclus

- Authentification Supabase par email/mot de passe
- Tableau de bord de pilotage
- CRUD des nutriments avec notion de nutriments obligatoires
- CRUD des ingredients avec prix courants et composition nutritionnelle
- CRUD des animaux, besoins, contraintes nutritionnelles et ratios
- Import et export Excel du referentiel
- Studio de formulation avec:
  - selection du besoin
  - selection progressive des ingredients par categorie
  - prise en compte des contraintes obligatoires et optionnelles
  - solveur least-cost en JavaScript
- Historique des formulations sauvegardees

## Stack

- React 19
- Vite
- React Router
- React Query
- Supabase JS
- `xlsx` pour l'import/export Excel
- `javascript-lp-solver` pour la formulation least-cost

## Demarrage

### 1. Installer les dependances

```bash
npm install
```

### 2. Configurer Supabase

Copier `.env.example` en `.env` puis renseigner :

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

### 3. Creer la base

Dans Supabase SQL Editor, executer :

`supabase/migrations/20260429_easyformul.sql`

Cette migration cree :

- les tables metier
- les vues de catalogue
- les politiques RLS
- les donnees de base pour les unites, nutriments, categories et quelques besoins

### 4. Lancer l'application

```bash
npm run dev
```

### 5. Build production

```bash
npm run build
```

## Structure rapide

```text
easyformul-web/
  src/
    components/
    hooks/
    lib/
    pages/
    services/
  supabase/
    migrations/
```

## Notes importantes

- Le backend est entierement porte par Supabase. Il n'y a pas de serveur Node separe.
- La session utilisateur est persistante dans le navigateur via Supabase Auth.
- Le solveur web reproduit la logique de formulation sur une base de `100 kg`, puis projette le resultat sur la base choisie.
- L'import Excel travaille en ajout / mise a jour et ne supprime pas automatiquement les donnees existantes.
