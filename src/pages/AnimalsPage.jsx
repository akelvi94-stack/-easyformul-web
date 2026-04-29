import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { EmptyState } from "../components/ui/EmptyState";
import {
  deleteAnimal,
  deleteNeed,
  listAnimals,
  listNeedsByAnimal,
  listNutrients,
  listNeedConstraints,
  listRatioConstraints,
  saveAnimal,
  saveNeed,
  saveNeedConstraints,
  saveRatioConstraints,
} from "../services/catalogService";
import { groupBy } from "../lib/utils";

const defaultAnimal = {
  id: null,
  name: "",
  breed: "",
  stage: "",
};

const defaultNeed = {
  id: null,
  name: "",
  animal_id: null,
};

export function AnimalsPage() {
  const queryClient = useQueryClient();
  const [selectedAnimalId, setSelectedAnimalId] = useState(null);
  const [selectedNeedId, setSelectedNeedId] = useState(null);
  const [animalForm, setAnimalForm] = useState(defaultAnimal);
  const [needForm, setNeedForm] = useState(defaultNeed);
  const [constraintDraft, setConstraintDraft] = useState([]);
  const [ratioDraft, setRatioDraft] = useState([]);

  const { data: animals = [] } = useQuery({
    queryKey: ["animals"],
    queryFn: listAnimals,
  });

  const { data: nutrients = [] } = useQuery({
    queryKey: ["nutrients"],
    queryFn: listNutrients,
  });

  const { data: needs = [] } = useQuery({
    queryKey: ["needs", selectedAnimalId],
    queryFn: () => listNeedsByAnimal(selectedAnimalId),
    enabled: Boolean(selectedAnimalId),
  });

  const { data: constraints = [] } = useQuery({
    queryKey: ["need-constraints", selectedNeedId],
    queryFn: () => listNeedConstraints(selectedNeedId),
    enabled: Boolean(selectedNeedId),
  });

  const { data: ratios = [] } = useQuery({
    queryKey: ["ratio-constraints", selectedNeedId],
    queryFn: () => listRatioConstraints(selectedNeedId),
    enabled: Boolean(selectedNeedId),
  });

  useEffect(() => {
    if (!selectedAnimalId && animals.length) {
      setSelectedAnimalId(animals[0].id);
      setAnimalForm(animals[0]);
    }
  }, [animals, selectedAnimalId]);

  useEffect(() => {
    if (!needs.length) {
      setSelectedNeedId(null);
      setNeedForm((current) => ({ ...defaultNeed, animal_id: selectedAnimalId }));
      return;
    }

    const chosen = needs.find((item) => item.id === selectedNeedId) ?? needs[0];
    setSelectedNeedId(chosen.id);
    setNeedForm(chosen);
  }, [needs, selectedAnimalId]);

  useEffect(() => {
    if (!selectedNeedId) {
      setConstraintDraft([]);
      setRatioDraft([]);
      return;
    }

    const existingMap = new Map(constraints.map((item) => [item.nutrient_id, item]));
    setConstraintDraft(
      nutrients.map((nutrient) => {
        const existing = existingMap.get(nutrient.id);
        return {
          nutrient_id: nutrient.id,
          nutrient,
          label: existing?.label || nutrient.code,
          min_value: existing?.min_value ?? 0,
          max_value: existing?.max_value ?? 9999,
          is_enabled: nutrient.mandatory ? true : Boolean(existing?.is_enabled),
        };
      }),
    );
    setRatioDraft(ratios);
  }, [constraints, nutrients, ratios, selectedNeedId]);

  const animalMutation = useMutation({
    mutationFn: saveAnimal,
    onSuccess: () => {
      toast.success("Animal enregistre.");
      queryClient.invalidateQueries({ queryKey: ["animals"] });
      setAnimalForm(defaultAnimal);
    },
    onError: (error) => toast.error(error.message),
  });

  const needMutation = useMutation({
    mutationFn: saveNeed,
    onSuccess: () => {
      toast.success("Besoin enregistre.");
      queryClient.invalidateQueries({ queryKey: ["needs", selectedAnimalId] });
      setNeedForm((current) => ({ ...defaultNeed, animal_id: selectedAnimalId }));
    },
    onError: (error) => toast.error(error.message),
  });

  const constraintMutation = useMutation({
    mutationFn: async () => {
      await saveNeedConstraints(selectedNeedId, constraintDraft);
      await saveRatioConstraints(selectedNeedId, ratioDraft);
    },
    onSuccess: () => {
      toast.success("Contraintes mises a jour.");
      queryClient.invalidateQueries({ queryKey: ["need-constraints", selectedNeedId] });
      queryClient.invalidateQueries({ queryKey: ["ratio-constraints", selectedNeedId] });
    },
    onError: (error) => toast.error(error.message),
  });

  const groupedConstraints = useMemo(
    () => groupBy(constraintDraft, (item) => item.nutrient.family),
    [constraintDraft],
  );

  return (
    <div className="page">
      <PageHeader
        title="Animaux et besoins"
        description="Pilotage des especes, des stades et des contraintes nutritionnelles attachees aux besoins."
      />

      <div className="content-grid content-grid--three">
        <SectionCard title="Animaux" subtitle="Especes, races et stades">
          <div className="list-stack selectable-list">
            {animals.length ? (
              animals.map((animal) => (
                <button
                  key={animal.id}
                  type="button"
                  className={`selectable-list__item ${selectedAnimalId === animal.id ? "is-selected" : ""}`}
                  onClick={() => {
                    setSelectedAnimalId(animal.id);
                    setAnimalForm(animal);
                  }}
                >
                  <strong>{animal.name}</strong>
                  <span>
                    {animal.breed} • {animal.stage}
                  </span>
                </button>
              ))
            ) : (
              <EmptyState title="Aucun animal" description="Ajoutez un premier profil animal." />
            )}
          </div>

          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              animalMutation.mutate(animalForm);
            }}
          >
            <label className="field">
              <span>Nom</span>
              <input
                value={animalForm.name}
                onChange={(event) =>
                  setAnimalForm((current) => ({ ...current, name: event.target.value }))
                }
                required
              />
            </label>
            <label className="field">
              <span>Race</span>
              <input
                value={animalForm.breed}
                onChange={(event) =>
                  setAnimalForm((current) => ({ ...current, breed: event.target.value }))
                }
                required
              />
            </label>
            <label className="field">
              <span>Stade</span>
              <input
                value={animalForm.stage}
                onChange={(event) =>
                  setAnimalForm((current) => ({ ...current, stage: event.target.value }))
                }
                required
              />
            </label>
            <div className="form-actions">
              <button className="btn btn--ghost" type="button" onClick={() => setAnimalForm(defaultAnimal)}>
                Nouveau
              </button>
              {animalForm.id ? (
                <button
                  className="btn btn--danger"
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Supprimer ${animalForm.name} ?`)) {
                      deleteAnimal(animalForm.id).then(() => {
                        toast.success("Animal supprime.");
                        queryClient.invalidateQueries({ queryKey: ["animals"] });
                        setAnimalForm(defaultAnimal);
                      });
                    }
                  }}
                >
                  <Trash2 size={16} />
                  Supprimer
                </button>
              ) : null}
              <button className="btn btn--primary" type="submit">
                Enregistrer
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Besoins" subtitle="Profils nutritionnels par animal">
          <div className="list-stack selectable-list">
            {needs.length ? (
              needs.map((need) => (
                <button
                  key={need.id}
                  type="button"
                  className={`selectable-list__item ${selectedNeedId === need.id ? "is-selected" : ""}`}
                  onClick={() => {
                    setSelectedNeedId(need.id);
                    setNeedForm(need);
                  }}
                >
                  <strong>{need.name}</strong>
                  <span>Besoin associe</span>
                </button>
              ))
            ) : (
              <EmptyState
                title="Aucun besoin"
                description="Selectionnez un animal puis ajoutez un besoin."
              />
            )}
          </div>

          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              needMutation.mutate({ ...needForm, animal_id: selectedAnimalId });
            }}
          >
            <label className="field">
              <span>Nom du besoin</span>
              <input
                value={needForm.name || ""}
                onChange={(event) => setNeedForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>
            <div className="form-actions">
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => setNeedForm({ ...defaultNeed, animal_id: selectedAnimalId })}
              >
                <Plus size={16} />
                Nouveau besoin
              </button>
              {needForm.id ? (
                <button
                  className="btn btn--danger"
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Supprimer ${needForm.name} ?`)) {
                      deleteNeed(needForm.id).then(() => {
                        toast.success("Besoin supprime.");
                        queryClient.invalidateQueries({ queryKey: ["needs", selectedAnimalId] });
                      });
                    }
                  }}
                >
                  <Trash2 size={16} />
                  Supprimer
                </button>
              ) : null}
              <button className="btn btn--primary" type="submit">
                Enregistrer
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Contraintes & ratios"
          subtitle="Les nutriments obligatoires restent toujours actifs dans la formulation."
          actions={
            <button
              className="btn btn--primary"
              type="button"
              onClick={() => constraintMutation.mutate()}
              disabled={!selectedNeedId || constraintMutation.isPending}
            >
              {constraintMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          }
        >
          {!selectedNeedId ? (
            <EmptyState
              title="Selectionnez un besoin"
              description="Les contraintes nutritionnelles apparaitront ici."
            />
          ) : (
            <div className="list-stack">
              {Object.entries(groupedConstraints).map(([family, rows]) => (
                <div className="constraint-group" key={family}>
                  <div className="constraint-group__header">
                    <h4>{family}</h4>
                    <span>{rows.length} nutriments</span>
                  </div>
                  {rows.map((row) => (
                    <div className="constraint-row" key={row.nutrient_id}>
                      <label className="constraint-row__main">
                        <input
                          type="checkbox"
                          checked={row.is_enabled}
                          disabled={row.nutrient.mandatory}
                          onChange={(event) =>
                            setConstraintDraft((current) =>
                              current.map((item) =>
                                item.nutrient_id === row.nutrient_id
                                  ? { ...item, is_enabled: event.target.checked }
                                  : item,
                              ),
                            )
                          }
                        />
                        <div>
                          <strong>
                            {row.nutrient.code} • {row.nutrient.name}
                          </strong>
                          <span>
                            {row.nutrient.unit_symbol}
                            {row.nutrient.mandatory ? " • obligatoire" : ""}
                          </span>
                        </div>
                      </label>

                      <input
                        type="number"
                        step="0.001"
                        value={row.min_value}
                        onChange={(event) =>
                          setConstraintDraft((current) =>
                            current.map((item) =>
                              item.nutrient_id === row.nutrient_id
                                ? { ...item, min_value: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                      <input
                        type="number"
                        step="0.001"
                        value={row.max_value}
                        onChange={(event) =>
                          setConstraintDraft((current) =>
                            current.map((item) =>
                              item.nutrient_id === row.nutrient_id
                                ? { ...item, max_value: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              ))}

              <div className="constraint-group">
                <div className="constraint-group__header">
                  <h4>Ratios nutritionnels</h4>
                  <button
                    className="btn btn--ghost"
                    type="button"
                    onClick={() =>
                      setRatioDraft((current) => [
                        ...current,
                        {
                          name: "",
                          nutrient_a_id: nutrients[0]?.id,
                          nutrient_b_id: nutrients[1]?.id,
                          min_ratio: 0,
                          max_ratio: 0,
                        },
                      ])
                    }
                  >
                    <Plus size={16} />
                    Ajouter
                  </button>
                </div>

                {ratioDraft.map((ratio, index) => (
                  <div className="ratio-row" key={`${ratio.name}-${index}`}>
                    <input
                      placeholder="Nom du ratio"
                      value={ratio.name}
                      onChange={(event) =>
                        setRatioDraft((current) =>
                          current.map((item, currentIndex) =>
                            currentIndex === index ? { ...item, name: event.target.value } : item,
                          ),
                        )
                      }
                    />
                    <select
                      value={ratio.nutrient_a_id}
                      onChange={(event) =>
                        setRatioDraft((current) =>
                          current.map((item, currentIndex) =>
                            currentIndex === index
                              ? { ...item, nutrient_a_id: Number(event.target.value) }
                              : item,
                          ),
                        )
                      }
                    >
                      {nutrients.map((nutrient) => (
                        <option key={nutrient.id} value={nutrient.id}>
                          {nutrient.code}
                        </option>
                      ))}
                    </select>
                    <select
                      value={ratio.nutrient_b_id}
                      onChange={(event) =>
                        setRatioDraft((current) =>
                          current.map((item, currentIndex) =>
                            currentIndex === index
                              ? { ...item, nutrient_b_id: Number(event.target.value) }
                              : item,
                          ),
                        )
                      }
                    >
                      {nutrients.map((nutrient) => (
                        <option key={nutrient.id} value={nutrient.id}>
                          {nutrient.code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.001"
                      value={ratio.min_ratio}
                      onChange={(event) =>
                        setRatioDraft((current) =>
                          current.map((item, currentIndex) =>
                            currentIndex === index
                              ? { ...item, min_ratio: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                    <input
                      type="number"
                      step="0.001"
                      value={ratio.max_ratio}
                      onChange={(event) =>
                        setRatioDraft((current) =>
                          current.map((item, currentIndex) =>
                            currentIndex === index
                              ? { ...item, max_ratio: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
