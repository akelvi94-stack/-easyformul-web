import { supabase } from "../lib/supabase";

function throwIfError(error) {
  if (error) {
    throw error;
  }
}

export async function listUnits() {
  const { data, error } = await supabase.from("units").select("*").order("name");
  throwIfError(error);
  return data ?? [];
}

export async function listNutrients() {
  const { data, error } = await supabase.from("nutrients_catalog").select("*").order("name");
  throwIfError(error);
  return data ?? [];
}

export async function saveNutrient(payload) {
  const record = {
    name: payload.name,
    code: payload.code,
    family: payload.family,
    mandatory: Boolean(payload.mandatory),
    active: Boolean(payload.active),
    unit_id: Number(payload.unit_id),
  };

  const query = payload.id
    ? supabase.from("nutrients").update(record).eq("id", payload.id).select().single()
    : supabase.from("nutrients").insert(record).select().single();

  const { data, error } = await query;
  throwIfError(error);
  return data;
}

export async function deleteNutrient(id) {
  const { error } = await supabase.from("nutrients").delete().eq("id", id);
  throwIfError(error);
}

export async function listIngredientCategories() {
  const { data, error } = await supabase
    .from("ingredient_categories")
    .select("*")
    .order("name");
  throwIfError(error);
  return data ?? [];
}

export async function saveIngredientCategory(name) {
  const { data, error } = await supabase
    .from("ingredient_categories")
    .upsert({ name }, { onConflict: "name" })
    .select()
    .single();
  throwIfError(error);
  return data;
}

export async function listIngredients() {
  const { data, error } = await supabase
    .from("ingredients_catalog")
    .select("*")
    .order("category_name")
    .order("name");
  throwIfError(error);
  return data ?? [];
}

export async function getIngredientDetails(id) {
  const { data, error } = await supabase
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
      ingredient_prices ( id, price_value, currency, effective_at ),
      ingredient_nutrients ( nutrient_id, value ),
      ingredient_analysis_details ( id, display_order, label, code, raw_value, numeric_value, unit )
    `,
    )
    .eq("id", id)
    .single();
  throwIfError(error);
  return data;
}

export async function saveIngredient(payload) {
  const record = {
    name: payload.name,
    inclusion_min: Number(payload.inclusion_min ?? 0),
    inclusion_max: Number(payload.inclusion_max ?? 100),
    active: Boolean(payload.active),
    category_id: Number(payload.category_id),
  };

  const query = payload.id
    ? supabase.from("ingredients").update(record).eq("id", payload.id).select().single()
    : supabase.from("ingredients").insert(record).select().single();

  const { data, error } = await query;
  throwIfError(error);
  return data;
}

export async function saveIngredientPrice(ingredientId, priceValue) {
  if (!Number.isFinite(Number(priceValue)) || Number(priceValue) <= 0) {
    return null;
  }

  const { data, error } = await supabase
    .from("ingredient_prices")
    .insert({
      ingredient_id: ingredientId,
      price_value: Number(priceValue),
      currency: "FCFA",
    })
    .select()
    .single();
  throwIfError(error);
  return data;
}

export async function saveIngredientComposition(ingredientId, compositionMap) {
  const { error: deleteError } = await supabase
    .from("ingredient_nutrients")
    .delete()
    .eq("ingredient_id", ingredientId);
  throwIfError(deleteError);

  const rows = Object.entries(compositionMap)
    .filter(([, value]) => Number(value) !== 0)
    .map(([nutrientId, value]) => ({
      ingredient_id: ingredientId,
      nutrient_id: Number(nutrientId),
      value: Number(value),
    }));

  if (!rows.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("ingredient_nutrients")
    .insert(rows)
    .select();
  throwIfError(error);
  return data;
}

export async function deleteIngredient(id) {
  const { error } = await supabase.from("ingredients").delete().eq("id", id);
  throwIfError(error);
}

export async function listAnimals() {
  const { data, error } = await supabase
    .from("animals")
    .select("*")
    .order("name")
    .order("breed")
    .order("stage");
  throwIfError(error);
  return data ?? [];
}

export async function saveAnimal(payload) {
  const record = {
    name: payload.name,
    breed: payload.breed,
    stage: payload.stage,
  };

  const query = payload.id
    ? supabase.from("animals").update(record).eq("id", payload.id).select().single()
    : supabase.from("animals").insert(record).select().single();

  const { data, error } = await query;
  throwIfError(error);
  return data;
}

export async function deleteAnimal(id) {
  const { error } = await supabase.from("animals").delete().eq("id", id);
  throwIfError(error);
}

export async function listNeedsByAnimal(animalId) {
  if (!animalId) {
    return [];
  }

  const { data, error } = await supabase
    .from("needs")
    .select("*")
    .eq("animal_id", animalId)
    .order("name");
  throwIfError(error);
  return data ?? [];
}

export async function saveNeed(payload) {
  const record = {
    name: payload.name,
    animal_id: Number(payload.animal_id),
  };

  const query = payload.id
    ? supabase.from("needs").update(record).eq("id", payload.id).select().single()
    : supabase.from("needs").insert(record).select().single();

  const { data, error } = await query;
  throwIfError(error);
  return data;
}

export async function deleteNeed(id) {
  const { error } = await supabase.from("needs").delete().eq("id", id);
  throwIfError(error);
}

export async function listNeedConstraints(needId) {
  if (!needId) {
    return [];
  }

  const { data, error } = await supabase
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
    .eq("need_id", needId);
  throwIfError(error);
  return data ?? [];
}

export async function saveNeedConstraints(needId, constraints) {
  const { error: deleteError } = await supabase
    .from("need_constraints")
    .delete()
    .eq("need_id", needId);
  throwIfError(deleteError);

  const enabledRows = constraints
    .filter((row) => row.is_enabled)
    .map((row) => ({
      need_id: Number(needId),
      nutrient_id: Number(row.nutrient_id),
      label: row.label || row.nutrient?.code || "",
      min_value: Number(row.min_value ?? 0),
      max_value: Number(row.max_value ?? 9999),
      is_enabled: true,
    }));

  if (!enabledRows.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("need_constraints")
    .insert(enabledRows)
    .select();
  throwIfError(error);
  return data;
}

export async function listRatioConstraints(needId) {
  if (!needId) {
    return [];
  }

  const { data, error } = await supabase
    .from("ratio_constraints")
    .select("*")
    .eq("need_id", needId)
    .order("name");
  throwIfError(error);
  return data ?? [];
}

export async function saveRatioConstraints(needId, rows) {
  const { error: deleteError } = await supabase
    .from("ratio_constraints")
    .delete()
    .eq("need_id", needId);
  throwIfError(deleteError);

  const payload = rows
    .filter((row) => row.name && row.nutrient_a_id && row.nutrient_b_id)
    .map((row) => ({
      need_id: Number(needId),
      name: row.name,
      nutrient_a_id: Number(row.nutrient_a_id),
      nutrient_b_id: Number(row.nutrient_b_id),
      min_ratio: Number(row.min_ratio ?? 0),
      max_ratio: Number(row.max_ratio ?? 0),
    }));

  if (!payload.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("ratio_constraints")
    .insert(payload)
    .select();
  throwIfError(error);
  return data;
}
