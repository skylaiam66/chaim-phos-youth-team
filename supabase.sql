-- CHAIM PHOS Youth Team: production-oriented Supabase schema.
-- Run in Supabase SQL Editor. Uses Supabase Auth; never stores passwords in *_text tables.
create extension if not exists pgcrypto;
create table if not exists public.profiles_text(id text primary key,payload jsonb not null,updated_at timestamptz not null default now());
create table if not exists public.posts_text(id text primary key,payload jsonb not null,updated_at timestamptz not null default now());
create table if not exists public.comments_text(id text primary key,payload jsonb not null,updated_at timestamptz not null default now());
create table if not exists public.likes_text(id text primary key,payload jsonb not null,updated_at timestamptz not null default now());
create table if not exists public.events_text(id text primary key,payload jsonb not null,updated_at timestamptz not null default now());
create table if not exists public.projects_text(id text primary key,payload jsonb not null,updated_at timestamptz not null default now());
create table if not exists public.shop_text(id text primary key,payload jsonb not null,updated_at timestamptz not null default now());
create table if not exists public.library_text(id text primary key,payload jsonb not null,updated_at timestamptz not null default now());
create table if not exists public.contributions_text(id text primary key,payload jsonb not null,updated_at timestamptz not null default now());
create table if not exists public.bookings_text(id text primary key,payload jsonb not null,updated_at timestamptz not null default now());
create table if not exists public.announcements_text(id text primary key,payload jsonb not null,updated_at timestamptz not null default now());
create table if not exists public.slider_text(id text primary key,payload jsonb not null,updated_at timestamptz not null default now());
create table if not exists public.stories_text(id text primary key,payload jsonb not null,updated_at timestamptz not null default now());
create table if not exists public.officials_text(id text primary key,payload jsonb not null,updated_at timestamptz not null default now());
create table if not exists public.settings_text(id text primary key,payload jsonb not null,updated_at timestamptz not null default now());
create table if not exists public.tombstones_text(id text primary key,payload jsonb not null,updated_at timestamptz not null default now());

create or replace function public.cp_is_director() returns boolean language sql stable security definer set search_path=public as $$
 select coalesce(auth.jwt()->'app_metadata'->>'role'='Director',false);
$$;
revoke all on function public.cp_is_director() from public;
grant execute on function public.cp_is_director() to authenticated;
create or replace function public.cp_can_tombstone(target_store text,target_record_id text) returns boolean language plpgsql stable security definer set search_path=public as $$
declare owns_record boolean; missing_record boolean; target_table text;
begin
 if public.cp_is_director() then return true; end if;
 if target_store not in ('posts','comments','stories') then return false; end if;
 target_table:=target_store||'_text';
 execute format('select exists(select 1 from public.%I where id=$1 and payload->>''authorId''=$2)',target_table) into owns_record using target_record_id,auth.uid()::text;
 if owns_record then return true; end if;
 execute format('select not exists(select 1 from public.%I where id=$1)',target_table) into missing_record using target_record_id;
 return missing_record;
end; $$;
revoke all on function public.cp_can_tombstone(text,text) from public;
grant execute on function public.cp_can_tombstone(text,text) to authenticated;


