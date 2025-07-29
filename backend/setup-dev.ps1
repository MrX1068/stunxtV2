# StunxtV2 Development Environment Setup
# Professional Redis + PostgreSQL setup for enterprise development

Write-Host "🚀 Setting up StunxtV2 Enterprise Development Environment" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

# Check prerequisites
function Test-Prerequisites {
    Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow
    
    # Check WSL2
    try {
        $wslVersion = wsl --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ WSL2 is available" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "❌ WSL2 not found" -ForegroundColor Red
        return $false
    }
}

# Install WSL2 and Redis
function Install-WSLRedis {
    Write-Host "🐧 Setting up Redis via WSL2..." -ForegroundColor Blue
    
    # Check if Ubuntu is installed
    $distros = wsl -l -q
    if ($distros -notcontains "Ubuntu") {
        Write-Host "📥 Installing Ubuntu on WSL2..." -ForegroundColor Yellow
        wsl --install -d Ubuntu
        Write-Host "⚠️  Please restart your computer and run this script again" -ForegroundColor Yellow
        return
    }
    
    # Install Redis in WSL
    Write-Host "📦 Installing Redis in WSL2..." -ForegroundColor Yellow
    wsl -d Ubuntu bash -c "
        sudo apt update -y
        sudo apt install redis-server -y
        sudo systemctl enable redis-server
        sudo systemctl start redis-server
        echo 'Redis installation completed'
    "
    
    # Test Redis
    Write-Host "🧪 Testing Redis connection..." -ForegroundColor Yellow
    $redisTest = wsl -d Ubuntu redis-cli ping
    if ($redisTest -eq "PONG") {
        Write-Host "✅ Redis is running successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Redis test failed" -ForegroundColor Red
    }
}

# Docker-based setup
function Install-DockerServices {
    Write-Host "🐳 Setting up services with Docker..." -ForegroundColor Blue
    
    # Check if Docker is running
    try {
        docker info | Out-Null
        Write-Host "✅ Docker is running" -ForegroundColor Green
    } catch {
        Write-Host "❌ Docker is not running. Please start Docker Desktop" -ForegroundColor Red
        return
    }
    
    # Create docker-compose for development
    $dockerCompose = @"
version: '3.8'

services:
  # Redis for caching and sessions
  redis:
    image: redis:7-alpine
    container_name: stunxt-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # PostgreSQL for main database
  postgres:
    image: postgres:15-alpine
    container_name: stunxt-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: Buvan@1068
      PGDATA: /var/lib/postgresql/data/pgdata
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Commander (GUI for Redis)
  redis-commander:
    image: rediscommander/redis-commander:latest
    container_name: stunxt-redis-commander
    restart: unless-stopped
    environment:
      REDIS_HOSTS: local:redis:6379
    ports:
      - "8081:8081"
    depends_on:
      - redis
    profiles:
      - tools

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  default:
    driver: bridge
"@

    $dockerCompose | Out-File -FilePath "docker-compose.dev.yml" -Encoding UTF8
    
    Write-Host "📦 Starting development services..." -ForegroundColor Yellow
    docker-compose -f docker-compose.dev.yml up -d redis postgres
    
    # Wait for services
    Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Test connections
    $redisTest = docker exec stunxt-redis redis-cli ping 2>$null
    $postgresTest = docker exec stunxt-postgres pg_isready -U postgres 2>$null
    
    if ($redisTest -eq "PONG") {
        Write-Host "✅ Redis is ready" -ForegroundColor Green
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PostgreSQL is ready" -ForegroundColor Green
    }
}

# Configure application
function Set-ApplicationConfig {
    Write-Host "⚙️  Configuring application..." -ForegroundColor Yellow
    
    $envPath = ".env"
    if (Test-Path $envPath) {
        # Update Redis configuration in .env
        $envContent = Get-Content $envPath
        $envContent = $envContent -replace "REDIS_HOST=.*", "REDIS_HOST=localhost"
        $envContent = $envContent -replace "REDIS_PORT=.*", "REDIS_PORT=6379"
        $envContent = $envContent -replace "REDIS_PASSWORD=.*", "REDIS_PASSWORD="
        $envContent | Set-Content $envPath
        Write-Host "✅ Updated .env configuration" -ForegroundColor Green
    }
}

# Main setup flow
function Start-Setup {
    param([string]$Method = "docker")
    
    switch ($Method.ToLower()) {
        "wsl" {
            if (Test-Prerequisites) {
                Install-WSLRedis
            } else {
                Write-Host "❌ WSL2 is required but not available" -ForegroundColor Red
                Write-Host "💡 Try: wsl --install" -ForegroundColor Yellow
            }
        }
        "docker" {
            Install-DockerServices
        }
        default {
            Write-Host "❌ Unknown method: $Method" -ForegroundColor Red
            Write-Host "💡 Available methods: wsl, docker" -ForegroundColor Yellow
            return
        }
    }
    
    Set-ApplicationConfig
    Show-Summary
}

# Show setup summary
function Show-Summary {
    Write-Host ""
    Write-Host "🎉 Development Environment Ready!" -ForegroundColor Green
    Write-Host "=================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Services Status:" -ForegroundColor Cyan
    Write-Host "  • Redis: localhost:6379" -ForegroundColor White
    Write-Host "  • PostgreSQL: localhost:5432" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 Development Commands:" -ForegroundColor Cyan
    Write-Host "  • Start API: npm run start:dev" -ForegroundColor White
    Write-Host "  • Run Tests: npm run test" -ForegroundColor White
    Write-Host "  • View Redis: docker exec -it stunxt-redis redis-cli" -ForegroundColor White
    Write-Host "  • Redis GUI: http://localhost:8081 (optional)" -ForegroundColor White
    Write-Host ""
    Write-Host "📱 Quick Tests:" -ForegroundColor Cyan
    Write-Host "  • Redis Test: redis-cli ping" -ForegroundColor White
    Write-Host "  • API Health: curl http://localhost:3000/health" -ForegroundColor White
    Write-Host ""
    Write-Host "Ready for enterprise development! 🚀" -ForegroundColor Green
}

# Command line interface
param(
    [Parameter(Position=0)]
    [ValidateSet("wsl", "docker", "help")]
    [string]$Method = "docker"
)

if ($Method -eq "help") {
    Write-Host "StunxtV2 Development Environment Setup" -ForegroundColor Green
    Write-Host ""
    Write-Host "Usage: .\setup-dev.ps1 [method]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Methods:" -ForegroundColor Cyan
    Write-Host "  docker  - Use Docker containers (recommended)" -ForegroundColor White
    Write-Host "  wsl     - Use WSL2 with native Redis" -ForegroundColor White
    Write-Host "  help    - Show this help" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Cyan
    Write-Host "  .\setup-dev.ps1 docker" -ForegroundColor White
    Write-Host "  .\setup-dev.ps1 wsl" -ForegroundColor White
} else {
    Start-Setup -Method $Method
}
