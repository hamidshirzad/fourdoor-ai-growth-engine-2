#!/bin/bash

set -e

echo "🚀 Deploying Fourdoor AI Growth Engine..."

# Backend
echo "📦 Building backend..."
cd backend
npm install
npm run migrate
npm run seed

echo "🚀 Starting backend server..."
npm start &
BACKEND_PID=$!

cd ../frontend
echo "📦 Building frontend..."
npm install
npm run build

echo "🚀 Starting frontend server..."
npm start &
FRONTEND_PID=$!

echo "✅ Deployment complete!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:5000"

wait $BACKEND_PID $FRONTEND_PID
