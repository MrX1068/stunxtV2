-- SQL Script to check user data for buvaneshvaran1068@gmail.com
-- This script checks user data, profile, preferences, and interests

-- Check basic user data
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
    u.two_factor_enabled,
    u.last_login_at,
    u.last_active_at,
    u.created_at,
    u.updated_at
FROM users u 
WHERE u.email = 'buvaneshvaran1068@gmail.com';

-- Check user profile data
SELECT 
    up.id as profile_id,
    up.user_id,
    up.bio,
    up.location,
    up.website,
    up.date_of_birth,
    up.gender,
    up.phone_number,
    up.company,
    up.job_title,
    up.education,
    up.created_at as profile_created_at,
    up.updated_at as profile_updated_at
FROM user_profiles up
JOIN users u ON up.user_id = u.id
WHERE u.email = 'buvaneshvaran1068@gmail.com';

-- Check user preferences and interests
SELECT 
    upr.id as preferences_id,
    upr.user_id,
    upr.language,
    upr.timezone,
    upr.theme,
    upr.email_notifications,
    upr.push_notifications,
    upr.sms_notifications,
    upr.privacy_level,
    upr.metadata,
    upr.created_at as preferences_created_at,
    upr.updated_at as preferences_updated_at
FROM user_preferences upr
JOIN users u ON upr.user_id = u.id
WHERE u.email = 'buvaneshvaran1068@gmail.com';

-- Extract interests from metadata (if stored as JSON)
SELECT 
    u.email,
    u.username,
    JSON_EXTRACT(upr.metadata, '$.interests') as interests_array,
    CASE 
        WHEN JSON_EXTRACT(upr.metadata, '$.interests') IS NOT NULL 
        THEN JSON_LENGTH(JSON_EXTRACT(upr.metadata, '$.interests'))
        ELSE 0 
    END as interests_count
FROM users u
LEFT JOIN user_preferences upr ON u.id = upr.user_id
WHERE u.email = 'buvaneshvaran1068@gmail.com';

-- Check user stats
SELECT 
    us.id as stats_id,
    us.user_id,
    us.post_count,
    us.follower_count,
    us.following_count,
    us.community_count,
    us.like_count,
    us.comment_count,
    us.share_count,
    us.created_at as stats_created_at,
    us.updated_at as stats_updated_at
FROM user_stats us
JOIN users u ON us.user_id = u.id
WHERE u.email = 'buvaneshvaran1068@gmail.com';

-- Comprehensive onboarding completion check
SELECT 
    u.email,
    u.username,
    u.full_name,
    u.email_verified,
    u.avatar_url,
    -- Profile completion check
    CASE 
        WHEN up.bio IS NOT NULL OR up.location IS NOT NULL OR up.website IS NOT NULL 
        THEN 'YES' 
        ELSE 'NO' 
    END as has_profile_info,
    -- Avatar check
    CASE 
        WHEN u.avatar_url IS NOT NULL 
        THEN 'YES' 
        ELSE 'NO' 
    END as has_avatar,
    -- Interests check
    CASE 
        WHEN JSON_EXTRACT(upr.metadata, '$.interests') IS NOT NULL 
             AND JSON_LENGTH(JSON_EXTRACT(upr.metadata, '$.interests')) > 0
        THEN CONCAT('YES (', JSON_LENGTH(JSON_EXTRACT(upr.metadata, '$.interests')), ' interests)')
        ELSE 'NO' 
    END as has_interests,
    -- Basic info check
    CASE 
        WHEN u.full_name IS NOT NULL AND u.username IS NOT NULL AND u.email_verified = 1
        THEN 'YES'
        ELSE 'NO'
    END as has_basic_info,
    -- Overall onboarding completion (based on entity logic)
    CASE 
        WHEN (u.full_name IS NOT NULL AND u.username IS NOT NULL AND u.email_verified = 1) 
             AND ((up.bio IS NOT NULL OR up.location IS NOT NULL OR up.website IS NOT NULL OR u.avatar_url IS NOT NULL)
                  OR (JSON_EXTRACT(upr.metadata, '$.interests') IS NOT NULL 
                      AND JSON_LENGTH(JSON_EXTRACT(upr.metadata, '$.interests')) > 0))
        THEN 'COMPLETE'
        ELSE 'INCOMPLETE'
    END as onboarding_status
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_preferences upr ON u.id = upr.user_id
WHERE u.email = 'buvaneshvaran1068@gmail.com';

-- Check user sessions (recent activity)
SELECT 
    us.id as session_id,
    us.user_id,
    us.token_hash,
    us.device_info,
    us.ip_address,
    us.user_agent,
    us.is_active,
    us.expires_at,
    us.created_at as session_created_at,
    us.last_used_at
FROM user_sessions us
JOIN users u ON us.user_id = u.id
WHERE u.email = 'buvaneshvaran1068@gmail.com'
ORDER BY us.last_used_at DESC
LIMIT 5;

-- Check login attempts (recent)
SELECT 
    la.id as attempt_id,
    la.user_id,
    la.ip_address,
    la.user_agent,
    la.success,
    la.failure_reason,
    la.attempted_at
FROM login_attempts la
JOIN users u ON la.user_id = u.id
WHERE u.email = 'buvaneshvaran1068@gmail.com'
ORDER BY la.attempted_at DESC
LIMIT 10;
