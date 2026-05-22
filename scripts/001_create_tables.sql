-- Profiles table linked to auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  phone text,
  age integer,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Theory test dates (admin managed)
create table if not exists public.theory_test_dates (
  id uuid primary key default gen_random_uuid(),
  test_date date not null,
  location text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamptz default now()
);

alter table public.theory_test_dates enable row level security;
create policy "theory_test_dates_select_all" on public.theory_test_dates for select using (true);

-- Practical test dates (admin managed)
create table if not exists public.practical_test_dates (
  id uuid primary key default gen_random_uuid(),
  test_date date not null,
  location text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamptz default now()
);

alter table public.practical_test_dates enable row level security;
create policy "practical_test_dates_select_all" on public.practical_test_dates for select using (true);

-- Training theory questions (always open, practice)
create table if not exists public.training_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer text not null,
  created_at timestamptz default now()
);

alter table public.training_questions enable row level security;
create policy "training_questions_select_all" on public.training_questions for select using (true);

-- Real theory test scores (admin entered)
create table if not exists public.theory_test_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null default 0,
  created_at timestamptz default now()
);

alter table public.theory_test_scores enable row level security;
create policy "theory_scores_select_own" on public.theory_test_scores for select using (auth.uid() = user_id);

-- DL Practical test grades (from deep learning model)
create table if not exists public.practical_test_grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parking_score integer default 0,
  speed_score integer default 0,
  seatbelt_score integer default 0,
  lane_score integer default 0,
  total_score integer default 0,
  created_at timestamptz default now()
);

alter table public.practical_test_grades enable row level security;
create policy "practical_grades_select_own" on public.practical_test_grades for select using (auth.uid() = user_id);
create policy "practical_grades_insert_own" on public.practical_test_grades for insert with check (auth.uid() = user_id);

-- Final grades (admin entered)
create table if not exists public.final_grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  final_grade integer default 0,
  notes text,
  created_at timestamptz default now()
);

alter table public.final_grades enable row level security;
create policy "final_grades_select_own" on public.final_grades for select using (auth.uid() = user_id);

-- User test date selections
create table if not exists public.user_test_selections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_type text not null, -- 'theory' or 'practical'
  test_date_id uuid not null,
  created_at timestamptz default now()
);

alter table public.user_test_selections enable row level security;
create policy "selections_select_own" on public.user_test_selections for select using (auth.uid() = user_id);
create policy "selections_insert_own" on public.user_test_selections for insert with check (auth.uid() = user_id);
