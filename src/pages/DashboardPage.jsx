import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "../components/ui/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { MetricCard } from "../components/ui/MetricCard";
import { EmptyState } from "../components/ui/EmptyState";
import { fetchDashboardSnapshot } from "../services/dashboardService";
import { formatCurrency } from "../lib/utils";

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardSnapshot,
  });

  if (isLoading) {
    return <div className="panel-placeholder">Chargement du tableau de bord...</div>;
  }

  if (error) {
    return <div className="panel-placeholder">Impossible de charger le tableau de bord.</div>;
  }

  return (
    <div className="page">
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble du referentiel, des besoins et des dernieres formulations enregistrees."
      />

      <div className="metrics-grid">
        <MetricCard label="Animaux" value={data.animalsCount} />
        <MetricCard label="Besoins" value={data.needsCount} />
        <MetricCard label="Ingredients" value={data.ingredientsCount} />
        <MetricCard label="Nutriments" value={data.nutrientsCount} />
        <MetricCard label="Formulations" value={data.formulationsCount} />
      </div>

      <div className="content-grid content-grid--two">
        <SectionCard
          title="Dernieres formulations"
          subtitle="Formules sauvegardees les plus recentes"
        >
          {data.recentFormulations.length ? (
            <div className="list-stack">
              {data.recentFormulations.map((item) => (
                <article className="list-row" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <p>
                      {item.need_name} • {item.animal_label}
                    </p>
                  </div>
                  <div className="list-row__meta">
                    <span className="pill">{item.status}</span>
                    <strong>{formatCurrency(item.total_cost)}</strong>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Aucune formulation"
              description="Les formulations sauvegardees apparaitront ici."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Ingredients sans prix"
          subtitle="A surveiller avant un calcul least-cost"
        >
          {data.priceAlerts.length ? (
            <div className="list-stack">
              {data.priceAlerts.map((item) => (
                <article className="list-row" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.category_name}</p>
                  </div>
                  <span className="pill pill--warning">Prix manquant</span>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Tous les prix sont renseignes"
              description="Le catalogue ingredients est pret pour la formulation."
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
