-- Prisma uses a server-side database role. Public Supabase Data API roles
-- must not access patient data or password hashes without an explicit policy.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE closed_days ENABLE ROW LEVEL SECURITY;