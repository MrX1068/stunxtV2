#!/bin/bash

# Enterprise Messaging System Development Setup Script
# This script starts all required services for the stunxt enterprise messaging system

echo "🚀 Starting StunxtV2 Enterprise Messaging System Development Environment"
echo "=================================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

echo "📋 Starting required services..."
echo ""

# Start PostgreSQL and Redis
echo "🐘 Starting PostgreSQL database..."
echo "🔴 Starting Redis cache..."
docker-compose up -d postgres redis

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be ready..."

# Wait for PostgreSQL
echo -n "Waiting for PostgreSQL"
until docker-compose exec postgres pg_isready -U postgres > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo " ✅ PostgreSQL is ready"

# Wait for Redis
echo -n "Waiting for Redis"
until docker-compose exec redis redis-cli ping > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo " ✅ Redis is ready"

echo ""
echo "🎉 All services are ready!"
echo ""
echo "📊 Service Status:"
echo "  • PostgreSQL: localhost:5432 (Database)"
echo "  • Redis: localhost:6379 (Cache & Sessions)"
echo ""
echo "🔧 Development Commands:"
echo "  • Start API: npm run start:dev"
echo "  • Run Tests: npm run test"
echo "  • Run E2E Tests: npm run test:e2e"
echo "  • View Logs: docker-compose logs -f"
echo "  • Stop Services: docker-compose down"
echo ""
echo "🌐 Optional Tools:"
echo "  • Redis Commander: docker-compose --profile tools up -d redis-commander"
echo "  • Access at: http://localhost:8081"
echo ""
echo "Ready for enterprise messaging development! 🚀"
