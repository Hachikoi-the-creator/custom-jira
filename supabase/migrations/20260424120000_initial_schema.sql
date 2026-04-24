-- custom-jira: core schema (Postgres / Supabase)
-- Tables: clients, meetings, action_items, problems, reports
-- Requires PostgreSQL 13+ (gen_random_uuid built-in).

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text,
  phone text,
  notes text,
  tags text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- meetings
-- ---------------------------------------------------------------------------
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  title text not null,
  date date not null,
  attendees text,
  content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meetings_client_id_idx on public.meetings (client_id);
create index meetings_date_idx on public.meetings (date desc);

create trigger meetings_set_updated_at
before update on public.meetings
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- action_items (tasks board + meeting items)
-- ---------------------------------------------------------------------------
create table public.action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references public.meetings (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  text text not null,
  done boolean not null default false,
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done')),
  due_date timestamptz,
  created_at timestamptz not null default now()
);

create index action_items_meeting_id_idx on public.action_items (meeting_id);
create index action_items_client_id_idx on public.action_items (client_id);
create index action_items_status_idx on public.action_items (status);
create index action_items_done_idx on public.action_items (done);

-- ---------------------------------------------------------------------------
-- problems
-- ---------------------------------------------------------------------------
create table public.problems (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  title text not null,
  description text not null default '',
  solution text not null default '',
  tags text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index problems_client_id_idx on public.problems (client_id);

create trigger problems_set_updated_at
before update on public.problems
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- reports (share_token generated when row is created)
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  title text not null,
  period text,
  html_content text,
  share_token text not null default (replace(gen_random_uuid()::text, '-', '')) unique,
  created_at timestamptz not null default now()
);

create index reports_client_id_idx on public.reports (client_id);
create index reports_share_token_idx on public.reports (share_token);

-- ---------------------------------------------------------------------------
-- Public read by token (anon cannot select from reports under RLS)
-- ---------------------------------------------------------------------------
create or replace function public.get_report_by_share_token(p_token text)
returns setof public.reports
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.reports
  where share_token = p_token
  limit 1;
$$;

revoke all on function public.get_report_by_share_token(text) from public;
grant execute on function public.get_report_by_share_token(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.clients enable row level security;
alter table public.meetings enable row level security;
alter table public.action_items enable row level security;
alter table public.problems enable row level security;
alter table public.reports enable row level security;

create policy clients_authenticated_all
  on public.clients
  for all
  to authenticated
  using (true)
  with check (true);

create policy meetings_authenticated_all
  on public.meetings
  for all
  to authenticated
  using (true)
  with check (true);

create policy action_items_authenticated_all
  on public.action_items
  for all
  to authenticated
  using (true)
  with check (true);

create policy problems_authenticated_all
  on public.problems
  for all
  to authenticated
  using (true)
  with check (true);

create policy reports_authenticated_all
  on public.reports
  for all
  to authenticated
  using (true)
  with check (true);
