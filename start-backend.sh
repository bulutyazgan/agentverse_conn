#!/bin/bash

# Strands Agent Backend Startup Script

echo "🚀 Starting Strands Agent Backend..."

# Navigate to project root
cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d ".env" ]; then
    echo "❌ Virtual environment not found at .env!"
    echo "Please create it first: python3 -m venv .env"
    exit 1
fi

# Activate the project virtual environment
source .env/bin/activate

# Install backend dependencies if needed
echo "📦 Checking backend dependencies..."
pip install -q -r backend/requirements.txt

# Check if Ollama is running
echo "🔍 Checking Ollama connection..."
if curl -s http://localhost:11435/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama is running"
else
    echo "⚠️  Warning: Cannot connect to Ollama at http://localhost:11435"
    echo "   Make sure Ollama is running with: ollama serve"
    echo ""
fi

# Start the server
echo "🌐 Starting Flask server on http://localhost:5001..."
echo ""
cd backend
python server.py
