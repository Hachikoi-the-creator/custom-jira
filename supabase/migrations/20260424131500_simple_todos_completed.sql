-- Add completed flag for installs created before `completed` existed on simple_todos

alter table public.simple_todos
  add column if not exists completed boolean not null default false;
