#!/bin/bash
# Quick diagnostic script to check database configuration

echo "=== Checking Backend Container Environment ==="
echo ""
echo "Backend DB Environment Variables:"
docker exec time-tracking-backend env | grep -E "^DB_" | sort
echo ""

echo "Backend NODE_ENV:"
docker exec time-tracking-backend env | grep NODE_ENV
echo ""

echo "=== Checking Database Container ==="
echo ""
echo "Database users that exist:"
docker exec time-tracking-db mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} -e "SELECT User, Host FROM mysql.user WHERE User IN ('root', 'tt_user');" 2>/dev/null || echo "Could not connect to database"
echo ""

echo "=== Checking Backend Logs ==="
echo ""
echo "Database configuration from backend logs:"
docker logs time-tracking-backend 2>&1 | grep -A 10 "Database configuration" | head -15
echo ""

echo "=== Recommendations ==="
echo ""
BACKEND_DB_USER=$(docker exec time-tracking-backend env | grep "^DB_USER=" | cut -d= -f2)
if [ "$BACKEND_DB_USER" = "root" ]; then
    echo "❌ PROBLEM: Backend is using DB_USER=root"
    echo "   Solution: Set DB_USER=tt_user in your .env file or docker-compose.yml"
    echo "   Or remove DB_USER from .env to use docker-compose default"
elif [ "$BACKEND_DB_USER" = "tt_user" ] || [ -z "$BACKEND_DB_USER" ]; then
    echo "✅ Backend DB_USER looks correct (using: ${BACKEND_DB_USER:-tt_user from default})"
else
    echo "⚠️  Backend is using DB_USER=$BACKEND_DB_USER"
    echo "   Make sure this user exists in the database and has proper permissions"
fi

