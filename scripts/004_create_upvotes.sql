-- Create upvotes table for tracking user upvotes
create table if not exists public.upvotes (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.problems(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(problem_id, user_id)
);

-- Enable RLS
alter table public.upvotes enable row level security;

-- RLS Policies for upvotes
create policy "upvotes_select_all"
  on public.upvotes for select
  using (true);

create policy "upvotes_insert_authenticated"
  on public.upvotes for insert
  with check (auth.uid() = user_id);

create policy "upvotes_delete_own"
  on public.upvotes for delete
  using (auth.uid() = user_id);

-- Create indexes
create index if not exists upvotes_problem_id_idx on public.upvotes(problem_id);
create index if not exists upvotes_user_id_idx on public.upvotes(user_id);

-- Create function to update upvote count on problems
create or replace function public.update_problem_upvote_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.problems
    set upvotes = upvotes + 1
    where id = NEW.problem_id;
  elsif TG_OP = 'DELETE' then
    update public.problems
    set upvotes = upvotes - 1
    where id = OLD.problem_id;
  end if;
  return null;
end;
$$;

drop trigger if exists update_upvote_count on public.upvotes;

create trigger update_upvote_count
  after insert or delete on public.upvotes
  for each row
  execute function public.update_problem_upvote_count();
