-- Simple ordered checklist (separate from action_items / Tasks board)

create table public.simple_todos (
  id uuid primary key default gen_random_uuid(),
  text text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index simple_todos_sort_order_idx on public.simple_todos (sort_order asc, created_at asc);

alter table public.simple_todos enable row level security;

create policy simple_todos_authenticated_all
  on public.simple_todos
  for all
  to authenticated
  using (true)
  with check (true);
