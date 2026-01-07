const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth.routes');
const projectsRoutes = require('./routes/projects.routes');
const usersRoutes = require('./routes/users.routes');
const tasksRoutes = require('./routes/tasks.routes');
const timeRoutes = require('./routes/time.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const customersRoutes = require('./routes/customers.routes');
const uploadRoutes = require('./routes/upload.routes');
const historyRoutes = require('./routes/history.routes');
const db = require('./config/db'); // your database config
const config = require('./config/config'); // Configuration

const app = express();
const PORT = config.port;

// ✅ Middleware - CORS configuration from config
if (config.isProduction) {
  console.log('🔹 CORS Configuration:');
  console.log('  Allowed Origins:', config.cors.allowedOrigins.length > 0 ? config.cors.allowedOrigins.length + ' origin(s)' : 'None (set FRONTEND_URL!)');
  if (config.cors.fqdn) {
    console.log('  FQDN:', config.cors.fqdn);
  } else {
    console.warn('  ⚠️  FRONTEND_URL not set - CORS may be too restrictive!');
  }
} else {
  console.log('🔹 CORS Configuration:');
  console.log('  Allowed Origins:', config.cors.allowedOrigins);
  console.log('  FQDN:', config.cors.fqdn || 'Not set');
}

// CORS with origin validation function
app.use(cors({ 
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check exact matches
    if (config.cors.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Check regex patterns
    for (const pattern of config.cors.regexPatterns) {
      if (pattern.test(origin)) {
        return callback(null, true);
      }
    }
    
    // Reject origin with helpful error message
    console.warn(`⚠️  CORS blocked origin: ${origin}`);
    console.warn(`   Allowed origins: ${config.cors.allowedOrigins.join(', ')}`);
    console.warn(`   Set FRONTEND_URL or CORS_ORIGINS environment variable to allow this origin`);
    callback(new Error(`Not allowed by CORS. Origin: ${origin}. Set FRONTEND_URL or CORS_ORIGINS environment variable.`));
  }
})); // allow Angular frontend
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files

// 🔹 Register routes with error handling
try {
  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectsRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/tasks', tasksRoutes);
  app.use('/api/time-entries', timeRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/customers', customersRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/history', historyRoutes);
  
  console.log('✅ Routes registered successfully:');
  console.log('  POST /api/users - Create user');
  console.log('  GET /api/users - Get all users');
  console.log('  PUT /api/users/:id/role - Update user role');
  console.log('  DELETE /api/users/:id - Delete user');
} catch (error) {
  console.error('❌ Error registering routes:', error);
  process.exit(1);
}

// 🔹 Test routes
app.get('/', (req, res) => {
  res.send('Backend is running');
});

// Test route to verify server is working
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working', timestamp: new Date().toISOString() });
});

// 404 handler for debugging (must be last)
app.use((req, res, next) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: `Route not found: ${req.method} ${req.url}`, availableRoutes: ['/api/users', '/api/projects', '/api/tasks'] });
});

// 🔹 Test database connection with retry logic
let dbConnectionRetries = 0;
const maxDbRetries = 5;
const dbRetryDelay = 2000; // 2 seconds

function testDatabaseConnection() {
  return db.getConnection()
    .then(conn => {
      console.log('✅ Database connected successfully');
      conn.release(); // return connection to pool
      dbConnectionRetries = 0; // Reset retry counter on success
    })
    .catch(err => {
      dbConnectionRetries++;
      console.error(`❌ Database connection failed (attempt ${dbConnectionRetries}/${maxDbRetries}):`, err.message);
      
      // Provide helpful error messages
      if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('   🔍 Access denied - Possible causes:');
        console.error('      1. Password mismatch between DB_PASSWORD and MYSQL_PASSWORD');
        console.error('      2. User does not exist or has wrong permissions');
        console.error('      3. Database volume was created with different credentials');
        console.error('');
        console.error('   💡 Solutions:');
        console.error('      Option A: Run fix script: docker exec time-tracking-backend node /app/scripts/fix-db-user.js');
        console.error('      Option B: Reset database volume: docker-compose down -v && docker-compose up -d');
        console.error('      Option C: Ensure DB_PASSWORD matches MYSQL_PASSWORD in your .env or docker-compose.yml');
      } else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        console.error('   🔍 Connection refused - Database might not be ready yet');
        console.error('      Wait a few seconds for the database to start...');
      }
      
      if (dbConnectionRetries < maxDbRetries) {
        console.log(`   Retrying in ${dbRetryDelay / 1000} seconds...`);
        setTimeout(testDatabaseConnection, dbRetryDelay);
      } else {
        console.error('❌ Failed to connect to database after multiple attempts.');
        console.error('   Please check your database configuration and ensure the database is running.');
        if (config.isProduction) {
          console.error('   The server will continue to run, but database operations will fail.');
        } else {
          console.error('   Exiting...');
          process.exit(1);
        }
      }
    });
}

// Start connection test
testDatabaseConnection();

// 🔹 Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Environment: ${config.nodeEnv}`);
  if (config.cors.fqdn) {
    console.log(`🌐 CORS enabled for: ${config.cors.fqdn}`);
  } else if (config.isProduction) {
    console.warn(`⚠️  CORS: FRONTEND_URL not set - only localhost and private IPs allowed`);
  } else {
    console.log(`🌐 CORS enabled for: localhost`);
  }
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    // Close database pool
    // The db module exports pool.promise() with underlying pool attached
    if (db && db.pool && typeof db.pool.end === 'function') {
      db.pool.end((err) => {
        if (err) {
          console.error('❌ Error closing database connections:', err);
          process.exit(1);
        } else {
          console.log('✅ Database connections closed');
          process.exit(0);
        }
      });
    } else {
      // If pool is not available, just exit
      console.log('✅ Shutting down (database pool will close automatically)');
      process.exit(0);
    }
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejection in production, just log it
  if (!config.isProduction) {
    gracefulShutdown('unhandledRejection');
  }
});
