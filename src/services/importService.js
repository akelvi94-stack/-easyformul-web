import * as XLSX from "xlsx";
import { supabase } from "../lib/supabase";
import { IMPORT_HEADERS, IMPORT_SHEETS } from "../lib/constants";
import { normalizeText, parseNumeric } from "../lib/utils";

function sheetRows(workbook, name) {
  const sheet = workbook.Sheets[name];
  if (!sheet) {
    return [];
  }
  return XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
  });
}

function buildInstructionSheet() {
  return XLSX.utils.aoa_to_sheet([
    ["Mode d'utilisation"],
    ["1. Ne changez pas le nom des feuilles ni l'ordre des colonnes."],
    ["2. Les lignes vides sont ignorees."],
    ["3. L'import ajoute ou met a jour le referentiel."],
    ["4. Les categories sont creees automatiquement si elles n'existent pas."],
    ["5. Utilisez les codes de nutriments de la feuille References."],
  ]);
}

function rowsToSheet(headers, rows) {
  return XLSX.utils.json_to_sheet(rows, {
    header: headers,
    skipHeader: false,
  });
}

async function fetchReferences() {
  const [animals, needs, categories, ingredients, nutrients] = await Promise.all([
    supabase.from("animals").select("*"),
    supabase.from("needs").select("*"),
    supabase.from("ingredient_categories").select("*"),
    supabase.from("ingredients").select("*"),
    supabase.from("nutrients").select("id, name, code"),
  ]);

  for (const response of [animals, needs, categories, ingredients, nutrients]) {
    if (response.error) {
      throw response.error;
    }
  }

  return {
    animals: animals.data ?? [],
    needs: needs.data ?? [],
    categories: categories.data ?? [],
    ingredients: ingredients.data ?? [],
    nutrients: nutrients.data ?? [],
  };
}

export async function exportReferentialTemplate() {
  const workbook = XLSX.utils.book_new();
  const references = await fetchReferences();
  const ingredientPrices = await supabase
    .from("ingredient_latest_prices")
    .select("*");
  const needConstraints = await supabase
    .from("need_constraints")
    .select("need_id, nutrient_id, min_value, max_value, is_enabled");
  const compositions = await supabase
    .from("ingredient_nutrients")
    .select("ingredient_id, nutrient_id, value");

  if (ingredientPrices.error) throw ingredientPrices.error;
  if (needConstraints.error) throw needConstraints.error;
  if (compositions.error) throw compositions.error;

  const animalMap = new Map(references.animals.map((row) => [row.id, row]));
  const categoryMap = new Map(references.categories.map((row) => [row.id, row]));
  const nutrientMap = new Map(references.nutrients.map((row) => [row.id, row]));
  const latestPriceMap = new Map(
    (ingredientPrices.data ?? []).map((row) => [row.ingredient_id, row.price_value]),
  );

  XLSX.utils.book_append_sheet(
    workbook,
    buildInstructionSheet(),
    IMPORT_SHEETS.instructions,
  );

  XLSX.utils.book_append_sheet(
    workbook,
    rowsToSheet(
      IMPORT_HEADERS.animals,
      references.animals.map((animal) => ({
        animal_nom: animal.name,
        animal_race: animal.breed,
        animal_stade: animal.stage,
      })),
    ),
    IMPORT_SHEETS.animals,
  );

  XLSX.utils.book_append_sheet(
    workbook,
    rowsToSheet(
      IMPORT_HEADERS.needs,
      references.needs.map((need) => {
        const animal = animalMap.get(need.animal_id);
        return {
          animal_nom: animal?.name ?? "",
          animal_race: animal?.breed ?? "",
          animal_stade: animal?.stage ?? "",
          besoin_nom: need.name,
        };
      }),
    ),
    IMPORT_SHEETS.needs,
  );

  XLSX.utils.book_append_sheet(
    workbook,
    rowsToSheet(
      IMPORT_HEADERS.constraints,
      (needConstraints.data ?? []).map((constraint) => {
        const need = references.needs.find((item) => item.id === constraint.need_id);
        const animal = animalMap.get(need?.animal_id);
        const nutrient = nutrientMap.get(constraint.nutrient_id);
        return {
          animal_nom: animal?.name ?? "",
          animal_race: animal?.breed ?? "",
          animal_stade: animal?.stage ?? "",
          besoin_nom: need?.name ?? "",
          nutriment_code: nutrient?.code ?? "",
          valeur_min: constraint.min_value,
          valeur_max: constraint.max_value,
        };
      }),
    ),
    IMPORT_SHEETS.constraints,
  );

  XLSX.utils.book_append_sheet(
    workbook,
    rowsToSheet(
      IMPORT_HEADERS.ingredients,
      references.ingredients.map((ingredient) => ({
        ingredient_nom: ingredient.name,
        categorie_nom: categoryMap.get(ingredient.category_id)?.name ?? "",
        incorp_min: ingredient.inclusion_min,
        incorp_max: ingredient.inclusion_max,
        prix_fcfa_kg: latestPriceMap.get(ingredient.id) ?? "",
        actif: ingredient.active ? "oui" : "non",
      })),
    ),
    IMPORT_SHEETS.ingredients,
  );

  XLSX.utils.book_append_sheet(
    workbook,
    rowsToSheet(
      IMPORT_HEADERS.compositions,
      (compositions.data ?? []).map((row) => ({
        ingredient_nom: references.ingredients.find((item) => item.id === row.ingredient_id)?.name ?? "",
        nutriment_code: nutrientMap.get(row.nutrient_id)?.code ?? "",
        valeur: row.value,
      })),
    ),
    IMPORT_SHEETS.compositions,
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      references.nutrients.map((nutrient) => ({
        nutriment_code: nutrient.code,
        nutriment_nom: nutrient.name,
      })),
    ),
    IMPORT_SHEETS.references,
  );

  XLSX.writeFileXLSX(workbook, "EasyFormul_Referentiel.xlsx");
}

