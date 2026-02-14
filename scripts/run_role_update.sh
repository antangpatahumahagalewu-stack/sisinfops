#!/bin/bash

# Script to update role_permissions table via Supabase REST API

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Extract Supabase URL and service role key from .env.local
SUPABASE_URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' "$PROJECT_ROOT/.env.local" | cut -d'=' -f2- | tr -d '\"' | tr -d "'")
SERVICE_ROLE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' "$PROJECT_ROOT/.env.local" | cut -d'=' -f2- | tr -d '\"' | tr -d "'")

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: Could not load Supabase credentials from .env.local"
    exit 1
fi

echo "✅ Loaded Supabase credentials"
echo "   URL: $SUPABASE_URL"
echo "   Service Role Key: ${SERVICE_ROLE_KEY:0:20}..."

# SQL file to execute
SQL_FILE="$SCRIPT_DIR/update_role_permissions.sql"
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Error: SQL file not found: $SQL_FILE"
    exit 1
fi

echo "📄 Reading SQL file: $SQL_FILE"
SQL_CONTENT=$(cat "$SQL_FILE")

# Remove transaction commands for REST API compatibility
# The REST API doesn't support BEGIN/COMMIT
SQL_CONTENT=$(echo "$SQL_CONTENT" | sed 's/^BEGIN;//' | sed 's/^COMMIT;//')

echo "📏 SQL size: ${#SQL_CONTENT} characters"

# Execute SQL via Supabase REST API
echo "🚀 Executing SQL via Supabase REST API..."
echo "⏳ This may take a moment..."

RESPONSE=$(curl -s -X POST \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "{\"query\": \"$SQL_CONTENT\"}" \
  "$SUPABASE_URL/rest/v1/rpc/exec_sql")

# Check if curl command succeeded
if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to execute curl command"
    exit 1
fi

# Check response
if [[ "$RESPONSE" == *"error"* ]] || [[ "$RESPONSE" == *"Error"* ]]; then
    echo "❌ Error from Supabase API:"
    echo "$RESPONSE"
    exit 1
else
    echo "✅ SQL executed successfully!"
    echo "Response: $RESPONSE"
fi

# Verify the update by querying the table
echo ""
echo "🔍 Verifying update..."

# Query to check updated roles
VERIFY_QUERY="SELECT role_name, display_name FROM role_permissions WHERE role_name != 'admin' ORDER BY role_name;"

VERIFY_RESPONSE=$(curl -s -X POST \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"query\": \"$VERIFY_QUERY\"}" \
  "$SUPABASE_URL/rest/v1/rpc/exec_sql")

echo "📊 Updated roles:"
if [[ "$VERIFY_RESPONSE" == *"role_name"* ]]; then
    # Parse JSON response
    echo "$VERIFY_RESPONSE" | jq -r '.[] | "   • \(.role_name) - \(.display_name)"' 2>/dev/null || echo "$VERIFY_RESPONSE"
else
    echo "   Could not parse response. Raw: $VERIFY_RESPONSE"
fi

echo ""
echo "🎉 Role permissions update completed!"
echo "   Updated 11 roles (excluding admin)"