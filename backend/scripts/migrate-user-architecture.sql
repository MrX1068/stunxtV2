-- Migration: Domain-Driven User Architecture
-- This migration implements the professional domain-driven architecture

-- 1. Remove duplicate columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS bio;
ALTER TABLE users DROP COLUMN IF EXISTS location;
ALTER TABLE users DROP COLUMN IF EXISTS website_url;
ALTER TABLE users DROP COLUMN IF EXISTS preferences;
ALTER TABLE users DROP COLUMN IF EXISTS metadata;

-- 2. Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- 3. Create user_stats table for computed metrics
CREATE TABLE IF NOT EXISTS user_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_count INTEGER DEFAULT 0,
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    community_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    likes_received_count INTEGER DEFAULT 0,
    likes_given_count INTEGER DEFAULT 0,
    reputation_score INTEGER DEFAULT 0,
    last_active_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create unique index on user_stats.user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);

-- 5. Update existing user_profiles table constraints
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS fk_user_profiles_user_id;
ALTER TABLE user_profiles ADD CONSTRAINT fk_user_profiles_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 6. Update existing user_preferences table constraints
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS fk_user_preferences_user_id;
ALTER TABLE user_preferences ADD CONSTRAINT fk_user_preferences_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);
CREATE INDEX IF NOT EXISTS idx_user_stats_follower_count ON user_stats(follower_count);
CREATE INDEX IF NOT EXISTS idx_user_stats_post_count ON user_stats(post_count);
CREATE INDEX IF NOT EXISTS idx_user_stats_last_active_at ON user_stats(last_active_at);

-- 8. Initialize user_stats for existing users
INSERT INTO user_stats (user_id, post_count, follower_count, following_count, community_count)
SELECT 
    u.id,
    0 as post_count,
    0 as follower_count,
    0 as following_count,
    0 as community_count
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM user_stats s WHERE s.user_id = u.id);

-- 9. Create trigger to update user_stats.updated_at automatically
CREATE OR REPLACE FUNCTION update_user_stats_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_stats_updated_at ON user_stats;
CREATE TRIGGER trigger_user_stats_updated_at
    BEFORE UPDATE ON user_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats_timestamp();

-- 10. Update existing data consistency
UPDATE users SET 
    is_verified = FALSE
WHERE is_verified IS NULL;

-- 11. Set default values for existing user_preferences
UPDATE user_preferences 
SET 
    theme = COALESCE(theme, 'auto'),
    language = COALESCE(language, 'en'),
    timezone = COALESCE(timezone, 'UTC'),
    email_notifications = COALESCE(email_notifications, true),
    push_notifications = COALESCE(push_notifications, true),
    sms_notifications = COALESCE(sms_notifications, false),
    notification_types = COALESCE(notification_types, '{}'),
    privacy_settings = COALESCE(privacy_settings, '{}'),
    content_preferences = COALESCE(content_preferences, '{}'),
    metadata = COALESCE(metadata, '{}')
WHERE theme IS NULL 
   OR language IS NULL 
   OR timezone IS NULL 
   OR notification_types IS NULL 
   OR privacy_settings IS NULL 
   OR content_preferences IS NULL 
   OR metadata IS NULL;

-- 12. Ensure all users have profiles and preferences
INSERT INTO user_profiles (user_id, is_public, allow_followers, allow_direct_messages)
SELECT 
    u.id,
    true as is_public,
    true as allow_followers,
    true as allow_direct_messages
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.user_id = u.id);

INSERT INTO user_preferences (user_id, theme, language, timezone)
SELECT 
    u.id,
    'auto' as theme,
    'en' as language,
    'UTC' as timezone
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM user_preferences p WHERE p.user_id = u.id);

-- 13. Create helpful views for common queries
CREATE OR REPLACE VIEW user_complete_profile AS
SELECT 
    u.id,
    u.email,
    u.username,
    u.full_name,
    u.avatar_url,
    u.banner_url,
    u.status,
    u.role,
    u.auth_provider,
    u.email_verified,
    u.is_verified,
    u.last_login_at,
    u.last_active_at,
    u.created_at,
    u.updated_at,
    -- Profile data
    p.first_name,
    p.last_name,
    p.bio,
    p.location,
    p.website,
    p.date_of_birth,
    p.phone_number,
    p.is_public,
    p.allow_followers,
    p.allow_direct_messages,
    -- Preferences data
    pr.theme,
    pr.language,
    pr.timezone,
    pr.email_notifications,
    pr.push_notifications,
    pr.metadata,
    -- Stats data
    s.post_count,
    s.follower_count,
    s.following_count,
    s.community_count,
    s.comment_count,
    s.likes_received_count,
    s.reputation_score,
    -- Computed fields
    CASE 
        WHEN u.full_name IS NOT NULL 
         AND u.username IS NOT NULL 
         AND u.email_verified = true
         AND (p.bio IS NOT NULL OR p.location IS NOT NULL)
         AND COALESCE(JSONB_ARRAY_LENGTH(pr.metadata->'interests'), 0) >= 3
        THEN true 
        ELSE false 
    END as is_onboarding_complete
FROM users u
LEFT JOIN user_profiles p ON u.id = p.user_id
LEFT JOIN user_preferences pr ON u.id = pr.user_id
LEFT JOIN user_stats s ON u.id = s.user_id;

-- 14. Add comments for documentation
COMMENT ON TABLE user_stats IS 'Computed user statistics and metrics for performance';
COMMENT ON COLUMN user_stats.reputation_score IS 'Calculated user reputation based on engagement';
COMMENT ON VIEW user_complete_profile IS 'Complete user profile with all related data for API responses';

-- Migration completed successfully
SELECT 'Domain-Driven User Architecture migration completed successfully' as status;
