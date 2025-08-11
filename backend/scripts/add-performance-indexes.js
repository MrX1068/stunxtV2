#!/usr/bin/env node

/**
 * Script to add performance indexes to the database
 * Can be run independently of TypeORM migrations
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
  database: process.env.DATABASE_NAME || 'stunxtv2',
};

async function addPerformanceIndexes() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    
    console.log('📖 Reading SQL script...');
    const sqlScript = fs.readFileSync(
      path.join(__dirname, 'run-performance-indexes.sql'),
      'utf8'
    );
    
    console.log('🚀 Executing performance indexes...');
    const startTime = Date.now();
    
    // Split by semicolon and execute each statement
    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    let successCount = 0;
    let skipCount = 0;
    
    for (const statement of statements) {
      try {
        await client.query(statement);
        
        if (statement.toLowerCase().includes('create index')) {
          const indexName = statement.match(/IF NOT EXISTS\s+"([^"]+)"/i)?.[1] || 'unknown';
          console.log(`✅ Created index: ${indexName}`);
          successCount++;
        } else if (statement.toLowerCase().includes('analyze')) {
          const tableName = statement.match(/ANALYZE\s+"([^"]+)"/i)?.[1] || 'unknown';
          console.log(`📊 Analyzed table: ${tableName}`);
        }
      } catch (error) {
        if (error.message.includes('already exists')) {
          skipCount++;
          console.log(`⏭️  Index already exists, skipping...`);
        } else {
          console.error(`❌ Error executing statement: ${error.message}`);
          console.error(`Statement: ${statement.substring(0, 100)}...`);
        }
      }
    }
    
    const duration = Date.now() - startTime;
    
    console.log('\n📈 Performance Indexes Summary:');
    console.log(`✅ Successfully created: ${successCount} indexes`);
    console.log(`⏭️  Already existed: ${skipCount} indexes`);
    console.log(`⏱️  Total time: ${duration}ms`);
    console.log('\n🎉 Performance optimization complete!');
    
  } catch (error) {
    console.error('❌ Failed to add performance indexes:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run if called directly
if (require.main === module) {
  addPerformanceIndexes().catch(console.error);
}

module.exports = { addPerformanceIndexes };
