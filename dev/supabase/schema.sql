do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'shopping_items'
  ) and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'reminder_items'
  ) then
    execute 'alter table public.shopping_items rename to reminder_items';
  end if;
end
$$;

create table if not exists public.reminder_items (
  id bigint generated always as identity primary key,
  sync_code text not null,
  item_id text,
  text text not null,
  title text,
  note text,
  erledigt boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  entry_date timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reminder_items
  add column if not exists item_id text,
  add column if not exists title text,
  add column if not exists note text,
  add column if not exists entry_date timestamptz;

update public.reminder_items
set item_id = 'legacy-' || id::text
where item_id is null or length(trim(item_id)) = 0;

update public.reminder_items
set title = text
where title is null or length(trim(title)) = 0;

update public.reminder_items
set note = ''
where note is null;

update public.reminder_items
set entry_date = created_at
where entry_date is null;

alter table public.reminder_items
  alter column item_id set not null,
  alter column title set not null,
  alter column note set not null,
  alter column entry_date set not null;

create table if not exists public.sync_codes (
  sync_code text primary key,
  created_by uuid,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

alter table public.sync_codes
  add column if not exists created_by uuid;

insert into public.sync_codes (sync_code, created_at, last_used_at)
select sync_code, min(created_at), max(updated_at)
from public.reminder_items
where sync_code ~ '^[A-Z]{4}[0-9]{4}$'
  and sync_code <> 'HELP0000'
group by sync_code
on conflict (sync_code) do update
set last_used_at = greatest(public.sync_codes.last_used_at, excluded.last_used_at);

create table if not exists public.device_sync_memberships (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  sync_code text not null references public.sync_codes(sync_code) on delete cascade,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  unique (user_id, sync_code)
);

create table if not exists public.sync_code_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  sync_code text not null,
  success boolean not null,
  reason text not null default '',
  attempted_at timestamptz not null default now()
);

create index if not exists reminder_items_sync_code_idx
  on public.reminder_items (sync_code);

create index if not exists reminder_items_sync_code_position_idx
  on public.reminder_items (sync_code, position);

create unique index if not exists reminder_items_sync_code_item_id_uidx
  on public.reminder_items (sync_code, item_id);

create index if not exists sync_codes_last_used_at_idx
  on public.sync_codes (last_used_at desc);

create index if not exists device_sync_memberships_user_sync_idx
  on public.device_sync_memberships (user_id, sync_code);

create index if not exists device_sync_memberships_sync_idx
  on public.device_sync_memberships (sync_code);

create index if not exists sync_code_attempts_user_time_idx
  on public.sync_code_attempts (user_id, attempted_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_reminder_items_updated_at on public.reminder_items;
create trigger trg_reminder_items_updated_at
before update on public.reminder_items
for each row execute function public.set_updated_at();

alter table public.reminder_items enable row level security;
alter table public.sync_codes enable row level security;
alter table public.device_sync_memberships enable row level security;
alter table public.sync_code_attempts enable row level security;

revoke all on table public.sync_codes from anon, authenticated;
revoke all on table public.device_sync_memberships from anon, authenticated;
revoke all on table public.sync_code_attempts from anon, authenticated;
grant select, insert, update, delete on public.reminder_items to authenticated;

do $$
begin
  if exists (
    select 1 from pg_class where relkind = 'S' and relname = 'reminder_items_id_seq'
  ) then
    execute 'grant usage, select on sequence public.reminder_items_id_seq to authenticated';
  end if;
end
$$;

create or replace function public.has_sync_membership(
  p_sync_code text,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.device_sync_memberships m
    where m.sync_code = p_sync_code
      and m.user_id = p_user_id
  );
$$;

revoke all on function public.has_sync_membership(text, uuid) from public;
grant execute on function public.has_sync_membership(text, uuid) to authenticated;

drop policy if exists "reminder_items_select_by_membership" on public.reminder_items;
create policy "reminder_items_select_by_membership"
on public.reminder_items
for select
to authenticated
using (
  auth.uid() is not null
  and public.has_sync_membership(reminder_items.sync_code, auth.uid())
);

drop policy if exists "reminder_items_insert_by_membership" on public.reminder_items;
create policy "reminder_items_insert_by_membership"
on public.reminder_items
for insert
to authenticated
with check (
  auth.uid() is not null
  and sync_code ~ '^[A-Z]{4}[0-9]{4}$'
  and sync_code <> 'HELP0000'
  and item_id is not null and length(trim(item_id)) between 10 and 120
  and text is not null and length(trim(text)) between 1 and 1000
  and title is not null and length(trim(title)) between 1 and 300
  and note is not null and length(note) <= 2000
  and position >= 0
  and public.has_sync_membership(reminder_items.sync_code, auth.uid())
);

drop policy if exists "reminder_items_update_by_membership" on public.reminder_items;
create policy "reminder_items_update_by_membership"
on public.reminder_items
for update
to authenticated
using (
  auth.uid() is not null
  and public.has_sync_membership(reminder_items.sync_code, auth.uid())
)
with check (
  auth.uid() is not null
  and sync_code ~ '^[A-Z]{4}[0-9]{4}$'
  and sync_code <> 'HELP0000'
  and item_id is not null and length(trim(item_id)) between 10 and 120
  and text is not null and length(trim(text)) between 1 and 1000
  and title is not null and length(trim(title)) between 1 and 300
  and note is not null and length(note) <= 2000
  and position >= 0
  and public.has_sync_membership(reminder_items.sync_code, auth.uid())
);

drop policy if exists "reminder_items_delete_by_membership" on public.reminder_items;
create policy "reminder_items_delete_by_membership"
on public.reminder_items
for delete
to authenticated
using (
  auth.uid() is not null
  and public.has_sync_membership(reminder_items.sync_code, auth.uid())
);

create or replace function public.use_sync_code(
  p_code text,
  p_allow_create boolean default true,
  p_require_new boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code, '')));
  v_now timestamptz := now();
  v_exists boolean;
  v_failures integer;
  v_created boolean := false;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if v_code !~ '^[A-Z]{4}[0-9]{4}$' then
    raise exception 'SYNC_CODE_FORMAT_INVALID';
  end if;

  if v_code = 'HELP0000' then
    raise exception 'SYNC_CODE_RESERVED';
  end if;

  delete from public.sync_code_attempts
  where attempted_at < (v_now - interval '1 day');

  select count(*)
  into v_failures
  from public.sync_code_attempts
  where user_id = v_uid
    and success = false
    and attempted_at > (v_now - interval '10 minutes');

  if v_failures >= 20 then
    raise exception 'SYNC_CODE_RATE_LIMIT';
  end if;

  select exists(
    select 1
    from public.sync_codes
    where sync_code = v_code
  )
  into v_exists;

  if p_require_new and v_exists then
    insert into public.sync_code_attempts (user_id, sync_code, success, reason)
    values (v_uid, v_code, false, 'already_exists');
    raise exception 'SYNC_CODE_ALREADY_EXISTS';
  end if;

  if not v_exists then
    if not p_allow_create then
      insert into public.sync_code_attempts (user_id, sync_code, success, reason)
      values (v_uid, v_code, false, 'not_found');
      raise exception 'SYNC_CODE_NOT_FOUND';
    end if;

    insert into public.sync_codes (sync_code, created_by, created_at, last_used_at)
    values (v_code, v_uid, v_now, v_now)
    on conflict (sync_code) do update
    set last_used_at = excluded.last_used_at;

    v_created := true;
  else
    update public.sync_codes
    set last_used_at = v_now
    where sync_code = v_code;
  end if;

  insert into public.device_sync_memberships (user_id, sync_code, created_at, last_used_at)
  values (v_uid, v_code, v_now, v_now)
  on conflict (user_id, sync_code) do update
  set last_used_at = excluded.last_used_at;

  insert into public.sync_code_attempts (user_id, sync_code, success, reason)
  values (v_uid, v_code, true, case when v_created then 'created' else 'joined' end);

  return jsonb_build_object(
    'sync_code', v_code,
    'created', v_created,
    'joined', true
  );
