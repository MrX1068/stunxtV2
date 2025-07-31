# File Service Test Runner
# Comprehensive testing script for the file service

param(
    [string]$ServiceUrl = "http://localhost:3001",
    [switch]$SkipVirusTests,
    [switch]$Verbose,
    [switch]$InstallDeps
)

$ErrorActionPreference = "Stop"

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green" 
    Yellow = "Yellow"
    Blue = "Blue"
    Cyan = "Cyan"
    Magenta = "Magenta"
}

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White",
        [switch]$NoNewline
    )
    
    if ($NoNewline) {
        Write-Host $Message -ForegroundColor $Color -NoNewline
    } else {
        Write-Host $Message -ForegroundColor $Color
    }
}

function Write-TestHeader {
    param([string]$Title)
    
    Write-ColorOutput "`n=== $Title ===" -Color $Colors.Cyan
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✅ $Message" -Color $Colors.Green
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "❌ $Message" -Color $Colors.Red
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠️  $Message" -Color $Colors.Yellow
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "ℹ️  $Message" -Color $Colors.Blue
}

# Check prerequisites
function Test-Prerequisites {
    Write-TestHeader "Checking Prerequisites"
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-Success "Node.js found: $nodeVersion"
    } catch {
        Write-Error "Node.js not found. Please install Node.js."
        exit 1
    }
    
    # Check npm
    try {
        $npmVersion = npm --version
        Write-Success "npm found: $npmVersion"
    } catch {
        Write-Error "npm not found. Please install npm."
        exit 1
    }
    
    # Check if we're in the right directory
    if (!(Test-Path "test-file-service.js")) {
        Write-Error "test-file-service.js not found. Please run from file-service directory."
        exit 1
    }
    
    Write-Success "All prerequisites met"
}

# Install dependencies if needed
function Install-Dependencies {
    Write-TestHeader "Installing Dependencies"
    
    # Check if node_modules exists and has required packages
    $needsInstall = $false
    
    if (!(Test-Path "node_modules")) {
        $needsInstall = $true
        Write-Info "node_modules not found"
    } else {
        # Check for required packages
        $requiredPackages = @("axios", "form-data")
        foreach ($package in $requiredPackages) {
            if (!(Test-Path "node_modules/$package")) {
                $needsInstall = $true
                Write-Info "Missing package: $package"
                break
            }
        }
    }
    
    if ($needsInstall -or $InstallDeps) {
        Write-Info "Installing required packages..."
        try {
            npm install axios form-data --save-dev
            Write-Success "Dependencies installed successfully"
        } catch {
            Write-Error "Failed to install dependencies: $_"
            exit 1
        }
    } else {
        Write-Success "Dependencies already installed"
    }
}

# Test service connectivity
function Test-ServiceConnectivity {
    Write-TestHeader "Testing Service Connectivity"
    
    try {
        $response = Invoke-RestMethod -Uri "$ServiceUrl/health" -Method Get -TimeoutSec 10
        Write-Success "Service is responding"
        
        if ($Verbose) {
            Write-Info "Service info:"
            $response | ConvertTo-Json -Depth 3 | Write-Host
        }
        
        return $true
    } catch {
        Write-Error "Service not responding at $ServiceUrl"
        Write-Info "Error: $($_.Exception.Message)"
        return $false
    }
}

# Test virus scanner availability
function Test-VirusScannerAvailability {
    Write-TestHeader "Checking Virus Scanner"
    
    try {
        $response = Invoke-RestMethod -Uri "$ServiceUrl/health/virus-scanner" -Method Get -TimeoutSec 10
        
        if ($response.enabled) {
            if ($response.status -eq "available") {
                Write-Success "Virus scanner is enabled and available"
                if ($response.version) {
                    Write-Info "Version: $($response.version)"
                }
            } else {
                Write-Warning "Virus scanner is enabled but not available"
                Write-Info "Status: $($response.status)"
            }
        } else {
            Write-Info "Virus scanner is disabled"
        }
        
        if ($Verbose) {
            Write-Info "Scanner configuration:"
            $response.configuration | ConvertTo-Json -Depth 2 | Write-Host
        }
        
        return $response
    } catch {
        Write-Warning "Could not check virus scanner status: $($_.Exception.Message)"
        return $null
    }
}

# Run the main test suite
function Start-FileServiceTests {
    Write-TestHeader "Running File Service Tests"
    
    $env:FILE_SERVICE_URL = $ServiceUrl
    
    try {
        Write-Info "Starting comprehensive test suite..."
        $result = node test-file-service.js
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "All tests passed!"
            return $true
        } else {
            Write-Error "Some tests failed"
            return $false
        }
    } catch {
        Write-Error "Test execution failed: $_"
        return $false
    }
}

