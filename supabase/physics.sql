-- 高中物理平台的帳戶。不會改動已有的 public.profiles。
-- 在 Supabase → SQL Editor 整份執行一次。
-- 總帳號 super@physicsdse.app 若已在 Authentication 裡，這裡會把它設成 super。

create table if not exists public.physics_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null,
  role text not null default 'student' check (role in ('student', 'admin', 'super')),
  class_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.physics_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.physics_users (id) on delete cascade,
  question_id text,
  title text,
  chapter_id text,
  kp_id text,
  earned integer not null,
  marks integer not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists physics_users_role_idx on public.physics_users (role);
create index if not exists physics_users_class_idx on public.physics_users (class_name);
create index if not exists physics_attempts_student_idx on public.physics_attempts (student_id, created_at);

alter table public.physics_users enable row level security;
alter table public.physics_attempts enable row level security;

revoke all on public.physics_users from anon;
revoke all on public.physics_attempts from anon;
grant select on public.physics_users to authenticated;
grant select on public.physics_attempts to authenticated;

create or replace function public.physics_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.physics_users
    where id = auth.uid()
      and role in ('admin', 'super')
  );
$$;

revoke all on function public.physics_is_staff() from public;
grant execute on function public.physics_is_staff() to authenticated;

drop policy if exists physics_users_select_own on public.physics_users;
create policy physics_users_select_own
  on public.physics_users
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists physics_users_select_staff on public.physics_users;
create policy physics_users_select_staff
  on public.physics_users
  for select
  to authenticated
  using (public.physics_is_staff());

drop policy if exists physics_attempts_select_own on public.physics_attempts;
create policy physics_attempts_select_own
  on public.physics_attempts
  for select
  to authenticated
  using (student_id = auth.uid());

drop policy if exists physics_attempts_select_staff on public.physics_attempts;
create policy physics_attempts_select_staff
  on public.physics_attempts
  for select
  to authenticated
  using (public.physics_is_staff());

create or replace function public.physics_on_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  account_name text;
  account_class text;
begin
  if coalesce(new.raw_user_meta_data->>'app', '') <> 'physics' then
    return new;
  end if;
  account_name := trim(coalesce(new.raw_user_meta_data->>'name', ''));
  account_class := nullif(trim(coalesce(new.raw_user_meta_data->>'class_name', '')), '');
  if account_name = '' then
    raise exception '要填姓名';
  end if;
  if account_class is null and current_setting('physics.creating', true) is distinct from '1' then
    raise exception '要填班別';
  end if;
  insert into public.physics_users (id, email, name, role, class_name)
  values (new.id, lower(coalesce(new.email, '')), account_name, 'student', account_class)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists physics_on_auth_user on auth.users;
create trigger physics_on_auth_user
  after insert on auth.users
  for each row
  execute function public.physics_on_auth_user();

create or replace function public.physics_create_account(
  p_email text,
  p_password text,
  p_name text,
  p_class_name text,
  p_role text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  caller_role text;
  new_id uuid := gen_random_uuid();
  clean_email text := lower(trim(coalesce(p_email, '')));
  clean_name text := trim(coalesce(p_name, ''));
  clean_class text := nullif(trim(coalesce(p_class_name, '')), '');
begin
  select role into caller_role from public.physics_users where id = auth.uid();
  if caller_role is distinct from 'super' then
    raise exception '只有總帳號可以添加帳戶';
  end if;
  if p_role not in ('student', 'admin') then
    raise exception '只能添加管理員或學生';
  end if;
  if clean_name = '' then
    raise exception '要填姓名';
  end if;
  if clean_email = '' or position('@' in clean_email) = 0 then
    raise exception '要填電郵';
  end if;
  if p_role = 'student' and clean_class is null then
    raise exception '學生要填班別';
  end if;
  if p_password is null or char_length(p_password) < 6 then
    raise exception '密碼至少 6 個字';
  end if;

  perform set_config('physics.creating', '1', true);

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    new_id,
    'authenticated',
    'authenticated',
    clean_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('app', 'physics', 'name', clean_name, 'class_name', coalesce(clean_class, '')),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    new_id,
    jsonb_build_object('sub', new_id::text, 'email', clean_email),
    'email',
    new_id::text,
    now(),
    now(),
    now()
  );

  update public.physics_users
  set role = p_role,
      name = clean_name,
      email = clean_email,
      class_name = case when p_role = 'student' then clean_class else null end
  where id = new_id;

  return new_id;
exception
  when unique_violation then
    raise exception '這個電郵已經註冊';
end;
$$;

revoke all on function public.physics_create_account(text, text, text, text, text) from public;
grant execute on function public.physics_create_account(text, text, text, text, text) to authenticated;

insert into public.physics_users (id, email, name, role, class_name)
select
  id,
  lower(email),
  coalesce(nullif(trim(raw_user_meta_data->>'name'), ''), '學生'),
  'student',
  nullif(trim(raw_user_meta_data->>'class_name'), '')
from auth.users
where coalesce(raw_user_meta_data->>'app', '') = 'physics'
  and lower(email) <> 'super@physicsdse.app'
  and nullif(trim(coalesce(raw_user_meta_data->>'class_name', '')), '') is not null
on conflict (id) do nothing;

insert into public.physics_users (id, email, name, role, class_name)
select id, lower(email), '總帳號', 'super', null
from auth.users
where lower(email) = 'super@physicsdse.app'
on conflict (id) do update
set role = 'super',
    name = '總帳號',
    email = excluded.email,
    class_name = null;
