-- StunxtV2 Database Reset Script
-- Professional database cleanup and reset for development

-- Terminate all active connections to the database (except current)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'postgres' AND pid != pg_backend_pid();

-- Drop all tables with CASCADE to handle foreign key dependencies
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Grant permissions
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Reset sequence counters
ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;

-- Vacuum and analyze for optimal performance
VACUUM FULL;
ANALYZE;

-- Database is now clean and ready for fresh schema creation
SELECT 'Database reset completed successfully!' as status;
