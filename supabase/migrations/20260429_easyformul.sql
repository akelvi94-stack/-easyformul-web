create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'user',
  locale text not null default 'fr',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.units (
  id bigint generated always as identity primary key,
  name text not null unique,
  symbol text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.unit_conversions (
  id bigint generated always as identity primary key,
  source_unit_id bigint not null references public.units (id) on delete cascade,
  target_unit_id bigint not null references public.units (id) on delete cascade,
  factor numeric(18,8) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_unit_id, target_unit_id)
);

create table if not exists public.nutrients (
  id bigint generated always as identity primary key,
  name text not null,
  code text not null unique,
  family text not null default 'Autres',
  mandatory boolean not null default false,
  active boolean not null default true,
  unit_id bigint not null references public.units (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.animals (
  id bigint generated always as identity primary key,
  name text not null,
  breed text not null default '',
  stage text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, breed, stage)
);

create table if not exists public.needs (
  id bigint generated always as identity primary key,
  name text not null,
  animal_id bigint not null references public.animals (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (animal_id, name)
);

create table if not exists public.need_constraints (
  need_id bigint not null references public.needs (id) on delete cascade,
  nutrient_id bigint not null references public.nutrients (id) on delete cascade,
  label text not null default '',
  min_value numeric(18,6) not null default 0,
  max_value numeric(18,6) not null default 9999,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (need_id, nutrient_id)
);

create table if not exists public.ratio_constraints (
  id bigint generated always as identity primary key,
  name text not null,
  nutrient_a_id bigint not null references public.nutrients (id) on delete cascade,
  nutrient_b_id bigint not null references public.nutrients (id) on delete cascade,
  min_ratio numeric(18,6) not null default 0,
  max_ratio numeric(18,6) not null default 1,
  need_id bigint not null references public.needs (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (need_id, name)
);

create table if not exists public.ingredient_categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ingredients (
  id bigint generated always as identity primary key,
  name text not null unique,
  inclusion_min numeric(18,6) not null default 0,
  inclusion_max numeric(18,6) not null default 100,
  active boolean not null default true,
  category_id bigint not null references public.ingredient_categories (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ingredient_prices (
  id bigint generated always as identity primary key,
  ingredient_id bigint not null references public.ingredients (id) on delete cascade,
  price_value numeric(18,6) not null,
  currency text not null default 'FCFA',
  effective_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.ingredient_nutrients (
  ingredient_id bigint not null references public.ingredients (id) on delete cascade,
  nutrient_id bigint not null references public.nutrients (id) on delete cascade,
  value numeric(18,6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (ingredient_id, nutrient_id)
);

create table if not exists public.ingredient_analysis_details (
  id bigint generated always as identity primary key,
  ingredient_id bigint not null references public.ingredients (id) on delete cascade,
  nutrient_id bigint references public.nutrients (id) on delete set null,
  display_order integer not null default 0,
  label text not null,
  code text not null default '',
  raw_value text not null default '',
  numeric_value numeric(18,6),
  unit text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ingredient_id, label)
);

create table if not exists public.formulations (
  id bigint generated always as identity primary key,
  name text not null,
  total_cost numeric(18,6) not null default 0,
  cost_per_100kg numeric(18,6) not null default 0,
  base_calculation numeric(18,6) not null default 100,
  status text not null default 'brouillon',
  need_id bigint not null references public.needs (id) on delete restrict,
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.formulation_ingredients (
  formulation_id bigint not null references public.formulations (id) on delete cascade,
  ingredient_id bigint not null references public.ingredients (id) on delete restrict,
  proportion numeric(18,6) not null default 0,
  quantity_kg numeric(18,6) not null default 0,
  cost_fcfa numeric(18,6) not null default 0,
  created_at timestamptz not null default now(),
  primary key (formulation_id, ingredient_id)
);

create index if not exists idx_needs_animal_id on public.needs (animal_id);
create index if not exists idx_need_constraints_need_id on public.need_constraints (need_id);
create index if not exists idx_ratio_constraints_need_id on public.ratio_constraints (need_id);
create index if not exists idx_ingredient_prices_ingredient_id on public.ingredient_prices (ingredient_id, effective_at desc);
create index if not exists idx_ingredient_nutrients_nutrient_id on public.ingredient_nutrients (nutrient_id);
create index if not exists idx_formulations_need_id on public.formulations (need_id);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists trg_units_updated_at on public.units;
create trigger trg_units_updated_at before update on public.units for each row execute procedure public.set_updated_at();
drop trigger if exists trg_unit_conversions_updated_at on public.unit_conversions;
create trigger trg_unit_conversions_updated_at before update on public.unit_conversions for each row execute procedure public.set_updated_at();
drop trigger if exists trg_nutrients_updated_at on public.nutrients;
create trigger trg_nutrients_updated_at before update on public.nutrients for each row execute procedure public.set_updated_at();
drop trigger if exists trg_animals_updated_at on public.animals;
create trigger trg_animals_updated_at before update on public.animals for each row execute procedure public.set_updated_at();
drop trigger if exists trg_needs_updated_at on public.needs;
create trigger trg_needs_updated_at before update on public.needs for each row execute procedure public.set_updated_at();
drop trigger if exists trg_need_constraints_updated_at on public.need_constraints;
create trigger trg_need_constraints_updated_at before update on public.need_constraints for each row execute procedure public.set_updated_at();
drop trigger if exists trg_ratio_constraints_updated_at on public.ratio_constraints;
create trigger trg_ratio_constraints_updated_at before update on public.ratio_constraints for each row execute procedure public.set_updated_at();
drop trigger if exists trg_ingredient_categories_updated_at on public.ingredient_categories;
create trigger trg_ingredient_categories_updated_at before update on public.ingredient_categories for each row execute procedure public.set_updated_at();
drop trigger if exists trg_ingredients_updated_at on public.ingredients;
create trigger trg_ingredients_updated_at before update on public.ingredients for each row execute procedure public.set_updated_at();
drop trigger if exists trg_ingredient_nutrients_updated_at on public.ingredient_nutrients;
create trigger trg_ingredient_nutrients_updated_at before update on public.ingredient_nutrients for each row execute procedure public.set_updated_at();
drop trigger if exists trg_ingredient_analysis_details_updated_at on public.ingredient_analysis_details;
create trigger trg_ingredient_analysis_details_updated_at before update on public.ingredient_analysis_details for each row execute procedure public.set_updated_at();
drop trigger if exists trg_formulations_updated_at on public.formulations;
create trigger trg_formulations_updated_at before update on public.formulations for each row execute procedure public.set_updated_at();

create or replace view public.nutrients_catalog as
select
  n.id,
  n.name,
  n.code,
  n.family,
  n.mandatory,
  n.active,
  n.unit_id,
  u.name as unit_name,
  u.symbol as unit_symbol
from public.nutrients n
join public.units u on u.id = n.unit_id;

create or replace view public.ingredient_latest_prices as
select distinct on (ingredient_id)
  ingredient_id,
  price_value,
  currency,
  effective_at
from public.ingredient_prices
order by ingredient_id, effective_at desc, id desc;

create or replace view public.ingredients_catalog as
select
  i.id,
  i.name,
  i.inclusion_min,
  i.inclusion_max,
  i.active,
  i.category_id,
  c.name as category_name,
  p.price_value as current_price,
  p.currency,
  p.effective_at as current_price_at
from public.ingredients i
join public.ingredient_categories c on c.id = i.category_id
left join public.ingredient_latest_prices p on p.ingredient_id = i.id;

create or replace view public.needs_catalog as
select
  n.id,
  n.name,
  n.animal_id,
  a.name as animal_name,
  a.breed as animal_breed,
  a.stage as animal_stage,
  concat_ws(' • ', a.name, a.breed, a.stage) as animal_label
from public.needs n
join public.animals a on a.id = n.animal_id;

create or replace view public.formulations_catalog as
select
  f.id,
  f.name,
  f.status,
  f.total_cost,
  f.cost_per_100kg,
  f.base_calculation,
  f.created_at,
  n.name as need_name,
  concat_ws(' • ', a.name, a.breed, a.stage) as animal_label,
  p.full_name as owner_name
from public.formulations f
join public.needs n on n.id = f.need_id
join public.animals a on a.id = n.animal_id
left join public.profiles p on p.id = f.user_id;

alter table public.profiles enable row level security;
alter table public.units enable row level security;
alter table public.unit_conversions enable row level security;
alter table public.nutrients enable row level security;
alter table public.animals enable row level security;
alter table public.needs enable row level security;
alter table public.need_constraints enable row level security;
alter table public.ratio_constraints enable row level security;
alter table public.ingredient_categories enable row level security;
alter table public.ingredients enable row level security;
alter table public.ingredient_prices enable row level security;
alter table public.ingredient_nutrients enable row level security;
alter table public.ingredient_analysis_details enable row level security;
alter table public.formulations enable row level security;
alter table public.formulation_ingredients enable row level security;

drop policy if exists profiles_all_authenticated on public.profiles;
create policy profiles_all_authenticated on public.profiles for all to authenticated using (true) with check (true);
drop policy if exists units_all_authenticated on public.units;
create policy units_all_authenticated on public.units for all to authenticated using (true) with check (true);
drop policy if exists unit_conversions_all_authenticated on public.unit_conversions;
create policy unit_conversions_all_authenticated on public.unit_conversions for all to authenticated using (true) with check (true);
drop policy if exists nutrients_all_authenticated on public.nutrients;
create policy nutrients_all_authenticated on public.nutrients for all to authenticated using (true) with check (true);
drop policy if exists animals_all_authenticated on public.animals;
create policy animals_all_authenticated on public.animals for all to authenticated using (true) with check (true);
drop policy if exists needs_all_authenticated on public.needs;
create policy needs_all_authenticated on public.needs for all to authenticated using (true) with check (true);
drop policy if exists need_constraints_all_authenticated on public.need_constraints;
create policy need_constraints_all_authenticated on public.need_constraints for all to authenticated using (true) with check (true);
drop policy if exists ratio_constraints_all_authenticated on public.ratio_constraints;
create policy ratio_constraints_all_authenticated on public.ratio_constraints for all to authenticated using (true) with check (true);
drop policy if exists ingredient_categories_all_authenticated on public.ingredient_categories;
create policy ingredient_categories_all_authenticated on public.ingredient_categories for all to authenticated using (true) with check (true);
drop policy if exists ingredients_all_authenticated on public.ingredients;
create policy ingredients_all_authenticated on public.ingredients for all to authenticated using (true) with check (true);
drop policy if exists ingredient_prices_all_authenticated on public.ingredient_prices;
create policy ingredient_prices_all_authenticated on public.ingredient_prices for all to authenticated using (true) with check (true);
drop policy if exists ingredient_nutrients_all_authenticated on public.ingredient_nutrients;
create policy ingredient_nutrients_all_authenticated on public.ingredient_nutrients for all to authenticated using (true) with check (true);
drop policy if exists ingredient_analysis_details_all_authenticated on public.ingredient_analysis_details;
create policy ingredient_analysis_details_all_authenticated on public.ingredient_analysis_details for all to authenticated using (true) with check (true);
drop policy if exists formulations_all_authenticated on public.formulations;
create policy formulations_all_authenticated on public.formulations for all to authenticated using (true) with check (true);
drop policy if exists formulation_ingredients_all_authenticated on public.formulation_ingredients;
create policy formulation_ingredients_all_authenticated on public.formulation_ingredients for all to authenticated using (true) with check (true);

insert into public.units (name, symbol)
values
  ('Megajoule par kilogramme', 'MJ/kg'),
  ('Kilocalorie par kilogramme', 'kcal/kg'),
  ('Gramme par kilogramme', 'g/kg'),
  ('Pourcentage', '%'),
  ('Partie par million', 'ppm')
on conflict (name) do nothing;

insert into public.unit_conversions (source_unit_id, target_unit_id, factor)
select s.id, t.id, factor
from (
  values
    ('g/kg', '%', 0.1::numeric),
    ('MJ/kg', 'kcal/kg', 239.005736::numeric),
    ('ppm', 'ppm', 1::numeric),
    ('%', '%', 1::numeric),
    ('g/kg', 'g/kg', 1::numeric),
    ('MJ/kg', 'MJ/kg', 1::numeric),
    ('kcal/kg', 'kcal/kg', 1::numeric)
) as map(source_symbol, target_symbol, factor)
join public.units s on s.symbol = map.source_symbol
join public.units t on t.symbol = map.target_symbol
on conflict (source_unit_id, target_unit_id) do update set factor = excluded.factor;

insert into public.nutrients (name, code, family, mandatory, unit_id)
select name, code, family, mandatory, unit_id
from (
  values
    ('Energie Metabolisable', 'EM', 'Energie', true, 'MJ/kg'),
    ('Energie brute', 'EB', 'Energie', true, 'kcal/kg'),
    ('Proteines brutes', 'PB', 'Proteines et acides amines', true, '%'),
    ('Lysine', 'Lys', 'Proteines et acides amines', false, '%'),
    ('Methionine', 'Met', 'Proteines et acides amines', false, '%'),
    ('Met+Cys', 'Met+Cys', 'Proteines et acides amines', false, '%'),
    ('Threonine', 'Thr', 'Proteines et acides amines', false, '%'),
    ('Tryptophane', 'Trp', 'Proteines et acides amines', false, '%'),
    ('Matieres grasses', 'MG', 'Fibres et lipides', false, '%'),
    ('Cellulose', 'CB', 'Fibres et lipides', false, '%'),
    ('Calcium', 'Ca', 'Mineraux', true, '%'),
    ('Phosphore disponible', 'Pd', 'Mineraux', true, '%'),
    ('Phosphore total', 'Pt', 'Mineraux', false, '%'),
    ('Sodium', 'Na', 'Mineraux', true, '%'),
    ('Fluorine', 'F', 'Oligo-elements', false, '%'),
    ('Arsenic', 'As', 'Oligo-elements', false, 'ppm'),
    ('Cadmium', 'Cd', 'Oligo-elements', false, 'ppm'),
    ('Plomb', 'Pb', 'Oligo-elements', false, 'ppm'),
    ('Mercure', 'Hg', 'Oligo-elements', false, 'ppm')
) as seed(name, code, family, mandatory, unit_symbol)
join public.units u on u.symbol = seed.unit_symbol
on conflict (code) do update set
  name = excluded.name,
  family = excluded.family,
  mandatory = excluded.mandatory,
  unit_id = excluded.unit_id;

insert into public.ingredient_categories (name)
values
  ('Cereales et sous-produits'),
  ('Tourteaux et proteagineux'),
  ('Farines animales'),
  ('Mineraux et correcteurs'),
  ('Vitamines et additifs')
on conflict (name) do nothing;

insert into public.animals (name, breed, stage)
values
  ('Poulet de chair', 'Ross 308', 'Demarrage (0-14j)'),
  ('Poulet de chair', 'Ross 308', 'Croissance (15-35j)'),
  ('Poulet de chair', 'Ross 308', 'Finition (36j+)'),
  ('Poule pondeuse', 'Isa Brown', 'Ponte (18sem+)')
on conflict (name, breed, stage) do nothing;

insert into public.needs (name, animal_id)
select seed.name, animals.id
from (
  values
    ('Besoins Poulet Chair Demarrage', 'Poulet de chair', 'Ross 308', 'Demarrage (0-14j)'),
    ('Besoins Poulet Chair Croissance', 'Poulet de chair', 'Ross 308', 'Croissance (15-35j)'),
    ('Besoins Poulet Chair Finition', 'Poulet de chair', 'Ross 308', 'Finition (36j+)'),
    ('Besoins Poule Ponte', 'Poule pondeuse', 'Isa Brown', 'Ponte (18sem+)')
) as seed(name, animal_name, breed, stage)
join public.animals on
  animals.name = seed.animal_name
  and animals.breed = seed.breed
  and animals.stage = seed.stage
on conflict (animal_id, name) do nothing;

insert into public.need_constraints (need_id, nutrient_id, label, min_value, max_value, is_enabled)
select needs.id, nutrients.id, seed.label, seed.min_value, seed.max_value, true
from (
  values
    ('Besoins Poulet Chair Demarrage', 'EM', 'EM Demarrage', 12.5, 13.5),
    ('Besoins Poulet Chair Demarrage', 'PB', 'PB Demarrage', 21.0, 23.0),
    ('Besoins Poulet Chair Demarrage', 'Ca', 'Ca Demarrage', 0.9, 1.1),
    ('Besoins Poulet Chair Demarrage', 'Pd', 'Pd Demarrage', 0.45, 0.55),
    ('Besoins Poulet Chair Croissance', 'EM', 'EM Croissance', 12.8, 13.5),
    ('Besoins Poulet Chair Croissance', 'PB', 'PB Croissance', 19.0, 21.0),
    ('Besoins Poulet Chair Croissance', 'Ca', 'Ca Croissance', 0.85, 1.0),
    ('Besoins Poulet Chair Croissance', 'Pd', 'Pd Croissance', 0.4, 0.5),
    ('Besoins Poulet Chair Finition', 'EM', 'EM Finition', 13.0, 13.8),
    ('Besoins Poulet Chair Finition', 'PB', 'PB Finition', 17.0, 19.0),
    ('Besoins Poulet Chair Finition', 'Ca', 'Ca Finition', 0.8, 0.95),
    ('Besoins Poule Ponte', 'EM', 'EM Ponte', 11.0, 11.8),
    ('Besoins Poule Ponte', 'PB', 'PB Ponte', 15.5, 17.5),
    ('Besoins Poule Ponte', 'Ca', 'Ca Ponte', 3.4, 4.0),
    ('Besoins Poule Ponte', 'Pd', 'Pd Ponte', 0.35, 0.45)
) as seed(need_name, nutrient_code, label, min_value, max_value)
join public.needs on needs.name = seed.need_name
join public.nutrients on nutrients.code = seed.nutrient_code
on conflict (need_id, nutrient_id) do update set
  label = excluded.label,
  min_value = excluded.min_value,
  max_value = excluded.max_value,
  is_enabled = excluded.is_enabled;

insert into public.ratio_constraints (name, nutrient_a_id, nutrient_b_id, min_ratio, max_ratio, need_id)
select seed.name, a.id, b.id, seed.min_ratio, seed.max_ratio, n.id
from (
  values
    ('Ratio Ca/P Demarrage', 'Ca', 'Pt', 0.60, 0.70, 'Besoins Poulet Chair Demarrage'),
    ('Ratio Ca/P Croissance', 'Ca', 'Pt', 0.60, 0.70, 'Besoins Poulet Chair Croissance'),
    ('Ratio Ca/P Finition', 'Ca', 'Pt', 0.60, 0.70, 'Besoins Poulet Chair Finition'),
    ('Ratio Ca/P Ponte', 'Ca', 'Pt', 0.88, 0.92, 'Besoins Poule Ponte')
) as seed(name, nutrient_a_code, nutrient_b_code, min_ratio, max_ratio, need_name)
join public.nutrients a on a.code = seed.nutrient_a_code
join public.nutrients b on b.code = seed.nutrient_b_code
join public.needs n on n.name = seed.need_name;
on conflict (need_id, name) do update set
  nutrient_a_id = excluded.nutrient_a_id,
  nutrient_b_id = excluded.nutrient_b_id,
  min_ratio = excluded.min_ratio,
  max_ratio = excluded.max_ratio;
