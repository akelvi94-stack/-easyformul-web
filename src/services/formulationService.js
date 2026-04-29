import { supabase } from "../lib/supabase";
import { solveLeastCostFormula } from "../lib/formulation";

function mapIngredientComposition(rows) {
  return (rows ?? []).reduce((accumulator, row) => {
    accumulator[row.nutrient_id] = Number(row.value ?? 0);
    return accumulator;
  }, {});
}

export async function fetchFormulationReferenceData() {
  const [animals, ingredients, nutrients] = await Promise.all([
    supabase.from("animals").select("*").order("name").order("breed").order("stage"),
    supabase
      .from("ingredients")
      .select(
        `
        id,
        name,
        inclusion_min,
        inclusion_max,
        active,
        category_id,
        ingredient_categories ( id, name ),
        ingredient_nutrients ( nutrient_id, value )
      `,
      )
      .eq("active", true)
      .order("name"),
    supabase.from("nutrients_catalog").select("*").eq("active", true).order("name"),
  ]);

  if (animals.error) throw animals.error;
  if (ingredients.error) throw ingredients.error;
  if (nutrients.error) throw nutrients.error;

  const latestPrices = await supabase
    .from("ingredient_latest_prices")
    .select("*");

  if (latestPrices.error) {
    throw latestPrices.error;
  }

  const priceMap = new Map((latestPrices.data ?? []).map((row) => [row.ingredient_id, row.price_value]));

  return {
    animals: animals.data ?? [],
    ingredients: (ingredients.data ?? []).map((ingredient) => ({
      ...ingredient,
      current_price: Number(priceMap.get(ingredient.id) ?? 0),
      category_name: ingredient.ingredient_categories?.name ?? "Sans categorie",
      composition: mapIngredientComposition(ingredient.ingredient_nutrients),
    })),
    nutrients: nutrients.data ?? [],
  };
}

export async function fetchNeedsForAnimal(animalId) {
  if (!animalId) {
    return [];
  }

  const { data, error } = await supabase
    .from("needs")
    .select("*")
    .eq("animal_id", animalId)
    .order("name");
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function fetchNeedProfile(needId) {
  if (!needId) {
    return { constraints: [], ratios: [] };
  }

  const [constraints, ratios] = await Promise.all([
    supabase
      .from("need_constraints")
      .select(
        `
        need_id,
        nutrient_id,
        label,
        min_value,
        max_value,
        is_enabled,
        nutrients!inner (
          id,
          name,
          code,
          family,
          mandatory,
          unit_id,
          units ( id, name, symbol )
        )
      `,
      )
      .eq("need_id", needId)
      .eq("is_enabled", true),
    supabase.from("ratio_constraints").select("*").eq("need_id", needId).order("name"),
  ]);

  if (constraints.error) throw constraints.error;
  if (ratios.error) throw ratios.error;

  return {
    constraints: constraints.data ?? [],
    ratios: ratios.data ?? [],
  };
}

export function runFormulationScenario(payload) {
  return solveLeastCostFormula(payload);
}

export async function saveFormulationResult({
  userId,
  needId,
  name,
  baseCalculation,
  result,
}) {
  const { data: formulation, error: formulationError } = await supabase
    .from("formulations")
    .insert({
      name,
      need_id: needId,
      user_id: userId,
      status: "optimisee",
      total_cost: result.total_cost,
      cost_per_100kg: result.cost_per_100kg,
      base_calculation: baseCalculation,
    })
    .select()
    .single();

  if (formulationError) {
    throw formulationError;
  }

  const ingredientRows = result.rows.map((row) => ({
    formulation_id: formulation.id,
    ingredient_id: row.ingredient.id,
    proportion: row.proportion,
    quantity_kg: row.quantity_kg,
    cost_fcfa: row.cost_fcfa,
  }));

  const { error: linesError } = await supabase
    .from("formulation_ingredients")
    .insert(ingredientRows);

  if (linesError) {
    throw linesError;
  }

  return formulation;
}

export async function listFormulations() {
  const { data, error } = await supabase
    .from("formulations_catalog")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function getFormulationDetails(id) {
  const { data, error } = await supabase
    .from("formulations")
    .select(
      `
      *,
      needs ( id, name ),
      formulation_ingredients (
        proportion,
        quantity_kg,
        cost_fcfa,
        ingredients ( id, name )
      )
    `,
    )
    .eq("id", id)
    .single();
  if (error) {
    throw error;
  }
  return data;
}