-- Enable RLS and reset the app's own policies, so rerunning this script is safe.
do $$ declare t text; begin
 foreach t in array array['profiles_text','posts_text','comments_text','likes_text','events_text','projects_text','shop_text','library_text','contributions_text','bookings_text','announcements_text','slider_text','stories_text','officials_text','settings_text','tombstones_text'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('drop policy if exists cp_read on public.%I',t);
  execute format('drop policy if exists cp_director_all on public.%I',t);
  execute format('drop policy if exists cp_owner_insert on public.%I',t);
  execute format('drop policy if exists cp_owner_update on public.%I',t);
  execute format('drop policy if exists cp_owner_delete on public.%I',t);
 end loop;
end $$;

grant select on public.posts_text,public.comments_text,public.likes_text,public.tombstones_text,public.events_text,public.projects_text,public.shop_text,public.library_text,public.announcements_text,public.slider_text,public.stories_text,public.officials_text to anon,authenticated;
grant select on public.profiles_text,public.contributions_text,public.bookings_text to authenticated;

-- Authenticated members can read shared app data. Profile records are not exposed to anonymous visitors.
create policy cp_read on public.profiles_text for select to authenticated using (id=auth.uid()::text or public.cp_is_director());
create policy cp_read on public.posts_text for select to anon,authenticated using (true);
create policy cp_read on public.comments_text for select to anon,authenticated using (true);
create policy cp_read on public.likes_text for select to anon,authenticated using (true);
create policy cp_read on public.events_text for select to anon,authenticated using (true);
create policy cp_read on public.projects_text for select to anon,authenticated using (true);
create policy cp_read on public.shop_text for select to anon,authenticated using (true);
create policy cp_read on public.library_text for select to anon,authenticated using (true);
create policy cp_read on public.announcements_text for select to anon,authenticated using (true);
create policy cp_read on public.slider_text for select to anon,authenticated using (true);
create policy cp_read on public.stories_text for select to anon,authenticated using (true);
create policy cp_read on public.officials_text for select to anon,authenticated using (true);
create policy cp_read on public.settings_text for select to authenticated using (true);
create policy cp_read on public.tombstones_text for select to anon,authenticated using (true);
create policy cp_read on public.contributions_text for select to authenticated using (true);
create policy cp_read on public.bookings_text for select to authenticated using (true);

-- Members may create/update their own basic profile, but cannot grant themselves paid/official/Director status.
create policy cp_owner_insert on public.profiles_text for insert to authenticated with check (id=auth.uid()::text and coalesce(payload->>'role','Member')='Member' and coalesce(payload->>'membershipType','Member')='Member' and coalesce((payload->>'paid')::boolean,false)=false);
create policy cp_owner_update on public.profiles_text for update to authenticated using (id=auth.uid()::text and not public.cp_is_director()) with check (id=auth.uid()::text and coalesce(payload->>'role','Member')='Member' and coalesce(payload->>'membershipType','Member')='Member' and coalesce((payload->>'paid')::boolean,false)=false);

-- Member-owned records. Posts/comments/stories are public-read but owner-created/updated; only Director may moderate/delete.
create policy cp_owner_insert on public.posts_text for insert to authenticated with check (payload->>'authorId'=auth.uid()::text);
create policy cp_owner_update on public.posts_text for update to authenticated using (payload->>'authorId'=auth.uid()::text) with check (payload->>'authorId'=auth.uid()::text);
create policy cp_owner_insert on public.comments_text for insert to authenticated with check (payload->>'authorId'=auth.uid()::text);
create policy cp_owner_insert on public.likes_text for insert to authenticated with check (payload->>'userId'=auth.uid()::text);
create policy cp_owner_update on public.likes_text for update to authenticated using (payload->>'userId'=auth.uid()::text) with check (payload->>'userId'=auth.uid()::text);
create policy cp_owner_update on public.comments_text for update to authenticated using (payload->>'authorId'=auth.uid()::text) with check (payload->>'authorId'=auth.uid()::text);
create policy cp_owner_insert on public.stories_text for insert to authenticated with check (payload->>'authorId'=auth.uid()::text);
create policy cp_owner_update on public.stories_text for update to authenticated using (payload->>'authorId'=auth.uid()::text) with check (payload->>'authorId'=auth.uid()::text);
create policy cp_owner_delete on public.posts_text for delete to authenticated using (payload->>'authorId'=auth.uid()::text);
create policy cp_owner_delete on public.comments_text for delete to authenticated using (payload->>'authorId'=auth.uid()::text);
create policy cp_owner_delete on public.stories_text for delete to authenticated using (payload->>'authorId'=auth.uid()::text);
create policy cp_owner_insert on public.contributions_text for insert to authenticated with check (payload->>'memberId'=auth.uid()::text);
create policy cp_owner_insert on public.bookings_text for insert to authenticated with check (payload->>'memberId'=auth.uid()::text);
create policy cp_owner_insert on public.tombstones_text for insert to authenticated with check (payload->>'actorId'=auth.uid()::text and public.cp_can_tombstone(payload->>'store',payload->>'recordId'));
create policy cp_owner_update on public.tombstones_text for update to authenticated using (payload->>'actorId'=auth.uid()::text) with check (payload->>'actorId'=auth.uid()::text and public.cp_can_tombstone(payload->>'store',payload->>'recordId'));

-- Director-only content writes and moderation.
do $$ declare t text; begin
 foreach t in array array['profiles_text','posts_text','comments_text','likes_text','events_text','projects_text','shop_text','library_text','contributions_text','bookings_text','announcements_text','slider_text','stories_text','officials_text','settings_text','tombstones_text'] loop
  execute format('create policy cp_director_all on public.%I for all to authenticated using (public.cp_is_director()) with check (public.cp_is_director())',t);
 end loop;
end $$;

-- Storage: public read for the five approved buckets; only a Director may upload, replace or delete.
insert into storage.buckets(id,name,public,file_size_limit) values
 ('homepage','homepage',true,10485760),('events','events',true,10485760),('projects','projects',true,10485760),('shop','shop',true,10485760),('library','library',true,52428800),('officials','officials',true,10485760)
on conflict(id) do update set public=true;
drop policy if exists cp_public_media_read on storage.objects;
drop policy if exists cp_director_media_insert on storage.objects;
drop policy if exists cp_director_media_update on storage.objects;
drop policy if exists cp_director_media_delete on storage.objects;
create policy cp_public_media_read on storage.objects for select to anon,authenticated using(bucket_id in ('homepage','events','projects','shop','library','officials'));
create policy cp_director_media_insert on storage.objects for insert to authenticated with check(bucket_id in ('homepage','events','projects','shop','library','officials') and public.cp_is_director());
create policy cp_director_media_update on storage.objects for update to authenticated using(bucket_id in ('homepage','events','projects','shop','library','officials') and public.cp_is_director()) with check(bucket_id in ('homepage','events','projects','shop','library','officials') and public.cp_is_director());
create policy cp_director_media_delete on storage.objects for delete to authenticated using(bucket_id in ('homepage','events','projects','shop','library','officials') and public.cp_is_director());

-- Director-only account deletion; explicitly remove the profile row and Auth user.
create or replace function public.cp_delete_member(target_user_id uuid) returns void language plpgsql security definer set search_path=public,auth as $$
begin
 if not public.cp_is_director() then raise exception 'Director access required'; end if;
 if target_user_id=auth.uid() then raise exception 'A Director cannot delete their own signed-in account'; end if;
 delete from public.profiles_text where id=target_user_id::text;
 delete from auth.users where id=target_user_id;
end; $$;
revoke all on function public.cp_delete_member(uuid) from public;
grant execute on function public.cp_delete_member(uuid) to authenticated;

-- IMPORTANT: after registering your own account, run this once in SQL Editor,
-- replacing the email with the exact email used for your Director account:
-- update auth.users set raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)||'{"role":"Director"}'::jsonb where email='YOUR_DIRECTOR_EMAIL';
