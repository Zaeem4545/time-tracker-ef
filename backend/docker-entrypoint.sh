#!/bin/sh
set -e

echo "🔧 Fixing database user permissions (if needed)"
cd /app || exit 0

# Run fix script to ensure database user exists with correct permissions
if [ -f scripts/fix-db-user.js ]; then
  echo "-> Running database user fix script..."
  node scripts/fix-db-user.js || echo "⚠️  Fix script failed or user already exists, continuing..."
else
  echo "⚠️  Fix script not found, skipping..."
fi

echo "🔧 Running DB migration scripts (if any)"

if [ -d database ]; then
  for f in database/*.js; do
    case "$(basename "$f")" in
      init-db.js|add_*.js|add-*.js|run_*.js|run-*.js)
        echo "-> Running $f"
        node "$f" || echo "script $f exited with non-zero status, continuing"
        ;;
      *)
        # skip other files
        ;;
    esac
  done
fi

echo "🔁 Starting backend server"
exec node server.js
