-- Create database for main backend
CREATE DATABASE stunxtv2;

-- Grant privileges to postgres user
GRANT ALL PRIVILEGES ON DATABASE stunxtv2 TO postgres;

-- Connect to the new database and create schema if needed
\c stunxtv2;

-- Create public schema (usually exists by default, but just in case)
CREATE SCHEMA IF NOT EXISTS public;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO postgres;
GRANT CREATE ON SCHEMA public TO postgres;
