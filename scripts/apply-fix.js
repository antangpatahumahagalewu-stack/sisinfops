#!/usr/bin/env node

/**
 * Script to apply the migration fix for the activity log triggers type mismatch.
 * Usage: node scripts/apply-fix.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Read environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (err) {
  console.error('Error reading .env.local file:', err.message);
  process.exit(1);
}

// Parse environment variables
const envVars = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex !== -1) {
      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();
      envVars[key] = value;
    }
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('NEXT_PUBLIC_SUPABASE_URL is not set. Please set it in .env.local or as an environment variable.');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not set. Please set it in .env.local or as an environment variable.');
  console.error('You can find the service role key in your Supabase project settings > API.');
  process.exit(1);
}

// Read the migration file
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260129_fix_activity_log_triggers_type_mismatch.sql');
let migrationSQL;
try {
  migrationSQL = fs.readFileSync(migrationPath, 'utf8');
} catch (err) {
  console.error('Error reading migration file:', err.message);
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('Applying migration fix for activity log triggers type mismatch...');
  
  try {
    // Split the SQL by semicolons to execute each statement separately
    // Note: This is a simple split; for complex SQL with functions, we might need a better parser.
    // But since we have only CREATE OR REPLACE FUNCTION statements, this should work.
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';'; // Add back the semicolon
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: stmt });
      
      if (error) {
        // If the exec_sql function doesn't exist, try using the query method directly
        // Note: The supabase-js client doesn't have a method for arbitrary SQL.
        // We need to use the REST API or create a function in Supabase to run SQL.
        // Alternatively, we can use the `supabase.from().select()` but that won't work for DDL.
        
        console.error('Error executing SQL via RPC:', error.message);
        console.error('Trying alternative method...');
        
        // Alternative: Use the Supabase REST API's SQL endpoint (requires admin role)
        // This is a more direct approach but requires the service role key.
        const sqlEndpoint = `${supabaseUrl}/rest/v1/`;
        const response = await fetch(sqlEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ query: stmt })
        });
        
        if (!response.ok) {
          const text = await response.text();
          console.error(`Failed to execute statement ${i + 1}:`, text);
          throw new Error(`SQL execution failed: ${text}`);
        }
        
        console.log(`Statement ${i + 1} executed successfully via REST API.`);
      } else {
        console.log(`Statement ${i + 1} executed successfully.`);
      }
    }
    
    console.log('Migration applied successfully!');
    console.log('The trigger functions log_profile_activity and log_ps_activity have been fixed.');
    
  } catch (error) {
    console.error('Error applying migration:', error.message);
    console.error('You may need to apply the migration manually through the Supabase dashboard.');
    console.error('The migration file is at:', migrationPath);
    process.exit(1);
  }
}

applyMigration();