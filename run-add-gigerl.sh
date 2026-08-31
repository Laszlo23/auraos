#!/bin/bash
# Run this script to add Gigerl to your Wien directory
# Usage: ./run-add-gigerl.sh

set -e

echo "🚀 Adding Gigerl to Wien directory..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ .env file not found!"
  echo "Please create a .env file with your Supabase credentials."
  exit 1
fi

# Extract credentials
SUPABASE_URL=$(grep '^SUPABASE_URL=' .env | cut -d= -f2 | tr -d '"' | tr -d "'")
SUPABASE_SERVICE_ROLE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env | cut -d= -f2 | tr -d '"' | tr -d "'")

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Could not find SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"
  echo "Make sure your .env file contains:"
  echo "  SUPABASE_URL=https://your-project.supabase.co"
  echo "  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
  exit 1
fi

echo "✅ Found Supabase credentials"
echo "📝 Running insertion script..."
echo ""

# Run the Node.js script
SUPABASE_URL="$SUPABASE_URL" \
SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
node add-gigerl-direct.mjs

echo ""
echo "✨ Done! Check your Wien directory:"
echo "   https://aibusiness.fun/wien"
echo "   https://aibusiness.fun/b/gigerl"
