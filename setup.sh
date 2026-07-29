#!/bin/bash

# Setup script for Fourdoor AI

echo "🔧 Setting up Fourdoor AI Growth Engine..."

# Check prerequisites
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not installed. Please install Node.js 18+"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL not installed. Please install PostgreSQL 15+"
    exit 1
fi

# Create env file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created .env file. Please edit with your credentials."
fi

# Backend setup
echo "📦 Setting up backend..."
cd backend
npm install
cd ..

# Frontend setup
echo "📦 Setting up frontend..."
cd frontend
npm install
cd ..

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your credentials (OpenAI API key, PayPal keys, etc.)"
echo "2. Run migrations: cd backend && npm run migrate"
echo "3. Start backend: cd backend && npm run dev"
echo "4. Start frontend: cd frontend && npm run dev"
echo ""
echo "Or use Docker:"
echo "  docker-compose up --build"
