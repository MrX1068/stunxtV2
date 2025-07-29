# StuntX Notification Service Setup Script

Write-Host "🚀 Setting up StuntX Notification Service..." -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
    
    # Check version
    $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($versionNumber -lt 18) {
        Write-Host "❌ Node.js version 18+ is required. Current version: $nodeVersion" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Copy environment file
if (-not (Test-Path ".env")) {
    Write-Host "📋 Creating environment file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "⚠️  Please update .env file with your API keys and configuration" -ForegroundColor Yellow
}

# Check if Docker is available
try {
    docker --version | Out-Null
    Write-Host "🐳 Docker detected. You can use 'docker-compose up' to start with databases." -ForegroundColor Green
} catch {
    Write-Host "⚠️  Docker not found. Please install MySQL and Redis manually or install Docker." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Setup complete! Next steps:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Update .env file with your API keys:" -ForegroundColor Cyan
Write-Host "   - BREVO_API_KEY (for email)" -ForegroundColor White
Write-Host "   - FIREBASE_CONFIG (for push notifications)" -ForegroundColor White
Write-Host "   - TWILIO_* keys (for SMS)" -ForegroundColor White
Write-Host ""
Write-Host "2. Start the databases:" -ForegroundColor Cyan
Write-Host "   docker-compose up mysql redis -d" -ForegroundColor White
Write-Host ""
Write-Host "3. Start the development server:" -ForegroundColor Cyan
Write-Host "   npm run start:dev" -ForegroundColor White
Write-Host ""
Write-Host "4. Access the API documentation:" -ForegroundColor Cyan
Write-Host "   http://localhost:3001/api/docs" -ForegroundColor White
Write-Host ""
