#!/bin/bash

echo "🚀 Setting up StuntX Notification Service..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node --version)"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy environment file
if [ ! -f .env ]; then
    echo "📋 Creating environment file..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your API keys and configuration"
fi

# Check if Docker is available
if command -v docker &> /dev/null; then
    echo "🐳 Docker detected. You can use 'docker-compose up' to start with databases."
else
    echo "⚠️  Docker not found. Please install MySQL and Redis manually or install Docker."
fi

echo ""
echo "✅ Setup complete! Next steps:"
echo ""
echo "1. Update .env file with your API keys:"
echo "   - BREVO_API_KEY (for email)"
echo "   - FIREBASE_CONFIG (for push notifications)"
echo "   - TWILIO_* keys (for SMS)"
echo ""
echo "2. Start the databases:"
echo "   docker-compose up mysql redis -d"
echo ""
echo "3. Start the development server:"
echo "   npm run start:dev"
echo ""
echo "4. Access the API documentation:"
echo "   http://localhost:3001/api/docs"
echo ""