# Performance benchmarks
function Start-PerformanceBenchmark {
    Write-TestHeader "Performance Benchmark"
    
    # Create a larger test file for performance testing
    $testFile = "performance-test.bin"
    $fileSize = 10 * 1024 * 1024  # 10MB
    
    try {
        Write-Info "Creating $fileSize byte test file..."
        $bytes = New-Object byte[] $fileSize
        (New-Object Random).NextBytes($bytes)
        [System.IO.File]::WriteAllBytes($testFile, $bytes)
        
        Write-Info "Testing upload performance..."
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        # PowerShell way to upload file
        $boundary = [System.Guid]::NewGuid().ToString()
        $headers = @{
            "Content-Type" = "multipart/form-data; boundary=$boundary"
        }
        
        $bodyLines = @(
            "--$boundary",
            "Content-Disposition: form-data; name=`"file`"; filename=`"$testFile`"",
            "Content-Type: application/octet-stream",
            "",
            [System.IO.File]::ReadAllText($testFile),
            "",
            "--$boundary",
            "Content-Disposition: form-data; name=`"privacy`"",
            "",
            "public",
            "",
            "--$boundary",
            "Content-Disposition: form-data; name=`"category`"",
            "",
            "performance-test",
            "",
            "--$boundary--"
        )
        
        $body = $bodyLines -join "`r`n"
        
        try {
            $response = Invoke-RestMethod -Uri "$ServiceUrl/upload" -Method Post -Body $body -Headers $headers -TimeoutSec 60
            $stopwatch.Stop()
            
            $throughputMBps = ($fileSize / 1024 / 1024) / ($stopwatch.ElapsedMilliseconds / 1000)
            
            Write-Success "Performance test completed"
            Write-Info "File size: $([math]::Round($fileSize / 1024 / 1024, 2)) MB"
            Write-Info "Upload time: $($stopwatch.ElapsedMilliseconds) ms"
            Write-Info "Throughput: $([math]::Round($throughputMBps, 2)) MB/s"
            
        } catch {
            Write-Warning "Performance test failed (this is expected if service is not running): $($_.Exception.Message)"
        }
        
    } finally {
        # Cleanup
        if (Test-Path $testFile) {
            Remove-Item $testFile -Force
        }
    }
}

# Service status check
function Get-ServiceStatus {
    Write-TestHeader "Service Status Overview"
    
    try {
        $health = Invoke-RestMethod -Uri "$ServiceUrl/health" -Method Get -TimeoutSec 5
        $virusScanner = Invoke-RestMethod -Uri "$ServiceUrl/health/virus-scanner" -Method Get -TimeoutSec 5
        
        Write-Success "Service Status: Healthy"
        Write-Info "Environment: $($health.environment)"
        Write-Info "Version: $($health.version)"
        Write-Info "Timestamp: $($health.timestamp)"
        
        Write-Host "`nFeature Status:" -ForegroundColor $Colors.Cyan
        Write-Host "  Virus Scanning: $(if($virusScanner.enabled) { '✅ Enabled' } else { '❌ Disabled' })"
        Write-Host "  Cloudinary: $(if($health.features.storageProviders.cloudinary) { '✅ Enabled' } else { '❌ Disabled' })"
        Write-Host "  AWS S3: $(if($health.features.storageProviders.awsS3) { '✅ Enabled' } else { '❌ Disabled' })"
        
        if ($virusScanner.enabled -and $virusScanner.version) {
            Write-Info "Virus Scanner Version: $($virusScanner.version)"
        }
        
    } catch {
        Write-Error "Could not retrieve service status: $($_.Exception.Message)"
    }
}

# Main execution
function Main {
    Write-ColorOutput "`n🧪 File Service Test Runner" -Color $Colors.Magenta
    Write-ColorOutput "============================`n" -Color $Colors.Magenta
    
    Test-Prerequisites
    Install-Dependencies
    
    Write-Info "Target Service URL: $ServiceUrl"
    
    $serviceAvailable = Test-ServiceConnectivity
    
    if (!$serviceAvailable) {
        Write-Error "Cannot proceed without service connectivity"
        Write-Info "Please ensure the file service is running at $ServiceUrl"
        exit 1
    }
    
    Get-ServiceStatus
    
    if (!$SkipVirusTests) {
        Test-VirusScannerAvailability
    }
    
    # Run main test suite
    $testsPassed = Start-FileServiceTests
    
    # Run performance benchmark
    Start-PerformanceBenchmark
    
    # Final summary
    Write-TestHeader "Test Summary"
    
    if ($testsPassed) {
        Write-Success "File service testing completed successfully!"
        Write-Info "All core functionality is working as expected."
    } else {
        Write-Error "Some tests failed. Please check the output above."
        exit 1
    }
}

# Handle Ctrl+C gracefully
$null = Register-EngineEvent -SourceIdentifier 'PowerShell.Exiting' -Action {
    Write-ColorOutput "`n🧹 Cleaning up..." -Color $Colors.Yellow
}

# Run main function
Main
