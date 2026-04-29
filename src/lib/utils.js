import clsx from "clsx";

export function cn(...values) {
  return clsx(values);
}

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function formatNumber(value, options = {}) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
    ...options,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

export function formatCurrency(value, currency = "FCFA") {
  return `${formatNumber(value, { maximumFractionDigits: 0 })} ${currency}`;
}

export function parseNumeric(value, fallback = 0) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function groupBy(items, getKey) {
  return items.reduce((accumulator, item) => {
    const key = getKey(item) || "Sans categorie";
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(item);
    return accumulator;
  }, {});
}

export function firstUpper(value) {
  if (!value) {
    return "";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}
