import solver from "javascript-lp-solver";

function coefficientFromIngredient(ingredient, nutrientId) {
  const raw = Number(ingredient.composition?.[nutrientId] ?? 0);
  return raw / 100;
}

function validateInput({ ingredients, constraints, ratios, baseCalculation }) {
  if (!ingredients?.length) {
    return "Aucun ingredient selectionne.";
  }

  if (!Number.isFinite(baseCalculation) || baseCalculation <= 0) {
    return "La base de calcul doit etre strictement positive.";
  }

  const totalMin = ingredients.reduce(
    (sum, ingredient) => sum + Number(ingredient.inclusion_min ?? 0),
    0,
  );
  const totalMax = ingredients.reduce(
    (sum, ingredient) => sum + Number(ingredient.inclusion_max ?? 100),
    0,
  );

  if (totalMin > 100.0001) {
    return "La somme des incorporations minimales depasse 100 %.";
  }

  if (totalMax < 99.9999) {
    return "La somme des incorporations maximales est inferieure a 100 %.";
  }

  for (const constraint of constraints) {
    if (
      Number(constraint.max_value ?? 9999) > 0 &&
      Number(constraint.max_value ?? 9999) < Number(constraint.min_value ?? 0)
    ) {
      return `La contrainte ${constraint.label || constraint.nutrient?.code} est incoherente.`;
    }
  }

  for (const ratio of ratios) {
    if (Number(ratio.min_ratio ?? 0) > Number(ratio.max_ratio ?? 0)) {
      return `Le ratio ${ratio.name} est incoherent.`;
    }
  }

  return null;
}

export function solveLeastCostFormula({
  name,
  baseCalculation = 100,
  ingredients = [],
  constraints = [],
  ratios = [],
}) {
  const validationMessage = validateInput({
    ingredients,
    constraints,
    ratios,
    baseCalculation,
  });

  if (validationMessage) {
    return {
      success: false,
      validationError: true,
      message: validationMessage,
      rows: [],
      nutrientChecks: [],
      ratioChecks: [],
    };
  }

  const model = {
    optimize: "cost",
    opType: "min",
    constraints: {
      total: { equal: 100 },
    },
    variables: {},
  };

  for (const ingredient of ingredients) {
    const variableName = `ingredient_${ingredient.id}`;
    model.constraints[`ing_min_${ingredient.id}`] = {
      min: Number(ingredient.inclusion_min ?? 0),
    };
    model.constraints[`ing_max_${ingredient.id}`] = {
      max: Number(ingredient.inclusion_max ?? 100),
    };

    const variable = {
      cost: Number(ingredient.current_price ?? 0),
      total: 1,
      [`ing_min_${ingredient.id}`]: 1,
      [`ing_max_${ingredient.id}`]: 1,
    };

    for (const constraint of constraints) {
      const coefficient = coefficientFromIngredient(ingredient, constraint.nutrient_id);

      if (Number(constraint.min_value ?? 0) > 0) {
        const key = `nutrient_min_${constraint.nutrient_id}`;
        model.constraints[key] = { min: Number(constraint.min_value) };
        variable[key] = coefficient;
      }

      if (Number(constraint.max_value ?? 9999) < 9999) {
        const key = `nutrient_max_${constraint.nutrient_id}`;
        model.constraints[key] = { max: Number(constraint.max_value) };
        variable[key] = coefficient;
      }
    }

    for (const ratio of ratios) {
      const a = coefficientFromIngredient(ingredient, ratio.nutrient_a_id);
      const b = coefficientFromIngredient(ingredient, ratio.nutrient_b_id);
      const minKey = `ratio_min_${ratio.id}`;
      const maxKey = `ratio_max_${ratio.id}`;

      model.constraints[minKey] = { min: 0 };
      model.constraints[maxKey] = { max: 0 };
      variable[minKey] = a - Number(ratio.min_ratio ?? 0) * b;
      variable[maxKey] = a - Number(ratio.max_ratio ?? 0) * b;
    }

    model.variables[variableName] = variable;
  }

  const solution = solver.Solve(model);

  if (!solution?.feasible) {
    return {
      success: false,
      validationError: false,
      message:
        "Aucune solution faisable n'a ete trouvee. Verifiez les contraintes nutritionnelles et les bornes d'incorporation.",
      rows: [],
      nutrientChecks: [],
      ratioChecks: [],
    };
  }

  const factor = baseCalculation / 100;
  const rows = ingredients
    .map((ingredient) => {
      const variableName = `ingredient_${ingredient.id}`;
      const proportion = Number(solution[variableName] ?? 0);
      return {
        ingredient,
        proportion,
        quantity_kg: proportion * factor,
        cost_fcfa: proportion * Number(ingredient.current_price ?? 0) * factor,
      };
    })
    .filter((row) => row.proportion > 0.0001);

  const nutrientChecks = constraints.map((constraint) => {
    const actual = ingredients.reduce((sum, ingredient) => {
      const variableName = `ingredient_${ingredient.id}`;
      const proportion = Number(solution[variableName] ?? 0);
      return sum + proportion * coefficientFromIngredient(ingredient, constraint.nutrient_id);
    }, 0);

    return {
      nutrient: constraint.nutrient,
      label: constraint.label,
      min_value: Number(constraint.min_value ?? 0),
      max_value: Number(constraint.max_value ?? 9999),
      actual,
      compliant:
        actual >= Number(constraint.min_value ?? 0) - 0.01 &&
        actual <= Number(constraint.max_value ?? 9999) + 0.01,
    };
  });

  const ratioChecks = ratios.map((ratio) => {
    const [sumA, sumB] = ingredients.reduce(
      (accumulator, ingredient) => {
        const variableName = `ingredient_${ingredient.id}`;
        const proportion = Number(solution[variableName] ?? 0);
        accumulator[0] +=
          proportion * coefficientFromIngredient(ingredient, ratio.nutrient_a_id);
        accumulator[1] +=
          proportion * coefficientFromIngredient(ingredient, ratio.nutrient_b_id);
        return accumulator;
      },
      [0, 0],
    );

    const actual = sumB > 0 ? sumA / sumB : 0;
    return {
      name: ratio.name,
      min_ratio: Number(ratio.min_ratio ?? 0),
      max_ratio: Number(ratio.max_ratio ?? 9999),
      actual,
      compliant:
        actual >= Number(ratio.min_ratio ?? 0) - 0.001 &&
        actual <= Number(ratio.max_ratio ?? 9999) + 0.001,
    };
  });

  return {
    success: true,
    validationError: false,
    message: `${name || "Formulation"} optimisee avec succes.`,
    cost_per_100kg: Number(solution.result ?? 0),
    total_cost: Number(solution.result ?? 0) * factor,
    rows,
    nutrientChecks,
    ratioChecks,
  };
}
