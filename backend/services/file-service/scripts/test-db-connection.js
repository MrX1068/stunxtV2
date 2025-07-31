const { Client } = require('pg');

async function testConnection() {
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

    // Check if stunxt_files database exists
    const result = await defaultClient.query(
      "SELECT 1 FROM pg_database WHERE datname = 'stunxt_files'"
    );

    if (result.rows.length === 0) {
      console.log('📝 Creating stunxt_files database...');
      await defaultClient.query('CREATE DATABASE stunxt_files');
      console.log('✅ Database stunxt_files created successfully');
    } else {
      console.log('✅ Database stunxt_files already exists');
    }

    await defaultClient.end();

    // Now test connection to the file service database
    const fileServiceClient = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'Buvan@1068',
      database: 'stunxt_files'
    });

    await fileServiceClient.connect();
    console.log('✅ Connected to stunxt_files database');
    await fileServiceClient.end();

  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
}

testConnection();
