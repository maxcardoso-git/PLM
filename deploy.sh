#!/bin/bash
set -e

echo "🚀 PLM Deployment Script"
echo "========================"

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env with your production settings!"
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Build and start containers
echo "🔨 Building Docker images..."
docker compose -f docker-compose.prod.yml build

echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.prod.yml down

echo "🚀 Starting containers..."
docker compose -f docker-compose.prod.yml up -d

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 10

# Run migrations
echo "📊 Running database migrations..."
docker compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy || echo "Migrations skipped (using SQL init)"

# Show status
echo ""
echo "✅ Deployment complete!"
echo ""
docker compose -f docker-compose.prod.yml ps
echo ""
echo "🌐 Frontend: http://localhost"
echo "🔌 API: http://localhost:3000/api/v1"
echo "📚 Swagger: http://localhost:3000/api/docs"
