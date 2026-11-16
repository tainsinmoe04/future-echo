-- Read-only metadata checks. Safe to rerun; never replaces the migration.
with app_tables as (
 select c.oid,c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in ('fe_profiles','fe_directions','fe_moments','fe_messages','fe_playlists','fe_ai_requests','fe_journal') and c.relkind='r'
), app_functions as (
 select p.oid,p.prosecdef,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('fe_attest_adult','fe_sync_context','fe_archive_direction','fe_reserve_reply','fe_finish_reply','fe_delete_expired_messages')
)
select 'Application tables' as check_name,count(*)::text as actual,'7' as expected from app_tables
union all select 'RLS enabled on every table',bool_and(relrowsecurity)::text,'true' from app_tables
union all select 'Anonymous table access',count(*)::text,'0' from app_tables where has_table_privilege('anon',oid,'SELECT,INSERT,UPDATE,DELETE')
union all select 'Authenticated table writes',count(*)::text,'0' from app_tables where has_table_privilege('authenticated',oid,'INSERT,UPDATE,DELETE')
union all select 'Authenticated readable tables',count(*)::text,'6' from app_tables where has_table_privilege('authenticated',oid,'SELECT')
union all select 'Server functions',count(*)::text,'6' from app_functions
union all select 'Anonymous function access',count(*)::text,'0' from app_functions where has_function_privilege('anon',oid,'EXECUTE')
union all select 'Authenticated function access',count(*)::text,'0' from app_functions where has_function_privilege('authenticated',oid,'EXECUTE')
union all select 'Service function access',count(*)::text,'6' from app_functions where has_function_privilege('service_role',oid,'EXECUTE')
union all select 'Owner read policies',count(*)::text,'6' from pg_policies where schemaname='public' and tablename in ('fe_profiles','fe_directions','fe_moments','fe_messages','fe_playlists','fe_ai_requests','fe_journal') and cmd='SELECT';
