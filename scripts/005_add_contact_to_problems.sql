-- Add contact field to problems table
alter table public.problems add column if not exists contact text;

-- Add comment to explain the field
comment on column public.problems.contact is 'Contact information (Telegram, WhatsApp, or Email)';
