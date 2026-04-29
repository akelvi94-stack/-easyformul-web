import { supabase } from "../lib/supabase";

export async function fetchDashboardSnapshot() {
  const countQueries = [
    supabase.from("animals").select("*", { count: "exact", head: true }),
    supabase.from("needs").select("*", { count: "exact", head: true }),
    supabase.from("ingredients").select("*", { count: "exact", head: true }),
    supabase.from("nutrients").select("*", { count: "exact", head: true }),
    supabase.from("formulations").select("*", { count: "exact", head: true }),
  ];

  const [
    animalsCount,
    needsCount,
    ingredientsCount,
    nutrientsCount,
    formulationsCount,
    recentFormulations,
    priceAlerts,
  ] = await Promise.all([
    ...countQueries,
    supabase
      .from("formulations_catalog")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("ingredients_catalog")
      .select("*")
      .or("current_price.is.null,current_price.eq.0")
      .order("name", { ascending: true })
      .limit(8),
  ]);

  const errors = [
    animalsCount.error,
    needsCount.error,
    ingredientsCount.error,
    nutrientsCount.error,
    formulationsCount.error,
    recentFormulations.error,
    priceAlerts.error,
  ].filter(Boolean);

  if (errors.length) {
    throw errors[0];
  }

  return {
    animalsCount: animalsCount.count ?? 0,
    needsCount: needsCount.count ?? 0,
    ingredientsCount: ingredientsCount.count ?? 0,
    nutrientsCount: nutrientsCount.count ?? 0,
    formulationsCount: formulationsCount.count ?? 0,
    recentFormulations: recentFormulations.data ?? [],
    priceAlerts: priceAlerts.data ?? [],
  };
}
