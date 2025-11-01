#!/bin/bash

# Strands Agent Frontend Startup Script

echo "🚀 Starting Strands Agent Frontend..."

# Navigate to frontend directory
cd "$(dirname "$0")/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ Dependencies not found!"
    echo "Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
fi

# Start the development server
echo "🌐 Starting Vite dev server on http://localhost:5173..."
echo ""
npm run dev
