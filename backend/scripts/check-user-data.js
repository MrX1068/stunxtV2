const { Client } = require('pg');

async function checkUserData() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'stunxtv2',
        user: 'postgres',
        password: 'Buvan@1068'
    });

    try {
        await client.connect();
        console.log('Connected to database successfully\n');
        
        // Check basic user data first
        const userQuery = `
            SELECT 
                u.id,
                u.email,
                u.username,
                u.full_name,
                u.avatar_url,
                u.banner_url,
                u.email_verified,
                u.is_verified,
                u.status,
                u.role,
                u.auth_provider,
                u.created_at,
                u.updated_at
            FROM users u 
            WHERE u.email = 'buvaneshvaran1068@gmail.com'
        `;
        
        console.log('=== Basic User Data ===');
        const userResult = await client.query(userQuery);
        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            console.log(JSON.stringify(user, null, 2));
            const userId = user.id;
            
            // Check profile
            console.log('\n=== User Profile ===');
            const profileQuery = `
                SELECT 
                    id,
                    user_id,
                    bio,
                    location,
                    website,
                    date_of_birth,
                    phone_number,
                    is_public,
                    allow_followers,
                    allow_direct_messages,
                    view_count,
                    metadata,
                    created_at,
                    updated_at
                FROM user_profiles 
                WHERE user_id = $1
            `;
            const profileResult = await client.query(profileQuery, [userId]);
            if (profileResult.rows.length > 0) {
                console.log(JSON.stringify(profileResult.rows[0], null, 2));
            } else {
                console.log('No profile found');
            }
            
            // Check preferences and interests
            console.log('\n=== User Preferences & Interests ===');
            const prefsQuery = `
                SELECT 
                    id,
                    user_id,
                    theme,
                    language,
                    timezone,
                    email_notifications,
                    push_notifications,
                    sms_notifications,
                    notification_types,
                    privacy_settings,
                    content_preferences,
                    metadata,
                    created_at,
                    updated_at
                FROM user_preferences 
                WHERE user_id = $1
            `;
            const prefsResult = await client.query(prefsQuery, [userId]);
            if (prefsResult.rows.length > 0) {
                const prefs = prefsResult.rows[0];
                console.log(JSON.stringify(prefs, null, 2));
                
                // Extract interests if available
                if (prefs.metadata && prefs.metadata.interests) {
                    console.log('\n--- Interests ---');
                    console.log('Interests:', prefs.metadata.interests);
                    console.log('Interest count:', prefs.metadata.interests.length);
                }
            } else {
                console.log('No preferences found');
            }
            
            // Check user stats
            console.log('\n=== User Stats ===');
            const statsQuery = `
                SELECT 
                    id,
                    user_id,
                    post_count,
                    follower_count,
                    following_count,
                    community_count,
                    created_at,
                    updated_at
                FROM user_stats 
                WHERE user_id = $1
            `;
            const statsResult = await client.query(statsQuery, [userId]);
            if (statsResult.rows.length > 0) {
                console.log(JSON.stringify(statsResult.rows[0], null, 2));
            } else {
                console.log('No stats found');
            }
            
            // Onboarding completion analysis
            console.log('\n=== Onboarding Completion Analysis ===');
            const hasBasicInfo = !!(user.full_name && user.username && user.email_verified);
            const hasAvatar = !!user.avatar_url;
            const hasProfile = profileResult.rows.length > 0 && 
                !!(profileResult.rows[0].bio || profileResult.rows[0].location || profileResult.rows[0].website);
            const hasInterests = prefsResult.rows.length > 0 && 
                prefsResult.rows[0].metadata && 
                prefsResult.rows[0].metadata.interests && 
                prefsResult.rows[0].metadata.interests.length > 0;
            
            console.log('Basic Info (name, username, verified email):', hasBasicInfo);
            console.log('Avatar:', hasAvatar);
            console.log('Profile (bio, location, website):', hasProfile);
            console.log('Interests:', hasInterests);
            console.log('Profile OR Avatar:', hasProfile || hasAvatar);
            
            // Based on entity logic: hasBasicInfo && (hasProfileOrAvatar || hasInterests)
            const isOnboardingComplete = hasBasicInfo && ((hasProfile || hasAvatar) || hasInterests);
            console.log('\n🎯 ONBOARDING COMPLETE:', isOnboardingComplete);
            
        } else {
            console.log('❌ User not found with email: buvaneshvaran1068@gmail.com');
        }
        
    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        await client.end();
        console.log('\nDatabase connection closed');
    }
}

checkUserData().catch(console.error);
