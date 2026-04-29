import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { EmptyState } from "../components/ui/EmptyState";
import { NUTRIENT_FAMILIES } from "../lib/constants";
import { listNutrients, listUnits, saveNutrient, deleteNutrient } from "../services/catalogService";

const defaultForm = {
  id: null,
  name: "",
  code: "",
  family: NUTRIENT_FAMILIES[0],
  unit_id: "",
  mandatory: false,
  active: true,
};

export function NutrientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(defaultForm);

  const { data: nutrients = [], isLoading } = useQuery({
    queryKey: ["nutrients"],
    queryFn: listNutrients,
  });

  const { data: units = [] } = useQuery({
    queryKey: ["units"],
    queryFn: listUnits,
  });

  const saveMutation = useMutation({
    mutationFn: saveNutrient,
    onSuccess: () => {
      toast.success("Nutriment enregistre.");
      queryClient.invalidateQueries({ queryKey: ["nutrients"] });
      setForm(defaultForm);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNutrient,
    onSuccess: () => {
      toast.success("Nutriment supprime.");
      queryClient.invalidateQueries({ queryKey: ["nutrients"] });
      setForm(defaultForm);
    },
    onError: (error) => toast.error(error.message),
  });

  const filtered = useMemo(() => {
    const needle = search.toLowerCase();
    return nutrients.filter((item) =>
      [item.name, item.code, item.family, item.unit_symbol]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [nutrients, search]);

  function handleSubmit(event) {
    event.preventDefault();
    saveMutation.mutate(form);
  }

  function handleEdit(item) {
    setForm({
      id: item.id,
      name: item.name,
      code: item.code,
      family: item.family,
      unit_id: item.unit_id,
      mandatory: item.mandatory,
      active: item.active,
    });
  }

  return (
    <div className="page">
      <PageHeader
        title="Nutriments"
        description="Gerer les nutriments, leurs unites et le caractere obligatoire pour la formulation."
        actions={
          <button className="btn btn--secondary" type="button" onClick={() => setForm(defaultForm)}>
            <Plus size={16} />
            Nouveau
          </button>
        }
      />

      <div className="content-grid content-grid--two">
        <SectionCard title="Catalogue" subtitle="Liste et recherche">
          <div className="toolbar">
            <input
              placeholder="Rechercher un nutriment..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="panel-placeholder">Chargement...</div>
          ) : filtered.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Nom</th>
                    <th>Famille</th>
                    <th>Unite</th>
                    <th>Obligatoire</th>
                    <th>Actif</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id}>
                      <td>{item.code}</td>
                      <td>{item.name}</td>
                      <td>{item.family}</td>
                      <td>{item.unit_symbol}</td>
                      <td>{item.mandatory ? "Oui" : "Non"}</td>
                      <td>{item.active ? "Oui" : "Non"}</td>
                      <td className="table-actions">
                        <button className="icon-btn" type="button" onClick={() => handleEdit(item)}>
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-btn icon-btn--danger"
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Supprimer ${item.name} ?`)) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Aucun nutriment" description="Ajoutez un nutriment pour demarrer." />
          )}
        </SectionCard>

        <SectionCard
          title={form.id ? "Modifier un nutriment" : "Nouveau nutriment"}
          subtitle="Code, unite, famille et obligation"
        >
          <form className="form-stack" onSubmit={handleSubmit}>
            <label className="field">
              <span>Nom</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>

            <div className="grid-2">
              <label className="field">
                <span>Code</span>
                <input
                  value={form.code}
                  onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                  required
                />
              </label>

              <label className="field">
                <span>Unite</span>
                <select
                  value={form.unit_id}
                  onChange={(event) => setForm((current) => ({ ...current, unit_id: event.target.value }))}
                  required
                >
                  <option value="">Choisir</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.symbol})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field">
              <span>Famille</span>
              <select
                value={form.family}
                onChange={(event) => setForm((current) => ({ ...current, family: event.target.value }))}
              >
                {NUTRIENT_FAMILIES.map((family) => (
                  <option key={family} value={family}>
                    {family}
                  </option>
                ))}
              </select>
            </label>

            <div className="checkbox-row">
              <label>
                <input
                  type="checkbox"
                  checked={form.mandatory}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, mandatory: event.target.checked }))
                  }
                />
                <span>Nutriment obligatoire en formulation</span>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                />
                <span>Nutriment actif</span>
              </label>
            </div>

            <div className="form-actions">
              <button className="btn btn--ghost" type="button" onClick={() => setForm(defaultForm)}>
                Annuler
              </button>
              <button className="btn btn--primary" type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}
