# Chkin Local Development Startup Script
# Usage: .\start-local.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== Chkin Local Startup ===" -ForegroundColor Cyan

# Check if Docker is running
Write-Host "`n[1/5] Checking Docker..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "  Docker is running" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Start PostgreSQL
Write-Host "`n[2/5] Starting PostgreSQL..." -ForegroundColor Yellow
docker-compose up db -d

# Wait for PostgreSQL to be healthy
Write-Host "`n[3/5] Waiting for database to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
do {
    $attempt++
    $health = docker-compose ps db --format json 2>$null | ConvertFrom-Json | Select-Object -ExpandProperty Health -ErrorAction SilentlyContinue
    if ($health -eq "healthy") {
        Write-Host "  Database is ready" -ForegroundColor Green
        break
    }
    Write-Host "  Waiting... (attempt $attempt/$maxAttempts)" -ForegroundColor Gray
    Start-Sleep -Seconds 2
} while ($attempt -lt $maxAttempts)

if ($attempt -ge $maxAttempts) {
    Write-Host "  ERROR: Database did not become healthy in time" -ForegroundColor Red
    exit 1
}

# Run Prisma migrations
Write-Host "`n[4/5] Running database migrations..." -ForegroundColor Yellow
npx prisma db push
npx prisma generate
Write-Host "  Migrations complete" -ForegroundColor Green

# Seed database (optional, skip if no seed data)
Write-Host "`n[5/5] Seeding database..." -ForegroundColor Yellow
try {
    npm run seed 2>$null
    Write-Host "  Seeding complete" -ForegroundColor Green
} catch {
    Write-Host "  Skipped (no seed data or seed failed)" -ForegroundColor Gray
}

# Start dev server
Write-Host "`n=== Starting dev server ===" -ForegroundColor Cyan
Write-Host "App will be available at: http://localhost:3000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Gray

npm run dev
