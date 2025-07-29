// Database Reset Script for StunxtV2
// This script will reset the database to clean state
const { Client } = require('pg');

async function resetDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Buvan@1068',
    database: 'postgres'
  });

  try {
    console.log('🔗 Connecting to database...');
    await client.connect();

    console.log('🗑️  Dropping existing schema...');
    await client.query('DROP SCHEMA IF EXISTS public CASCADE;');
    
    console.log('🏗️  Creating fresh schema...');
    await client.query('CREATE SCHEMA public;');
    
    console.log('🔑 Setting permissions...');
    await client.query('GRANT ALL ON SCHEMA public TO postgres;');
    await client.query('GRANT ALL ON SCHEMA public TO public;');
    
    console.log('🧩 Installing extensions...');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    
    console.log('✅ Database reset completed successfully!');
    console.log('🚀 You can now start your NestJS application');
    
  } catch (error) {
    console.error('❌ Database reset failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the reset
resetDatabase().catch(console.error);
