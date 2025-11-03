-- Add unique constraint to username (allowing nulls)
create unique index if not exists profiles_username_unique 
  on public.profiles (username) 
  where username is not null;
