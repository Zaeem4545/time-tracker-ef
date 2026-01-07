# Quick diagnostic script to check database configuration (PowerShell)

Write-Host "=== Checking Backend Container Environment ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Backend DB Environment Variables:" -ForegroundColor Yellow
docker exec time-tracking-backend env | Select-String -Pattern "^DB_"
Write-Host ""

Write-Host "Backend NODE_ENV:" -ForegroundColor Yellow
docker exec time-tracking-backend env | Select-String -Pattern "NODE_ENV"
Write-Host ""

Write-Host "=== Checking Database Container ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Database users that exist:" -ForegroundColor Yellow
$rootPassword = if ($env:MYSQL_ROOT_PASSWORD) { $env:MYSQL_ROOT_PASSWORD } else { "rootpassword" }
docker exec time-tracking-db mysql -u root -p$rootPassword -e "SELECT User, Host FROM mysql.user WHERE User IN ('root', 'tt_user');" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Could not connect to database" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Checking Backend Logs ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Database configuration from backend logs:" -ForegroundColor Yellow
docker logs time-tracking-backend 2>&1 | Select-String -Pattern "Database configuration" -Context 0,10 | Select-Object -First 15
Write-Host ""

Write-Host "=== Recommendations ===" -ForegroundColor Cyan
Write-Host ""

$backendEnv = docker exec time-tracking-backend env 2>&1
$dbUserLine = $backendEnv | Select-String -Pattern "^DB_USER="
$dbUser = if ($dbUserLine) { ($dbUserLine -split '=')[1] } else { $null }

if ($dbUser -eq "root") {
    Write-Host "❌ PROBLEM: Backend is using DB_USER=root" -ForegroundColor Red
    Write-Host "   Solution: Set DB_USER=tt_user in your .env file or docker-compose.yml" -ForegroundColor Yellow
    Write-Host "   Or remove DB_USER from .env to use docker-compose default" -ForegroundColor Yellow
} elseif ($dbUser -eq "tt_user" -or -not $dbUser) {
    Write-Host "✅ Backend DB_USER looks correct (using: $($dbUser ?? 'tt_user from default'))" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend is using DB_USER=$dbUser" -ForegroundColor Yellow
    Write-Host "   Make sure this user exists in the database and has proper permissions" -ForegroundColor Yellow
}