export async function importReferentialWorkbook(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const result = {
    animalsCreated: 0,
    animalsUpdated: 0,
    needsCreated: 0,
    needsUpdated: 0,
    categoriesCreated: 0,
    ingredientsCreated: 0,
    ingredientsUpdated: 0,
    pricesUpserted: 0,
    constraintsUpserted: 0,
    compositionsImported: 0,
    errors: [],
  };

  const refs = await fetchReferences();
  const animalKeys = new Set(
    refs.animals.map((row) => `${normalizeText(row.name)}|${normalizeText(row.breed)}|${normalizeText(row.stage)}`),
  );
  const needKeys = new Set(
    refs.needs.map((row) => `${row.animal_id}|${normalizeText(row.name)}`),
  );
  const categoryKeys = new Set(refs.categories.map((row) => normalizeText(row.name)));
  const ingredientKeys = new Set(refs.ingredients.map((row) => normalizeText(row.name)));
  const nutrientMap = new Map();
  refs.nutrients.forEach((row) => {
    nutrientMap.set(normalizeText(row.code), row);
    nutrientMap.set(normalizeText(row.name), row);
  });

  const animalsRows = sheetRows(workbook, IMPORT_SHEETS.animals);
  const needsRows = sheetRows(workbook, IMPORT_SHEETS.needs);
  const constraintRows = sheetRows(workbook, IMPORT_SHEETS.constraints);
  const ingredientRows = sheetRows(workbook, IMPORT_SHEETS.ingredients);
  const compositionRows = sheetRows(workbook, IMPORT_SHEETS.compositions);

  const animalIdByKey = new Map(
    refs.animals.map((row) => [
      `${normalizeText(row.name)}|${normalizeText(row.breed)}|${normalizeText(row.stage)}`,
      row.id,
    ]),
  );
  const categoryIdByName = new Map(
    refs.categories.map((row) => [normalizeText(row.name), row.id]),
  );
  const ingredientIdByName = new Map(
    refs.ingredients.map((row) => [normalizeText(row.name), row.id]),
  );

  for (const row of animalsRows) {
    const key = `${normalizeText(row.animal_nom)}|${normalizeText(row.animal_race)}|${normalizeText(row.animal_stade)}`;
    if (key === "||") continue;

    const existed = animalKeys.has(key);
    const { data, error } = await supabase
      .from("animals")
      .upsert(
        {
          name: row.animal_nom,
          breed: row.animal_race,
          stage: row.animal_stade,
        },
        { onConflict: "name,breed,stage" },
      )
      .select()
      .single();

    if (error) {
      result.errors.push(`Animal ${row.animal_nom}: ${error.message}`);
      continue;
    }

    animalIdByKey.set(key, data.id);
    if (existed) result.animalsUpdated += 1;
    else {
      animalKeys.add(key);
      result.animalsCreated += 1;
    }
  }

  for (const row of needsRows) {
    const animalKey = `${normalizeText(row.animal_nom)}|${normalizeText(row.animal_race)}|${normalizeText(row.animal_stade)}`;
    const animalId = animalIdByKey.get(animalKey);
    if (!animalId) {
      result.errors.push(`Besoin ${row.besoin_nom}: animal introuvable.`);
      continue;
    }

    const key = `${animalId}|${normalizeText(row.besoin_nom)}`;
    const existed = needKeys.has(key);
    const { data, error } = await supabase
      .from("needs")
      .upsert(
        {
          name: row.besoin_nom,
          animal_id: animalId,
        },
        { onConflict: "animal_id,name" },
      )
      .select()
      .single();

    if (error) {
      result.errors.push(`Besoin ${row.besoin_nom}: ${error.message}`);
      continue;
    }

    needKeys.add(key);
    if (existed) result.needsUpdated += 1;
    else result.needsCreated += 1;
    refs.needs = refs.needs.filter((item) => item.id !== data.id).concat(data);
  }

  const needIdByKey = new Map(
    refs.needs.map((row) => [`${row.animal_id}|${normalizeText(row.name)}`, row.id]),
  );

  for (const row of ingredientRows) {
    const categoryName = row.categorie_nom || "Sans categorie";
    const categoryKey = normalizeText(categoryName);

    if (!categoryIdByName.has(categoryKey)) {
      const { data, error } = await supabase
        .from("ingredient_categories")
        .upsert({ name: categoryName }, { onConflict: "name" })
        .select()
        .single();
      if (error) {
        result.errors.push(`Categorie ${categoryName}: ${error.message}`);
        continue;
      }
      categoryIdByName.set(categoryKey, data.id);
      if (!categoryKeys.has(categoryKey)) {
        categoryKeys.add(categoryKey);
        result.categoriesCreated += 1;
      }
    }

    const ingredientKey = normalizeText(row.ingredient_nom);
    const existed = ingredientKeys.has(ingredientKey);
    const { data, error } = await supabase
      .from("ingredients")
      .upsert(
        {
          name: row.ingredient_nom,
          category_id: categoryIdByName.get(categoryKey),
          inclusion_min: parseNumeric(row.incorp_min, 0),
          inclusion_max: parseNumeric(row.incorp_max, 100),
          active: normalizeText(row.actif) !== "non",
        },
        { onConflict: "name" },
      )
      .select()
      .single();

    if (error) {
      result.errors.push(`Ingredient ${row.ingredient_nom}: ${error.message}`);
      continue;
    }

    ingredientIdByName.set(ingredientKey, data.id);
    if (existed) result.ingredientsUpdated += 1;
    else {
      ingredientKeys.add(ingredientKey);
      result.ingredientsCreated += 1;
    }

    const price = parseNumeric(row.prix_fcfa_kg, 0);
    if (price > 0) {
      const { error: priceError } = await supabase.from("ingredient_prices").insert({
        ingredient_id: data.id,
        price_value: price,
        currency: "FCFA",
      });
      if (priceError) {
        result.errors.push(`Prix ${row.ingredient_nom}: ${priceError.message}`);
      } else {
        result.pricesUpserted += 1;
      }
    }
  }

  for (const row of constraintRows) {
    const animalKey = `${normalizeText(row.animal_nom)}|${normalizeText(row.animal_race)}|${normalizeText(row.animal_stade)}`;
    const animalId = animalIdByKey.get(animalKey);
    const needId = needIdByKey.get(`${animalId}|${normalizeText(row.besoin_nom)}`);
    const nutrient = nutrientMap.get(normalizeText(row.nutriment_code));

    if (!animalId || !needId || !nutrient) {
      result.errors.push(`Contrainte ${row.besoin_nom}/${row.nutriment_code}: reference introuvable.`);
      continue;
    }

    const { error } = await supabase
      .from("need_constraints")
      .upsert(
        {
          need_id: needId,
          nutrient_id: nutrient.id,
          label: row.nutriment_code,
          min_value: parseNumeric(row.valeur_min, 0),
          max_value: parseNumeric(row.valeur_max, 9999),
          is_enabled: true,
        },
        { onConflict: "need_id,nutrient_id" },
      );

    if (error) {
      result.errors.push(`Contrainte ${row.besoin_nom}/${row.nutriment_code}: ${error.message}`);
    } else {
      result.constraintsUpserted += 1;
    }
  }

  const compositionGroups = new Map();
  for (const row of compositionRows) {
    const ingredientId = ingredientIdByName.get(normalizeText(row.ingredient_nom));
    const nutrient = nutrientMap.get(normalizeText(row.nutriment_code));

    if (!ingredientId || !nutrient) {
      result.errors.push(`Composition ${row.ingredient_nom}/${row.nutriment_code}: reference introuvable.`);
      continue;
    }

    if (!compositionGroups.has(ingredientId)) {
      compositionGroups.set(ingredientId, []);
    }
    compositionGroups.get(ingredientId).push({
      ingredient_id: ingredientId,
      nutrient_id: nutrient.id,
      value: parseNumeric(row.valeur, 0),
    });
  }

  for (const [ingredientId, rows] of compositionGroups.entries()) {
    const { error: deleteError } = await supabase
      .from("ingredient_nutrients")
      .delete()
      .eq("ingredient_id", ingredientId);
    if (deleteError) {
      result.errors.push(`Composition ingredient ${ingredientId}: ${deleteError.message}`);
      continue;
    }

    const validRows = rows.filter((item) => Number(item.value) !== 0);
    if (!validRows.length) continue;

    const { error } = await supabase.from("ingredient_nutrients").insert(validRows);
    if (error) {
      result.errors.push(`Composition ingredient ${ingredientId}: ${error.message}`);
    } else {
      result.compositionsImported += validRows.length;
    }
  }

  return result;
}
