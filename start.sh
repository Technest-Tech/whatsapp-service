#!/bin/bash

# WhatsApp Web Dashboard Startup Script

echo "🚀 Starting WhatsApp Web Dashboard..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd client && npm install && cd ..
fi

# Create data directory if it doesn't exist
mkdir -p data

echo "✅ Dependencies installed successfully!"

# Start the backend server
echo "🔧 Starting backend server..."
npm run dev &

# Wait a moment for the backend to start
sleep 3

# Start the frontend development server
echo "🎨 Starting frontend development server..."
cd client && npm start &

echo ""
echo "🎉 WhatsApp Web Dashboard is starting up!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for user to stop
wait
