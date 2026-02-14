#!/bin/bash
# Script to clean restart Next.js development server

echo "🚀 RESTARTING NEXT.JS DEVELOPMENT SERVER"
echo "=========================================="

# Kill any processes using ports 3000 or 3001
echo "🔍 Checking for processes on ports 3000/3001..."

# Find PIDs using the ports
PORT_3000_PID=$(lsof -ti:3000 2>/dev/null)
PORT_3001_PID=$(lsof -ti:3001 2>/dev/null)

if [ ! -z "$PORT_3000_PID" ]; then
    echo "🗑️  Killing process on port 3000 (PID: $PORT_3000_PID)"
    kill -9 $PORT_3000_PID 2>/dev/null
    sleep 1
fi

if [ ! -z "$PORT_3001_PID" ]; then
    echo "🗑️  Killing process on port 3001 (PID: $PORT_3001_PID)"
    kill -9 $PORT_3001_PID 2>/dev/null
    sleep 1
fi

# Also kill any next dev processes
echo "🔍 Checking for next dev processes..."
NEXT_PIDS=$(ps aux | grep -E "next\.js|next dev" | grep -v grep | awk '{print $2}')
if [ ! -z "$NEXT_PIDS" ]; then
    echo "🗑️  Killing next dev processes (PIDs: $NEXT_PIDS)"
    echo $NEXT_PIDS | xargs kill -9 2>/dev/null
    sleep 2
fi

# Remove lock file
echo "🗑️  Removing lock file..."
rm -f .next/dev/lock 2>/dev/null

# Clear .next directory
echo "🗑️  Clearing .next directory..."
rm -rf .next/* 2>/dev/null

echo "✅ Cleanup complete!"
echo ""
echo "🚀 Starting Next.js dev server..."

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install Node.js and npm."
    exit 1
fi

# Start dev server
echo "📦 Running: npm run dev"
npm run dev