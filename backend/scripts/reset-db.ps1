#!/usr/bin/env powershell
# StunxtV2 Database Reset Script
# Professional database management for development environment

param(
    [Parameter()]
    [switch]$Force,
    
    [Parameter()]
    [string]$Database = "postgres",
    
    [Parameter()]
    [string]$User = "postgres",
    
    [Parameter()]
    [string]$Host = "localhost",
    
    [Parameter()]
    [int]$Port = 5432
)

Write-Host "🔧 StunxtV2 Database Reset Tool" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Check if psql is available
try {
    $psqlVersion = psql --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ PostgreSQL client (psql) not found in PATH" -ForegroundColor Red
        Write-Host "💡 Please install PostgreSQL client tools or use Docker method" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✅ PostgreSQL client found: $($psqlVersion.Split(' ')[2])" -ForegroundColor Green
} catch {
    Write-Host "❌ PostgreSQL client (psql) not available" -ForegroundColor Red
    exit 1
}

# Confirm reset unless forced
if (-not $Force) {
    Write-Host ""
    Write-Host "⚠️  WARNING: This will completely reset your database!" -ForegroundColor Yellow
    Write-Host "   • All data will be permanently lost" -ForegroundColor Red
    Write-Host "   • All tables, indexes, and schemas will be recreated" -ForegroundColor Red
    Write-Host "   • This action cannot be undone" -ForegroundColor Red
    Write-Host ""
    
    $confirm = Read-Host "Type 'RESET' to confirm database reset"
    if ($confirm -ne "RESET") {
        Write-Host "❌ Database reset cancelled" -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host "🗑️  Resetting database..." -ForegroundColor Yellow

# Method 1: SQL Script Reset (Preferred)
try {
    Write-Host "📄 Executing database reset script..." -ForegroundColor Blue
    
    $env:PGPASSWORD = "Buvan@1068"
    psql -h $Host -p $Port -U $User -d $Database -f "scripts/reset-database.sql"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database reset completed successfully!" -ForegroundColor Green
    } else {
        throw "SQL script execution failed"
    }
} catch {
    Write-Host "❌ SQL script method failed, trying alternative method..." -ForegroundColor Yellow
    
    # Method 2: Direct SQL Commands
    try {
        Write-Host "🔄 Trying direct SQL reset..." -ForegroundColor Blue
        
        $resetCommands = @(
            "DROP SCHEMA public CASCADE;",
            "CREATE SCHEMA public;",
            "GRANT ALL ON SCHEMA public TO postgres;",
            "GRANT ALL ON SCHEMA public TO public;",
            "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
        )
        
        foreach ($command in $resetCommands) {
            $env:PGPASSWORD = "Buvan@1068"
            echo $command | psql -h $Host -p $Port -U $User -d $Database
        }
        
        Write-Host "✅ Direct SQL reset completed!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Both reset methods failed" -ForegroundColor Red
        Write-Host "💡 Try the Docker method instead" -ForegroundColor Yellow
        exit 1
    }
}

# Method 3: Docker Reset (Alternative)
function Reset-DatabaseDocker {
    Write-Host "🐳 Resetting database via Docker..." -ForegroundColor Blue
    
    try {
        # Stop and remove existing containers
        docker-compose -f docker-compose.dev.yml down -v 2>$null
        
        # Remove database volume
        docker volume rm stunxtv2_postgres_data 2>$null
        
        # Start fresh database
        docker-compose -f docker-compose.dev.yml up -d postgres
        
        # Wait for database to be ready
        Write-Host "⏳ Waiting for database to be ready..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        
        # Test connection
        $testResult = docker exec stunxt-postgres pg_isready -U postgres 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Docker database reset completed!" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Docker database not ready" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Docker reset failed: $_" -ForegroundColor Red
        return $false
    }
}

# Verify database is ready
Write-Host ""
Write-Host "🧪 Testing database connection..." -ForegroundColor Yellow

try {
    $env:PGPASSWORD = "Buvan@1068"
    $testQuery = "SELECT version();"
    echo $testQuery | psql -h $Host -p $Port -U $User -d $Database -t
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database connection successful!" -ForegroundColor Green
    } else {
        Write-Host "❌ Database connection failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Could not verify database connection" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Database Reset Complete!" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Start your NestJS application: npm run start:dev" -ForegroundColor White
Write-Host "  2. TypeORM will automatically create fresh schema" -ForegroundColor White
Write-Host "  3. Run tests to verify everything works: npm run test" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Database Configuration:" -ForegroundColor Cyan
Write-Host "  • Host: $Host" -ForegroundColor White
Write-Host "  • Port: $Port" -ForegroundColor White
Write-Host "  • Database: $Database" -ForegroundColor White
Write-Host "  • User: $User" -ForegroundColor White
Write-Host ""
Write-Host "Ready for development! 🚀" -ForegroundColor Green
