# Enterprise Messaging System Development Setup Script (PowerShell)
# This script starts all required services for the stunxt enterprise messaging system

Write-Host "🚀 Starting StunxtV2 Enterprise Messaging System Development Environment" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

Write-Host "📋 Starting required services..." -ForegroundColor Yellow
Write-Host ""

# Start PostgreSQL and Redis
Write-Host "🐘 Starting PostgreSQL database..." -ForegroundColor Blue
Write-Host "🔴 Starting Redis cache..." -ForegroundColor Red
docker-compose up -d postgres redis

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start services. Please check Docker and try again." -ForegroundColor Red
    exit 1
}

# Wait for services to be healthy
Write-Host ""
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow

# Wait for PostgreSQL
Write-Host -NoNewline "Waiting for PostgreSQL"
do {
    Write-Host -NoNewline "."
    Start-Sleep -Seconds 2
    $pgReady = docker-compose exec postgres pg_isready -U postgres 2>$null
} while ($LASTEXITCODE -ne 0)
Write-Host " ✅ PostgreSQL is ready" -ForegroundColor Green

# Wait for Redis
Write-Host -NoNewline "Waiting for Redis"
do {
    Write-Host -NoNewline "."
    Start-Sleep -Seconds 1
    $redisReady = docker-compose exec redis redis-cli ping 2>$null
} while ($LASTEXITCODE -ne 0)
Write-Host " ✅ Redis is ready" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 All services are ready!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Service Status:" -ForegroundColor Cyan
Write-Host "  • PostgreSQL: localhost:5432 (Database)" -ForegroundColor White
Write-Host "  • Redis: localhost:6379 (Cache & Sessions)" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Development Commands:" -ForegroundColor Cyan
Write-Host "  • Start API: npm run start:dev" -ForegroundColor White
Write-Host "  • Run Tests: npm run test" -ForegroundColor White
Write-Host "  • Run E2E Tests: npm run test:e2e" -ForegroundColor White
Write-Host "  • View Logs: docker-compose logs -f" -ForegroundColor White
Write-Host "  • Stop Services: docker-compose down" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Optional Tools:" -ForegroundColor Cyan
Write-Host "  • Redis Commander: docker-compose --profile tools up -d redis-commander" -ForegroundColor White
Write-Host "  • Access at: http://localhost:8081" -ForegroundColor White
Write-Host ""
Write-Host "Ready for enterprise messaging development! 🚀" -ForegroundColor Green
