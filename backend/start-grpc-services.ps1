# gRPC File Service Test Script

Write-Host "🚀 Starting gRPC File Service Test" -ForegroundColor Cyan

# Start file service (gRPC server)
Write-Host "`n📡 Starting File Service (gRPC Server)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-Command", "cd 'd:\Office Works\stunxtV2\backend\services\file-service'; npm run start:dev" -WindowStyle Normal

# Wait for file service to start
Write-Host "⏳ Waiting for file service to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Start main backend (gRPC client)
Write-Host "`n🌐 Starting Main Backend (gRPC Client)..." -ForegroundColor Yellow  
Start-Process powershell -ArgumentList "-Command", "cd 'd:\Office Works\stunxtV2\backend'; npm run start:dev" -WindowStyle Normal

# Wait for main backend to start
Write-Host "⏳ Waiting for main backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host "`n✅ Services should be starting up!" -ForegroundColor Green
Write-Host "📡 File Service (gRPC): localhost:50051" -ForegroundColor Cyan
Write-Host "🌐 Main Backend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🗂️  File Service HTTP: http://localhost:3003" -ForegroundColor Cyan

Write-Host "`n🧪 Test Commands:" -ForegroundColor Magenta
Write-Host "# Test gRPC file upload via main backend:" -ForegroundColor Gray
Write-Host 'curl -X POST http://localhost:3000/api/users/me/avatar -F "avatar=@test.jpg" -H "Authorization: Bearer $TOKEN"' -ForegroundColor Gray

Write-Host "`n# Check file service health:" -ForegroundColor Gray  
Write-Host 'curl http://localhost:3003/health' -ForegroundColor Gray

Write-Host "`n# Check main backend health:" -ForegroundColor Gray
Write-Host 'curl http://localhost:3000/api/health' -ForegroundColor Gray

Write-Host "`n🔧 Troubleshooting:" -ForegroundColor Yellow
Write-Host "- Check if both services are running in separate PowerShell windows" -ForegroundColor Gray
Write-Host "- File service should show 'gRPC File Service started on 0.0.0.0:50051'" -ForegroundColor Gray  
Write-Host "- Main backend should show 'gRPC File Client connected to localhost:50051'" -ForegroundColor Gray
Write-Host "- If connection fails, check firewall and port availability" -ForegroundColor Gray

Write-Host "`n🎯 Ready for testing!" -ForegroundColor Green
