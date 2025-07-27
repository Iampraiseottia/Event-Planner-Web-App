const { Pool } = require('pg');
require('dotenv').config();

// Log the DATABASE_URL to confirm it's being loaded
const databaseUrl = process.env.DATABASE_URL;
console.log('DATABASE_URL from .env.local:', databaseUrl);

let connectionConfig = {};
if (databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    connectionConfig = {
      user: url.username,
      password: url.password,
      host: url.hostname,
      port: url.port,
      database: url.pathname.substring(1),
    };

    if (process.env.NODE_ENV === 'production' || url.searchParams.get('sslmode') === 'require') {
      connectionConfig.ssl = {
        rejectUnauthorized: false 
      };
    }

    console.log('Parsed DB Connection Config:', {
      user: connectionConfig.user ? '***' : 'N/A', 
      host: connectionConfig.host,
      port: connectionConfig.port,
      database: connectionConfig.database,
      ssl: connectionConfig.ssl ? 'enabled' : 'disabled'
    });

  } catch (parseError) {
    console.error('Error parsing DATABASE_URL:', parseError);
    connectionConfig = { connectionString: databaseUrl };
  }
} else {
  console.error('DATABASE_URL is not defined in .env.local or environment variables.');
  process.exit(1);
}


// Create a new PostgreSQL connection pool
const pool = new Pool(connectionConfig);

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Export a query function that uses the pool
module.exports = {
  query: (text, params) => {
    console.log('EXECUTING QUERY:', text, params || '');
    return pool.query(text, params);
  },
};
