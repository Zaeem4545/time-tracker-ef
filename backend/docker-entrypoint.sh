#!/bin/sh
set -e

echo "🔧 Running DB migration scripts (if any)"
cd /app || exit 0

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
