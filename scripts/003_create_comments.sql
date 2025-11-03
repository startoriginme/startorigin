-- Create comments table
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references public.problems(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.comments enable row level security;

-- RLS Policies for comments
create policy "comments_select_all"
  on public.comments for select
  using (true);

create policy "comments_insert_authenticated"
  on public.comments for insert
  with check (auth.uid() = author_id);

create policy "comments_update_own"
  on public.comments for update
  using (auth.uid() = author_id);

create policy "comments_delete_own"
  on public.comments for delete
  using (auth.uid() = author_id);

-- Create indexes
create index if not exists comments_problem_id_idx on public.comments(problem_id);
create index if not exists comments_author_id_idx on public.comments(author_id);
create index if not exists comments_created_at_idx on public.comments(created_at desc);

-- Create function to update comment count on problems
create or replace function public.update_problem_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.problems
    set comment_count = comment_count + 1
    where id = NEW.problem_id;
  elsif TG_OP = 'DELETE' then
    update public.problems
    set comment_count = comment_count - 1
    where id = OLD.problem_id;
  end if;
  return null;
end;
$$;

drop trigger if exists update_comment_count on public.comments;

create trigger update_comment_count
  after insert or delete on public.comments
  for each row
  execute function public.update_problem_comment_count();
