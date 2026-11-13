-- The Prisma ledger must never be exposed through the Supabase Data API.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE users, appointments, closed_days, "_prisma_migrations" FROM PUBLIC;

DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format(
        'REVOKE ALL ON TABLE users, appointments, closed_days, "_prisma_migrations" FROM %I',
        api_role
      );
    END IF;
  END LOOP;

  -- Provisioned separately, with credentials kept outside migrations and Git.
  -- This role is private to Express, never granted to anon/authenticated.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'naturo_app') THEN
    GRANT USAGE ON SCHEMA public TO naturo_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON users, appointments, closed_days TO naturo_app;
    CREATE POLICY users_server_access ON users
      FOR ALL TO naturo_app USING (true) WITH CHECK (true);
    CREATE POLICY appointments_server_access ON appointments
      FOR ALL TO naturo_app USING (true) WITH CHECK (true);
    CREATE POLICY closed_days_server_access ON closed_days
      FOR ALL TO naturo_app USING (true) WITH CHECK (true);
  END IF;
END $$;