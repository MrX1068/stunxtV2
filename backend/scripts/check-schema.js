const { Client } = require('pg');

async function checkSchema() {
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
        
        // Check user_profiles table schema
        const schemaQuery = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'user_profiles'
            ORDER BY ordinal_position;
        `;
        
        console.log('=== User Profiles Table Schema ===');
        const schemaResult = await client.query(schemaQuery);
        schemaResult.rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
        
        // Check user_preferences table schema
        const prefsSchemaQuery = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'user_preferences'
            ORDER BY ordinal_position;
        `;
        
        console.log('\n=== User Preferences Table Schema ===');
        const prefsSchemaResult = await client.query(prefsSchemaQuery);
        prefsSchemaResult.rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await client.end();
    }
}

checkSchema();
