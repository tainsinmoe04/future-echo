-- Prepared locally. Apply to a reviewed Supabase project, never automatically.
begin;
create table public.fe_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  adult_attested_at timestamptz,
  plan text not null default 'free' check (plan in ('free','plus')),
  created_at timestamptz not null default now()
);
create table public.fe_directions (
  user_id uuid not null references public.fe_profiles(user_id) on delete cascade,
  id text not null check (length(id) between 1 and 160),
  definition jsonb not null check (jsonb_typeof(definition) = 'object'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id,id)
);
create unique index fe_one_active_direction on public.fe_directions(user_id) where active;
create table public.fe_moments (
  user_id uuid not null,
  id text not null,
  identity_id text not null,
  record jsonb not null check (jsonb_typeof(record) = 'object'),
  primary key (user_id,id),
  foreign key (user_id,identity_id) references public.fe_directions(user_id,id) on delete cascade
);
create index fe_moments_identity on public.fe_moments(user_id,identity_id);
create table public.fe_messages (
  user_id uuid not null,
  id uuid not null default gen_random_uuid(),
  identity_id text not null,
  role text not null check (role in ('user','assistant')),
  content text not null check (length(content) between 1 and 4000),
  playlist jsonb,
  safety text not null default 'normal' check (safety in ('normal','support')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (user_id,id),
  foreign key (user_id,identity_id) references public.fe_directions(user_id,id) on delete cascade
);
create index fe_messages_recent on public.fe_messages(user_id,identity_id,created_at desc);
create index fe_messages_expiry on public.fe_messages(expires_at);
create table public.fe_playlists (
  user_id uuid not null references public.fe_profiles(user_id) on delete cascade,
  id text not null,
  identity_id text not null,
  source_message_id uuid not null,
  record jsonb not null check (jsonb_typeof(record) = 'object'),
  saved_at timestamptz not null default now(),
  primary key (user_id,id),
  unique (user_id,source_message_id),
  foreign key (user_id,identity_id) references public.fe_directions(user_id,id) on delete cascade
  -- No message FK: a deliberately saved playlist survives conversation expiry.
);
create index fe_playlists_identity on public.fe_playlists(user_id,identity_id);
create table public.fe_ai_requests (
  user_id uuid not null references public.fe_profiles(user_id) on delete cascade,
  request_id uuid not null,
  identity_id text not null,
  prompt_hash text not null,
  status text not null default 'pending' check (status in ('pending','completed','failed')),
  response jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id,request_id)
);
create index fe_requests_month on public.fe_ai_requests(user_id,created_at);

-- Authenticated clients may read only their own rows. Mutations go through the
-- Next server, which verifies the Auth user and uses service-only functions.
alter table public.fe_profiles enable row level security;
alter table public.fe_directions enable row level security;
alter table public.fe_moments enable row level security;
alter table public.fe_messages enable row level security;
alter table public.fe_playlists enable row level security;
alter table public.fe_ai_requests enable row level security;
create policy fe_profile_read on public.fe_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy fe_direction_read on public.fe_directions for select to authenticated using ((select auth.uid()) = user_id);
create policy fe_moment_read on public.fe_moments for select to authenticated using ((select auth.uid()) = user_id);
create policy fe_message_read on public.fe_messages for select to authenticated using ((select auth.uid()) = user_id and expires_at > now());
create policy fe_playlist_read on public.fe_playlists for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.fe_profiles,public.fe_directions,public.fe_moments,public.fe_messages,public.fe_playlists,public.fe_ai_requests from anon,authenticated;
grant select on public.fe_profiles,public.fe_directions,public.fe_moments,public.fe_messages,public.fe_playlists to authenticated;
grant all on public.fe_profiles,public.fe_directions,public.fe_moments,public.fe_messages,public.fe_playlists,public.fe_ai_requests to service_role;

