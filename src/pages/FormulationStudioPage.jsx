import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, CheckCircle2, Play, Save } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { EmptyState } from "../components/ui/EmptyState";
import { BASE_OPTIONS } from "../lib/constants";
import { formatCurrency, formatNumber, groupBy } from "../lib/utils";
import {
  fetchFormulationReferenceData,
  fetchNeedProfile,
  fetchNeedsForAnimal,
  runFormulationScenario,
  saveFormulationResult,
} from "../services/formulationService";
import { useAuth } from "../hooks/useAuth";

export function FormulationStudioPage() {
  const { session } = useAuth();
  const [step, setStep] = useState(1);
  const [animalId, setAnimalId] = useState("");
  const [needId, setNeedId] = useState("");
  const [formName, setFormName] = useState("");
  const [baseCalculation, setBaseCalculation] = useState(100);
  const [selectedIngredientIds, setSelectedIngredientIds] = useState([]);
  const [ingredientCategoryIndex, setIngredientCategoryIndex] = useState(0);
  const [enabledConstraints, setEnabledConstraints] = useState({});
  const [ratioDraft, setRatioDraft] = useState([]);
  const [result, setResult] = useState(null);

  const referenceQuery = useQuery({
    queryKey: ["formulation-reference"],
    queryFn: fetchFormulationReferenceData,
  });

  const needsQuery = useQuery({
    queryKey: ["formulation-needs", animalId],
    queryFn: () => fetchNeedsForAnimal(animalId),
    enabled: Boolean(animalId),
  });

  const needProfileQuery = useQuery({
    queryKey: ["formulation-need-profile", needId],
    queryFn: () => fetchNeedProfile(needId),
    enabled: Boolean(needId),
  });

  useEffect(() => {
    if (!animalId && referenceQuery.data?.animals?.length) {
      setAnimalId(referenceQuery.data.animals[0].id);
    }
  }, [animalId, referenceQuery.data]);

  useEffect(() => {
    if (!needId && needsQuery.data?.length) {
      setNeedId(needsQuery.data[0].id);
      setFormName(`Formule ${needsQuery.data[0].name}`);
    }
  }, [needId, needsQuery.data]);

  useEffect(() => {
    if (!needProfileQuery.data) {
      return;
    }

    const selected = {};
    for (const constraint of needProfileQuery.data.constraints) {
      selected[constraint.nutrient_id] = true;
    }
    setEnabledConstraints(selected);
    setRatioDraft(needProfileQuery.data.ratios);
  }, [needProfileQuery.data]);

  const groupedIngredients = useMemo(() => {
    return groupBy(referenceQuery.data?.ingredients ?? [], (item) => item.category_name);
  }, [referenceQuery.data]);

  const ingredientCategories = useMemo(
    () => Object.keys(groupedIngredients),
    [groupedIngredients],
  );

  const currentCategoryName = ingredientCategories[ingredientCategoryIndex];
  const currentCategoryItems = groupedIngredients[currentCategoryName] ?? [];

  const groupedConstraints = useMemo(() => {
    return groupBy(needProfileQuery.data?.constraints ?? [], (item) => item.nutrients.family);
  }, [needProfileQuery.data]);

  const selectedIngredients = useMemo(
    () =>
      (referenceQuery.data?.ingredients ?? []).filter((ingredient) =>
        selectedIngredientIds.includes(ingredient.id),
      ),
    [referenceQuery.data, selectedIngredientIds],
  );

  const selectedConstraints = useMemo(
    () =>
      (needProfileQuery.data?.constraints ?? []).filter(
        (constraint) => constraint.nutrients.mandatory || enabledConstraints[constraint.nutrient_id],
      ),
    [enabledConstraints, needProfileQuery.data],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!result?.success) {
        throw new Error("Aucun resultat valide a enregistrer.");
      }
      return saveFormulationResult({
        userId: session?.user?.id,
        needId,
        name: formName,
        baseCalculation,
        result,
      });
    },
    onSuccess: () => toast.success("Formulation enregistree."),
    onError: (error) => toast.error(error.message),
  });

  function toggleIngredient(id) {
    setSelectedIngredientIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : current.concat(id),
    );
  }

  function toggleCurrentCategory(selectAll) {
    const ids = currentCategoryItems.map((item) => item.id);
    setSelectedIngredientIds((current) => {
      const withoutCurrentCategory = current.filter((id) => !ids.includes(id));
      return selectAll ? withoutCurrentCategory.concat(ids) : withoutCurrentCategory;
    });
  }

  function runSolver() {
    const nextResult = runFormulationScenario({
      name: formName,
      baseCalculation,
      ingredients: selectedIngredients,
      constraints: selectedConstraints.map((constraint) => ({
        ...constraint,
        nutrient: constraint.nutrients,
      })),
      ratios: ratioDraft,
    });

    setResult(nextResult);
    setStep(4);
    if (nextResult.success) {
      toast.success("Formulation calculee.");
    } else {
      toast.error(nextResult.message);
    }
  }

  function goNext() {
    if (step === 1 && (!animalId || !needId || !formName.trim())) {
      toast.error("Renseignez l'animal, le besoin et le nom de la formule.");
      return;
    }
    if (step === 2 && !selectedIngredientIds.length) {
      toast.error("Selectionnez au moins un ingredient.");
      return;
    }
    if (step === 3) {
      runSolver();
      return;
    }
    setStep((current) => Math.min(current + 1, 4));
  }

  function goPrev() {
    setStep((current) => Math.max(current - 1, 1));
  }

  return (
    <div className="page">
      <PageHeader
        title="Nouvelle formulation"
        description="Workflow progressif : besoin, ingredients par categorie, contraintes nutritionnelles puis calcul least-cost."
      />

      <div className="wizard-steps">
        {[1, 2, 3, 4].map((value) => (
          <div key={value} className={`wizard-step ${step === value ? "is-active" : step > value ? "is-done" : ""}`}>
            <span>{value}</span>
            <strong>
              {value === 1
                ? "Besoin"
                : value === 2
                  ? "Ingredients"
                  : value === 3
                    ? "Contraintes"
                    : "Resultats"}
            </strong>
          </div>
        ))}
      </div>

      {step === 1 ? (
        <SectionCard title="Choisir le besoin" subtitle="Animal, besoin, nom et base de calcul">
          <div className="form-stack">
            <div className="grid-2">
              <label className="field">
                <span>Animal</span>
                <select value={animalId} onChange={(event) => setAnimalId(Number(event.target.value))}>
                  <option value="">Choisir</option>
                  {(referenceQuery.data?.animals ?? []).map((animal) => (
                    <option key={animal.id} value={animal.id}>
                      {animal.name} • {animal.breed} • {animal.stage}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Besoin</span>
                <select
                  value={needId}
                  onChange={(event) => {
                    const nextNeedId = Number(event.target.value);
                    setNeedId(nextNeedId);
                    const need = (needsQuery.data ?? []).find((item) => item.id === nextNeedId);
                    if (need) {
                      setFormName(`Formule ${need.name}`);
                    }
                  }}
                >
                  <option value="">Choisir</option>
                  {(needsQuery.data ?? []).map((need) => (
                    <option key={need.id} value={need.id}>
                      {need.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid-2">
              <label className="field">
                <span>Nom de la formule</span>
                <input value={formName} onChange={(event) => setFormName(event.target.value)} />
              </label>

              <label className="field">
                <span>Base de calcul</span>
                <select
                  value={baseCalculation}
                  onChange={(event) => setBaseCalculation(Number(event.target.value))}
                >
                  {BASE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {step === 2 ? (
        <SectionCard
          title="Selection des ingredients"
          subtitle="Progression categorie par categorie avec selection ou deselection globale"
          actions={
            <div className="stack-inline">
              <button className="btn btn--ghost" type="button" onClick={() => toggleCurrentCategory(true)}>
                Tout selectionner
              </button>
              <button className="btn btn--ghost" type="button" onClick={() => toggleCurrentCategory(false)}>
                Tout deselectionner
              </button>
            </div>
          }
        >
          <div className="category-progress">
            <div>
              <p className="eyebrow">Categorie courante</p>
              <h3>{currentCategoryName || "Aucune categorie"}</h3>
              <p>{selectedIngredientIds.length} ingredient(s) selectionne(s) au total</p>
            </div>

            <div className="stack-inline">
              <button
                className="btn btn--ghost"
                type="button"
                disabled={ingredientCategoryIndex === 0}
                onClick={() => setIngredientCategoryIndex((current) => current - 1)}
              >
                <ChevronLeft size={16} />
                Prec.
              </button>
              <span className="pill">
                {ingredientCategoryIndex + 1} / {ingredientCategories.length || 1}
              </span>
              <button
                className="btn btn--ghost"
                type="button"
                disabled={ingredientCategoryIndex >= ingredientCategories.length - 1}
                onClick={() => setIngredientCategoryIndex((current) => current + 1)}
              >
                Suiv.
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="ingredient-card-grid">
            {currentCategoryItems.map((ingredient) => (
              <button
                key={ingredient.id}
                type="button"
                className={`ingredient-card ${selectedIngredientIds.includes(ingredient.id) ? "is-selected" : ""}`}
                onClick={() => toggleIngredient(ingredient.id)}
              >
                <div>
                  <strong>{ingredient.name}</strong>
                  <p>
                    {ingredient.inclusion_min}% - {ingredient.inclusion_max}%
                  </p>
                </div>
                <div className="ingredient-card__meta">
                  <span>{formatCurrency(ingredient.current_price || 0)}</span>
                  {selectedIngredientIds.includes(ingredient.id) ? <CheckCircle2 size={18} /> : null}
                </div>
              </button>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {step === 3 ? (
        <SectionCard title="Contraintes nutritionnelles" subtitle="Les nutriments obligatoires restent verrouilles">
          <div className="list-stack">
            {Object.entries(groupedConstraints).map(([family, rows]) => (
              <div className="constraint-group" key={family}>
                <div className="constraint-group__header">
                  <h4>{family}</h4>
                  <span>{rows.length} contraintes</span>
                </div>
                {rows.map((constraint) => (
                  <label className="constraint-row" key={constraint.nutrient_id}>
                    <div className="constraint-row__main">
                      <input
                        type="checkbox"
                        checked={
                          constraint.nutrients.mandatory ||
                          Boolean(enabledConstraints[constraint.nutrient_id])
                        }
                        disabled={constraint.nutrients.mandatory}
                        onChange={(event) =>
                          setEnabledConstraints((current) => ({
                            ...current,
                            [constraint.nutrient_id]: event.target.checked,
                          }))
                        }
                      />
                      <div>
                        <strong>
                          {constraint.nutrients.code} • {constraint.nutrients.name}
                        </strong>
                        <span>
                          Min {constraint.min_value} / Max {constraint.max_value} {constraint.nutrients.units?.symbol || ""}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {step === 4 ? (
        <SectionCard
          title="Resultats de formulation"
          subtitle={result?.message || "Resultat du solveur least-cost"}
          actions={
            result?.success ? (
              <button
                className="btn btn--primary"
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                <Save size={16} />
                {saveMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            ) : null
          }
        >
          {!result ? (
            <EmptyState
              title="Aucun calcul lance"
              description="Passez a l'etape precedente pour lancer la formulation."
            />
          ) : result.success ? (
            <div className="result-layout">
              <div className="metrics-grid">
                <div className="metric-card">
                  <p>Cout / 100 kg</p>
                  <strong>{formatCurrency(result.cost_per_100kg)}</strong>
                  <span>Base solver</span>
                </div>
                <div className="metric-card">
                  <p>Cout total</p>
                  <strong>{formatCurrency(result.total_cost)}</strong>
                  <span>Pour {baseCalculation} kg</span>
                </div>
              </div>

              <SectionCard title="Incorporations" className="section-card--nested">
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
                      {result.rows.map((row) => (
                        <tr key={row.ingredient.id}>
                          <td>{row.ingredient.name}</td>
                          <td>{formatNumber(row.proportion)} %</td>
                          <td>{formatNumber(row.quantity_kg)} kg</td>
                          <td>{formatCurrency(row.cost_fcfa)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

              <SectionCard title="Verification des nutriments" className="section-card--nested">
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nutriment</th>
                        <th>Min</th>
                        <th>Max</th>
                        <th>Calcule</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.nutrientChecks.map((item) => (
                        <tr key={item.nutrient.id}>
                          <td>{item.nutrient.code}</td>
                          <td>{formatNumber(item.min_value)}</td>
                          <td>{formatNumber(item.max_value)}</td>
                          <td>{formatNumber(item.actual)}</td>
                          <td>
                            <span className={`pill ${item.compliant ? "pill--success" : "pill--danger"}`}>
                              {item.compliant ? "Conforme" : "Non conforme"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </div>
          ) : (
            <div className="error-box">
              <strong>Calcul impossible</strong>
              <p>{result.message}</p>
            </div>
          )}
        </SectionCard>
      ) : null}

      <div className="wizard-footer">
        <button className="btn btn--ghost" type="button" onClick={goPrev} disabled={step === 1}>
          <ChevronLeft size={16} />
          Retour
        </button>
        <button className="btn btn--primary" type="button" onClick={goNext}>
          {step === 3 ? <Play size={16} /> : <ChevronRight size={16} />}
          {step === 3 ? "Lancer la formulation" : "Continuer"}
        </button>
      </div>
    </div>
  );
}
