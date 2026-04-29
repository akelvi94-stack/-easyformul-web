import { Suspense, lazy } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { isSupabaseConfigured } from "./lib/supabase";
import { useAuth } from "./hooks/useAuth";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { SetupPage } from "./pages/SetupPage";

const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })),
);
const NutrientsPage = lazy(() =>
  import("./pages/NutrientsPage").then((module) => ({ default: module.NutrientsPage })),
);
const IngredientsPage = lazy(() =>
  import("./pages/IngredientsPage").then((module) => ({ default: module.IngredientsPage })),
);
const AnimalsPage = lazy(() =>
  import("./pages/AnimalsPage").then((module) => ({ default: module.AnimalsPage })),
);
const ImportsPage = lazy(() =>
  import("./pages/ImportsPage").then((module) => ({ default: module.ImportsPage })),
);
const FormulationStudioPage = lazy(() =>
  import("./pages/FormulationStudioPage").then((module) => ({
    default: module.FormulationStudioPage,
  })),
);
const FormulationsPage = lazy(() =>
  import("./pages/FormulationsPage").then((module) => ({ default: module.FormulationsPage })),
);

function FullscreenLoader() {
  return (
    <div className="fullscreen-state">
      <div className="state-card">
        <Loader2 className="spin text-accent" size={28} />
        <h2>Connexion a EasyFormul Web</h2>
        <p>Nous restaurons votre session Supabase.</p>
      </div>
    </div>
  );
}

function ProtectedArea() {
  const { session, loading } = useAuth();

  if (loading) {
    return <FullscreenLoader />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell />;
}

function PublicOnly() {
  const { session, loading } = useAuth();

  if (loading) {
    return <FullscreenLoader />;
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default function App() {
  if (!isSupabaseConfigured) {
    return <SetupPage />;
  }

  return (
    <Suspense fallback={<FullscreenLoader />}>
      <Routes>
        <Route element={<PublicOnly />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedArea />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/referentiel/nutriments" element={<NutrientsPage />} />
          <Route path="/referentiel/ingredients" element={<IngredientsPage />} />
          <Route path="/referentiel/animaux" element={<AnimalsPage />} />
          <Route path="/imports" element={<ImportsPage />} />
          <Route path="/formulation" element={<FormulationStudioPage />} />
          <Route path="/formulations" element={<FormulationsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
