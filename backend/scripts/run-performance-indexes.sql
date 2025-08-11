-- Performance Indexes for StunxtV2 Backend
-- Run this script to add critical performance indexes
-- This can be run safely multiple times (uses IF NOT EXISTS)

-- Community Members Search Optimization
CREATE INDEX IF NOT EXISTS "idx_community_members_search" 
ON "community_members" ("community_id", "status", "role");

CREATE INDEX IF NOT EXISTS "idx_community_members_user_search" 
ON "community_members" ("user_id", "status", "joined_at");

-- User Search Optimization
CREATE INDEX IF NOT EXISTS "idx_users_search_active" 
ON "users" ("username", "full_name") 
WHERE "status" = 'active';

-- Full-text search for users (PostgreSQL specific)
CREATE INDEX IF NOT EXISTS "idx_users_fulltext" 
ON "users" USING gin(to_tsvector('english', "username" || ' ' || COALESCE("full_name", '')))
WHERE "status" = 'active';

-- Space Members Search Optimization
CREATE INDEX IF NOT EXISTS "idx_space_members_search" 
ON "space_members" ("space_id", "status", "role");

CREATE INDEX IF NOT EXISTS "idx_space_members_user_search" 
ON "space_members" ("user_id", "status", "joined_at");

-- Message Performance Indexes
CREATE INDEX IF NOT EXISTS "idx_messages_conversation_pagination" 
ON "messages" ("conversation_id", "created_at" DESC, "id");

CREATE INDEX IF NOT EXISTS "idx_messages_sender_recent" 
ON "messages" ("sender_id", "created_at" DESC)
WHERE "status" = 'sent';

-- Conversation Performance Indexes
CREATE INDEX IF NOT EXISTS "idx_conversations_user_active" 
ON "conversation_participants" ("user_id", "status", "last_read_at")
WHERE "status" = 'active';

-- Community Invites Performance
CREATE INDEX IF NOT EXISTS "idx_community_invites_active" 
ON "community_invites" ("community_id", "status", "expires_at")
WHERE "status" = 'pending';

CREATE INDEX IF NOT EXISTS "idx_community_invites_code_lookup" 
ON "community_invites" ("code", "status", "expires_at")
WHERE "status" = 'pending';

-- User Session Performance
CREATE INDEX IF NOT EXISTS "idx_user_sessions_active" 
ON "user_sessions" ("user_id", "status", "expires_at")
WHERE "status" = 'active';

-- Login Attempts Security Index
CREATE INDEX IF NOT EXISTS "idx_login_attempts_security" 
ON "login_attempts" ("email", "ip_address", "created_at" DESC, "result");

-- Audit Logs Performance
CREATE INDEX IF NOT EXISTS "idx_community_audit_logs_search" 
ON "community_audit_logs" ("community_id", "action", "severity", "created_at" DESC);

-- Space Access Performance
CREATE INDEX IF NOT EXISTS "idx_spaces_community_active" 
ON "spaces" ("community_id", "status", "type", "created_at" DESC)
WHERE "status" = 'active';

-- User Profile Search
CREATE INDEX IF NOT EXISTS "idx_user_profiles_search" 
ON "user_profiles" ("location") 
WHERE "location" IS NOT NULL;

-- Additional composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS "idx_community_members_role_activity" 
ON "community_members" ("community_id", "role", "last_activity_at" DESC)
WHERE "status" = 'active';

CREATE INDEX IF NOT EXISTS "idx_messages_thread_performance" 
ON "messages" ("thread_id", "created_at" ASC)
WHERE "thread_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_spaces_interaction_type" 
ON "spaces" ("community_id", "interaction_type", "status");

-- Analyze tables after creating indexes for better query planning
ANALYZE "community_members";
ANALYZE "users";
ANALYZE "space_members";
ANALYZE "messages";
ANALYZE "conversation_participants";
ANALYZE "community_invites";
ANALYZE "user_sessions";
ANALYZE "login_attempts";
ANALYZE "community_audit_logs";
ANALYZE "spaces";
ANALYZE "user_profiles";
