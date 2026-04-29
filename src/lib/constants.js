import {
  Beef,
  Boxes,
  FlaskConical,
  FolderInput,
  LayoutDashboard,
  Scale,
  ScrollText,
} from "lucide-react";

export const NAV_ITEMS = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/referentiel/nutriments", label: "Nutriments", icon: FlaskConical },
  { to: "/referentiel/ingredients", label: "Ingredients", icon: Boxes },
  { to: "/referentiel/animaux", label: "Animaux & besoins", icon: Beef },
  { to: "/imports", label: "Imports Excel", icon: FolderInput },
  { to: "/formulation", label: "Nouvelle formulation", icon: Scale },
  { to: "/formulations", label: "Historique", icon: ScrollText },
];

export const BASE_OPTIONS = [
  { label: "100 kg", value: 100 },
  { label: "250 kg", value: 250 },
  { label: "500 kg", value: 500 },
  { label: "1000 kg", value: 1000 },
];

export const NUTRIENT_FAMILIES = [
  "Energie",
  "Proteines et acides amines",
  "Mineraux",
  "Fibres et lipides",
  "Oligo-elements",
  "Autres",
];

export const IMPORT_SHEETS = {
  instructions: "Instructions",
  animals: "Animaux",
  needs: "Besoins",
  constraints: "ContraintesBesoins",
  ingredients: "Ingredients",
  compositions: "CompositionIngredients",
  references: "References",
};

export const IMPORT_HEADERS = {
  animals: ["animal_nom", "animal_race", "animal_stade"],
  needs: ["animal_nom", "animal_race", "animal_stade", "besoin_nom"],
  constraints: [
    "animal_nom",
    "animal_race",
    "animal_stade",
    "besoin_nom",
    "nutriment_code",
    "valeur_min",
    "valeur_max",
  ],
  ingredients: [
    "ingredient_nom",
    "categorie_nom",
    "incorp_min",
    "incorp_max",
    "prix_fcfa_kg",
    "actif",
  ],
  compositions: ["ingredient_nom", "nutriment_code", "valeur"],
};