end;
$$;

revoke all on function public.use_sync_code(text, boolean, boolean) from public;
grant execute on function public.use_sync_code(text, boolean, boolean) to authenticated;

-- device_roles Tabelle
create table if not exists public.device_roles (
    id bigint generated always as identity primary key,
    device_id text not null unique,
    rolle text not null check (rolle in ('hauptgeraet', 'gast')),
    sync_code text not null,
    updated_at timestamptz default now()
);

alter table public.device_roles enable row level security;

drop policy if exists "device_roles select" on public.device_roles;
create policy "device_roles select" on public.device_roles
    for select using (auth.role() = 'authenticated');

drop policy if exists "device_roles insert" on public.device_roles;
create policy "device_roles insert" on public.device_roles
    for insert with check (auth.role() = 'authenticated');

drop policy if exists "device_roles update" on public.device_roles;
create policy "device_roles update" on public.device_roles
    for update using (auth.role() = 'authenticated');

-- device_join_tokens Tabelle
create table if not exists public.device_join_tokens (
    id bigint generated always as identity primary key,
    join_token text not null unique,
    rolle text not null,
    sync_code text not null,
    created_by_device_id text,
    expires_at timestamptz,
    updated_at timestamptz default now()
);

alter table public.device_join_tokens enable row level security;

drop policy if exists "device_join_tokens select" on public.device_join_tokens;
create policy "device_join_tokens select" on public.device_join_tokens
    for select using (auth.role() = 'authenticated');

drop policy if exists "device_join_tokens insert" on public.device_join_tokens;
create policy "device_join_tokens insert" on public.device_join_tokens
    for insert with check (auth.role() = 'authenticated');

drop policy if exists "device_join_tokens upsert" on public.device_join_tokens;
create policy "device_join_tokens upsert" on public.device_join_tokens
    for update using (auth.role() = 'authenticated');

-- sync_invites Tabelle (für Legacy-Einladungs-Links)
create table if not exists public.sync_invites (
    id bigint generated always as identity primary key,
    device_id text not null unique,
    sync_code text not null,
    updated_at timestamptz default now()
);

alter table public.sync_invites enable row level security;

drop policy if exists "sync_invites select" on public.sync_invites;
create policy "sync_invites select" on public.sync_invites
    for select using (auth.role() = 'authenticated');

drop policy if exists "sync_invites insert" on public.sync_invites;
create policy "sync_invites insert" on public.sync_invites
    for insert with check (auth.role() = 'authenticated');

drop policy if exists "sync_invites upsert" on public.sync_invites;
create policy "sync_invites upsert" on public.sync_invites
    for update using (auth.role() = 'authenticated');

grant select, insert, update on public.device_roles to authenticated;
grant select, insert, update on public.device_join_tokens to authenticated;
grant select, insert, update on public.sync_invites to authenticated;

-- Fälligkeitsdatum
alter table public.reminder_items
  add column if not exists due_date date;
