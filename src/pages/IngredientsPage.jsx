import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { EmptyState } from "../components/ui/EmptyState";
import {
  deleteIngredient,
  getIngredientDetails,
  listIngredientCategories,
  listIngredients,
  listNutrients,
  saveIngredient,
  saveIngredientCategory,
  saveIngredientComposition,
  saveIngredientPrice,
} from "../services/catalogService";
import { parseNumeric } from "../lib/utils";

const defaultForm = {
  id: null,
  name: "",
  category_id: "",
  inclusion_min: 0,
  inclusion_max: 100,
  current_price: "",
  active: true,
};

export function IngredientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [selectedIngredientId, setSelectedIngredientId] = useState(null);
  const [compositionSearch, setCompositionSearch] = useState("");
  const [compositionValues, setCompositionValues] = useState({});
  const [newCategoryName, setNewCategoryName] = useState("");

  const { data: ingredients = [], isLoading } = useQuery({
    queryKey: ["ingredients"],
    queryFn: listIngredients,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["ingredient-categories"],
    queryFn: listIngredientCategories,
  });

  const { data: nutrients = [] } = useQuery({
    queryKey: ["nutrients"],
    queryFn: listNutrients,
  });

  const ingredientDetailsQuery = useQuery({
    queryKey: ["ingredient-details", selectedIngredientId],
    queryFn: () => getIngredientDetails(selectedIngredientId),
    enabled: Boolean(selectedIngredientId),
  });

  useEffect(() => {
    if (!ingredientDetailsQuery.data) {
      return;
    }

    const detail = ingredientDetailsQuery.data;
    const latestPrice = [...(detail.ingredient_prices ?? [])]
      .sort((left, right) => new Date(right.effective_at) - new Date(left.effective_at))[0]
      ?.price_value;

    setForm({
      id: detail.id,
      name: detail.name,
      category_id: detail.category_id,
      inclusion_min: detail.inclusion_min,
      inclusion_max: detail.inclusion_max,
      current_price: latestPrice ?? "",
      active: detail.active,
    });

    setCompositionValues(
      (detail.ingredient_nutrients ?? []).reduce((accumulator, row) => {
        accumulator[row.nutrient_id] = row.value;
        return accumulator;
      }, {}),
    );
  }, [ingredientDetailsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      let categoryId = payload.category_id;
      if (!categoryId && newCategoryName.trim()) {
        const category = await saveIngredientCategory(newCategoryName.trim());
        categoryId = category.id;
      }

      const savedIngredient = await saveIngredient({
        ...payload,
        category_id: categoryId,
      });
      await saveIngredientPrice(savedIngredient.id, parseNumeric(payload.current_price, 0));
      await saveIngredientComposition(savedIngredient.id, compositionValues);
      return savedIngredient;
    },
    onSuccess: () => {
      toast.success("Ingredient enregistre.");
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      queryClient.invalidateQueries({ queryKey: ["ingredient-categories"] });
      if (selectedIngredientId) {
        queryClient.invalidateQueries({
          queryKey: ["ingredient-details", selectedIngredientId],
        });
      }
      setNewCategoryName("");
      setSelectedIngredientId(null);
      setForm(defaultForm);
      setCompositionValues({});
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteIngredient,
    onSuccess: () => {
      toast.success("Ingredient supprime.");
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      setSelectedIngredientId(null);
      setForm(defaultForm);
      setCompositionValues({});
    },
    onError: (error) => toast.error(error.message),
  });

  const filteredIngredients = useMemo(() => {
    const needle = search.toLowerCase();
    return ingredients.filter((item) =>
      [item.name, item.category_name].join(" ").toLowerCase().includes(needle),
    );
  }, [ingredients, search]);

  const filteredNutrients = useMemo(() => {
    const needle = compositionSearch.toLowerCase();
    return nutrients.filter((item) =>
      [item.name, item.code, item.family].join(" ").toLowerCase().includes(needle),
    );
  }, [compositionSearch, nutrients]);

  function handleSubmit(event) {
    event.preventDefault();
    saveMutation.mutate(form);
  }

  return (
    <div className="page">
      <PageHeader
        title="Ingredients"
        description="Catalogue ingredients, bornes d'incorporation, prix courants et compositions nutritionnelles."
        actions={
          <button
            className="btn btn--secondary"
            type="button"
            onClick={() => {
              setSelectedIngredientId(null);
              setForm(defaultForm);
              setCompositionValues({});
            }}
          >
            <Plus size={16} />
            Nouvel ingredient
          </button>
        }
      />

      <div className="content-grid content-grid--two">
        <SectionCard title="Catalogue ingredients" subtitle="Selection et suppression">
          <div className="toolbar">
            <input
              placeholder="Rechercher un ingredient..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="panel-placeholder">Chargement...</div>
          ) : filteredIngredients.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Categorie</th>
                    <th>Min</th>
                    <th>Max</th>
                    <th>Prix</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredIngredients.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.category_name}</td>
                      <td>{item.inclusion_min}</td>
                      <td>{item.inclusion_max}</td>
                      <td>{item.current_price || "-"}</td>
                      <td className="table-actions">
                        <button
                          className="icon-btn"
                          type="button"
                          onClick={() => setSelectedIngredientId(item.id)}
                        >
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
            <EmptyState
              title="Aucun ingredient"
              description="Commencez par ajouter une matiere premiere."
            />
          )}
        </SectionCard>

        <SectionCard
          title={form.id ? "Modifier un ingredient" : "Nouvel ingredient"}
          subtitle="Parametres generaux et composition"
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
                <span>Categorie</span>
                <select
                  value={form.category_id}
                  onChange={(event) => setForm((current) => ({ ...current, category_id: event.target.value }))}
                >
                  <option value="">Choisir</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Nouvelle categorie</span>
                <input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="Ex. Mineraux"
                />
              </label>
            </div>

            <div className="grid-3">
              <label className="field">
                <span>Incorp. min (%)</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.inclusion_min}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, inclusion_min: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span>Incorp. max (%)</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.inclusion_max}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, inclusion_max: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span>Prix FCFA/kg</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.current_price}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, current_price: event.target.value }))
                  }
                />
              </label>
            </div>

            <label className="checkbox-row checkbox-row--single">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
              />
              <span>Ingredient actif</span>
            </label>

            <SectionCard title="Composition nutritionnelle" className="section-card--nested">
              <div className="toolbar">
                <input
                  placeholder="Filtrer les nutriments..."
                  value={compositionSearch}
                  onChange={(event) => setCompositionSearch(event.target.value)}
                />
              </div>

              <div className="table-wrap table-wrap--compact">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Nutriment</th>
                      <th>Unite</th>
                      <th>Valeur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNutrients.map((nutrient) => (
                      <tr key={nutrient.id}>
                        <td>{nutrient.code}</td>
                        <td>{nutrient.name}</td>
                        <td>{nutrient.unit_symbol}</td>
                        <td>
                          <input
                            className="table-input"
                            type="number"
                            step="0.001"
                            value={compositionValues[nutrient.id] ?? ""}
                            onChange={(event) =>
                              setCompositionValues((current) => ({
                                ...current,
                                [nutrient.id]: event.target.value,
                              }))
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <div className="form-actions">
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => {
                  setSelectedIngredientId(null);
                  setForm(defaultForm);
                  setCompositionValues({});
                  setNewCategoryName("");
                }}
              >
                Reinitialiser
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
