-- Add looking_for_cofounder column to problems table
alter table public.problems add column if not exists looking_for_cofounder boolean default false;
