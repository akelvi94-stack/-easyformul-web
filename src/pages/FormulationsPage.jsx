import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "../components/ui/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { EmptyState } from "../components/ui/EmptyState";
import { formatCurrency, formatNumber } from "../lib/utils";
import { getFormulationDetails, listFormulations } from "../services/formulationService";

export function FormulationsPage() {
  const [selectedId, setSelectedId] = useState(null);

  const { data: formulations = [], isLoading } = useQuery({
    queryKey: ["formulations"],
    queryFn: listFormulations,
  });

  const detailQuery = useQuery({
    queryKey: ["formulation-detail", selectedId],
    queryFn: () => getFormulationDetails(selectedId),
    enabled: Boolean(selectedId),
  });

  useEffect(() => {
    if (!selectedId && formulations.length) {
      setSelectedId(formulations[0].id);
    }
  }, [formulations, selectedId]);

  return (
    <div className="page">
      <PageHeader
        title="Historique des formulations"
        description="Consultation des formulations sauvegardees et de leurs lignes d'incorporation."
      />

      <div className="content-grid content-grid--two">
        <SectionCard title="Formulations enregistrees" subtitle="Cout, besoin et statut">
          {isLoading ? (
            <div className="panel-placeholder">Chargement...</div>
          ) : formulations.length ? (
            <div className="list-stack selectable-list">
              {formulations.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`selectable-list__item ${selectedId === item.id ? "is-selected" : ""}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <strong>{item.name}</strong>
                  <span>{item.need_name}</span>
                  <div className="list-row__meta">
                    <span className="pill">{item.status}</span>
                    <strong>{formatCurrency(item.total_cost)}</strong>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Aucune formulation"
              description="Les formules enregistrees apparaitront ici."
            />
          )}
        </SectionCard>

        <SectionCard title="Detail" subtitle="Composition et quantites">
          {!detailQuery.data ? (
            <EmptyState
              title="Selectionnez une formulation"
              description="Le detail de la formule apparaitra ici."
            />
          ) : (
            <div className="list-stack">
              <article className="detail-summary">
                <strong>{detailQuery.data.name}</strong>
                <p>{detailQuery.data.needs?.name}</p>
                <div className="stack-inline">
                  <span className="pill">{detailQuery.data.status}</span>
                  <span>{formatCurrency(detailQuery.data.total_cost)}</span>
                  <span>{formatNumber(detailQuery.data.base_calculation)} kg</span>
                </div>
              </article>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th>Proportion</th>
                      <th>Quantite</th>
                      <th>Cout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detailQuery.data.formulation_ingredients ?? []).map((row, index) => (
                      <tr key={`${row.ingredients?.id}-${index}`}>
                        <td>{row.ingredients?.name}</td>
                        <td>{formatNumber(row.proportion)} %</td>
                        <td>{formatNumber(row.quantity_kg)} kg</td>
                        <td>{formatCurrency(row.cost_fcfa)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
