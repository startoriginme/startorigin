-- Create problems table
create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  category text,
  tags text[],
  upvotes integer default 0,
  comment_count integer default 0,
  status text default 'open' check (status in ('open', 'in_progress', 'solved', 'closed')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.problems enable row level security;

-- RLS Policies for problems
create policy "problems_select_all"
  on public.problems for select
  using (true);

create policy "problems_insert_authenticated"
  on public.problems for insert
  with check (auth.uid() = author_id);

create policy "problems_update_own"
  on public.problems for update
  using (auth.uid() = author_id);

create policy "problems_delete_own"
  on public.problems for delete
  using (auth.uid() = author_id);

-- Create index for better query performance
create index if not exists problems_author_id_idx on public.problems(author_id);
create index if not exists problems_created_at_idx on public.problems(created_at desc);
create index if not exists problems_category_idx on public.problems(category);
