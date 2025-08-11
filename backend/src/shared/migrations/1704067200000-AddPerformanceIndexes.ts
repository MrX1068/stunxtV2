import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1704067200000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Community Members Search Optimization
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_community_members_search" 
      ON "community_members" ("community_id", "status", "role")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_community_members_user_search" 
      ON "community_members" ("user_id", "status", "joined_at")
    `);

    // User Search Optimization
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_search_active" 
      ON "users" ("username", "full_name") 
      WHERE "status" = 'active'
    `);

    // Full-text search for users (PostgreSQL specific)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_fulltext" 
      ON "users" USING gin(to_tsvector('english', "username" || ' ' || COALESCE("full_name", '')))
      WHERE "status" = 'active'
    `);

    // Space Members Search Optimization
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_space_members_search" 
      ON "space_members" ("space_id", "status", "role")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_space_members_user_search" 
      ON "space_members" ("user_id", "status", "joined_at")
    `);

    // Message Performance Indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_messages_conversation_pagination" 
      ON "messages" ("conversation_id", "created_at" DESC, "id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_messages_sender_recent" 
      ON "messages" ("sender_id", "created_at" DESC)
      WHERE "status" = 'sent'
    `);

    // Conversation Performance Indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_conversations_user_active" 
      ON "conversation_participants" ("user_id", "status", "last_read_at")
      WHERE "status" = 'active'
    `);

    // Community Invites Performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_community_invites_active" 
      ON "community_invites" ("community_id", "status", "expires_at")
      WHERE "status" = 'pending'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_community_invites_code_lookup" 
      ON "community_invites" ("code", "status", "expires_at")
      WHERE "status" = 'pending'
    `);

    // User Session Performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_sessions_active" 
      ON "user_sessions" ("user_id", "status", "expires_at")
      WHERE "status" = 'active'
    `);

    // Login Attempts Security Index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_login_attempts_security" 
      ON "login_attempts" ("email", "ip_address", "created_at" DESC, "result")
    `);

    // Audit Logs Performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_community_audit_logs_search" 
      ON "community_audit_logs" ("community_id", "action", "severity", "created_at" DESC)
    `);

    // Space Access Performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_spaces_community_active" 
      ON "spaces" ("community_id", "status", "type", "created_at" DESC)
      WHERE "status" = 'active'
    `);

    // User Profile Search
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_profiles_search" 
      ON "user_profiles" ("location", "bio") 
      USING gin(to_tsvector('english', COALESCE("bio", '')))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all indexes in reverse order
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_profiles_search"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_spaces_community_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_community_audit_logs_search"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_login_attempts_security"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_sessions_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_community_invites_code_lookup"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_community_invites_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_conversations_user_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_messages_sender_recent"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_messages_conversation_pagination"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_space_members_user_search"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_space_members_search"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_fulltext"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_search_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_community_members_user_search"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_community_members_search"`);
  }
}
