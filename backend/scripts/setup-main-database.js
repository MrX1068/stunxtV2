const { Client } = require('pg');

async function createMainDatabase() {
  // Connect to default postgres database first
  const defaultClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Buvan@1068',
    database: 'postgres'
  });

  try {
    await defaultClient.connect();
    console.log('✅ Connected to PostgreSQL server');

    // Check if stunxtv2 database exists
    const result = await defaultClient.query(
      "SELECT 1 FROM pg_database WHERE datname = 'stunxtv2'"
    );

    if (result.rows.length === 0) {
      console.log('📝 Creating stunxtv2 database...');
      await defaultClient.query('CREATE DATABASE stunxtv2');
      console.log('✅ Database stunxtv2 created successfully');
    } else {
      console.log('✅ Database stunxtv2 already exists');
    }

    await defaultClient.end();

    // Now test connection to the main database
    const mainClient = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'Buvan@1068',
      database: 'stunxtv2'
    });

    await mainClient.connect();
    console.log('✅ Connected to stunxtv2 database');
    
    // Ensure public schema exists and has proper permissions
    await mainClient.query('CREATE SCHEMA IF NOT EXISTS public');
    await mainClient.query('GRANT USAGE ON SCHEMA public TO postgres');
    await mainClient.query('GRANT CREATE ON SCHEMA public TO postgres');
    console.log('✅ Schema permissions configured');
    
    await mainClient.end();

    console.log('\n🎉 Main database setup complete!');
    console.log('You can now start the backend server.');

  } catch (error) {
    console.error('❌ Database setup error:', error.message);
    process.exit(1);
  }
}

createMainDatabase();
