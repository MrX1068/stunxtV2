-- Remove unused firstName and lastName columns from user_profiles table
-- These fields were never used in the application flow

BEGIN;

-- Remove firstName column
ALTER TABLE user_profiles DROP COLUMN IF EXISTS first_name;

-- Remove lastName column  
ALTER TABLE user_profiles DROP COLUMN IF EXISTS last_name;

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

COMMIT;