create function public.fe_attest_adult(p_user uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.fe_profiles(user_id,adult_attested_at) values(p_user,now())
  on conflict(user_id) do update set adult_attested_at = coalesce(public.fe_profiles.adult_attested_at,now());
$$;

-- Explicit context upload contains only the active definition and consented text,
-- never photos, journal drafts, interpretations, covers or playlists.
create function public.fe_sync_context(p_user uuid,p_identity jsonb,p_moments jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare existing public.fe_directions; item jsonb; previous jsonb; identity_key text := p_identity->>'id';
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  if not exists(select 1 from public.fe_profiles where user_id=p_user and adult_attested_at is not null) then raise exception 'adult_required'; end if;
  if jsonb_typeof(p_moments) <> 'array' or jsonb_array_length(p_moments)>1000 or p_identity->>'status'<>'active' then raise exception 'invalid_context'; end if;
  select * into existing from public.fe_directions where user_id=p_user and id=identity_key;
  if found then
    if not existing.active or existing.definition <> p_identity then raise exception 'direction_changed'; end if;
  else
    update public.fe_directions set active=false where user_id=p_user and active;
    insert into public.fe_directions(user_id,id,definition) values(p_user,identity_key,p_identity);
  end if;
  -- Missing records have had consent revoked or were deleted locally.
  delete from public.fe_moments m where m.user_id=p_user and m.identity_id=identity_key and not exists(select 1 from jsonb_array_elements(p_moments) v where v->>'id'=m.id);
  for item in select * from jsonb_array_elements(p_moments) loop
    if item->>'identityVersionId'<>identity_key or item#>>'{consent,useInAiContext}' <> 'true' then raise exception 'invalid_consent'; end if;
    select record into previous from public.fe_moments where user_id=p_user and id=item->>'id';
    if found and (previous->>'identityVersionId'<>identity_key or previous->>'occurredAt'<>item->>'occurredAt' or previous->>'kind' is distinct from item->>'kind' or (previous->>'kind' is distinct from 'personal' and previous->>'originalExcerpt'<>item->>'originalExcerpt')) then raise exception 'immutable_evidence'; end if;
    insert into public.fe_moments(user_id,id,identity_id,record) values(p_user,item->>'id',identity_key,item)
      on conflict(user_id,id) do update set record=excluded.record;
  end loop;
end;
$$;

-- Row lock serializes monthly usage, rate limits and duplicate request IDs.
create function public.fe_archive_direction(p_user uuid,p_identity text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  update public.fe_directions set active=false where user_id=p_user and id=p_identity;
  delete from public.fe_moments where user_id=p_user and identity_id=p_identity;
  update public.fe_ai_requests set status='failed' where user_id=p_user and identity_id=p_identity and status='pending';
end;
$$;
revoke all on function public.fe_archive_direction(uuid,text) from public,anon,authenticated;
grant execute on function public.fe_archive_direction(uuid,text) to service_role;

create function public.fe_reserve_reply(p_user uuid,p_request uuid,p_identity text,p_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare profile public.fe_profiles; existing public.fe_ai_requests; used integer; allowed integer;
begin
  select * into profile from public.fe_profiles where user_id=p_user for update;
  if not found or profile.adult_attested_at is null then raise exception 'adult_required'; end if;
  update public.fe_ai_requests set status='failed' where user_id=p_user and status='pending' and created_at<now()-interval '5 minutes';
  if not exists(select 1 from public.fe_directions where user_id=p_user and id=p_identity and active) then raise exception 'not_active'; end if;
  select * into existing from public.fe_ai_requests where user_id=p_user and request_id=p_request;
  if found then
    if existing.prompt_hash<>p_hash or existing.identity_id<>p_identity then raise exception 'request_mismatch'; end if;
    return jsonb_build_object('status',existing.status,'response',existing.response);
  end if;
  if (select count(*) from public.fe_ai_requests where user_id=p_user and created_at>now()-interval '1 minute')>=8 then raise exception 'rate_limit'; end if;
  select count(*) into used from public.fe_ai_requests where user_id=p_user and status in ('pending','completed') and created_at >= date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
  allowed := case when profile.plan='plus' then 200 else 50 end;
  if used>=allowed then raise exception 'quota'; end if;
  insert into public.fe_ai_requests(user_id,request_id,identity_id,prompt_hash) values(p_user,p_request,p_identity,p_hash);
  return jsonb_build_object('status','reserved');
end;
$$;

create function public.fe_finish_reply(p_user uuid,p_request uuid,p_message text,p_reply jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare request public.fe_ai_requests; expires timestamptz; result jsonb; stamp timestamptz := clock_timestamp();
begin
  select * into request from public.fe_ai_requests where user_id=p_user and request_id=p_request for update;
  if not found then raise exception 'request_missing'; end if;
  if request.status='completed' then raise exception 'request_completed'; end if;
  if request.status<>'pending' then raise exception 'request_failed'; end if;
  if not exists(select 1 from public.fe_directions where user_id=p_user and id=request.identity_id and active) then raise exception 'direction_changed'; end if;
  select stamp + case when plan='plus' then interval '90 days' else interval '30 days' end into expires from public.fe_profiles where user_id=p_user;
  insert into public.fe_messages(user_id,identity_id,role,content,created_at,expires_at) values(p_user,request.identity_id,'user',p_message,stamp,expires);
  insert into public.fe_messages(user_id,id,identity_id,role,content,playlist,safety,created_at,expires_at) values(p_user,p_request,request.identity_id,'assistant',p_reply->>'text',nullif(p_reply->'playlist','null'::jsonb),p_reply->>'safety',stamp+interval '1 microsecond',expires);
  result := jsonb_build_object('id',p_request,'role','assistant','content',p_reply->>'text','playlist',nullif(p_reply->'playlist','null'::jsonb),'safety',p_reply->>'safety','createdAt',to_char(stamp at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
  -- Do not retain a duplicate reply after message expiry. Idempotency stores only
  -- its message ID; the Next server reloads the owned, unexpired message.
  update public.fe_ai_requests set status='completed',response=jsonb_build_object('messageId',p_request) where user_id=p_user and request_id=p_request;
  return result;
end;
$$;

create function public.fe_delete_expired_messages() returns integer
language plpgsql security definer set search_path = '' as $$
declare removed integer;
begin delete from public.fe_messages where expires_at<=now(); get diagnostics removed = row_count; return removed; end;
$$;
-- Account deletion cascades active-store data; provider/backups have separate retention.
revoke all on function public.fe_attest_adult(uuid),public.fe_sync_context(uuid,jsonb,jsonb),public.fe_reserve_reply(uuid,uuid,text,text),public.fe_finish_reply(uuid,uuid,text,jsonb),public.fe_delete_expired_messages() from public,anon,authenticated;
grant execute on function public.fe_attest_adult(uuid),public.fe_sync_context(uuid,jsonb,jsonb),public.fe_reserve_reply(uuid,uuid,text,text),public.fe_finish_reply(uuid,uuid,text,jsonb),public.fe_delete_expired_messages() to service_role;
commit;
