@echo off
echo Attempting to fix database schema (Allocated Time, Custom Fields, Customers, etc.)...
docker exec -i time-tracking-db mysql -u root -prootpassword time_tracking < backend/database/fix_schema.sql
if %errorlevel% neq 0 (
    echo Failed to execute fix via Docker. Please ensure Docker is running and the container 'time-tracking-db' is up.
    exit /b %errorlevel%
)
echo.
echo ===================================================
echo Database schema repair applied successfully!
echo You can now create projects.
echo ===================================================
pause
