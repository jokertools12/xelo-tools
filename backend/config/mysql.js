const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Create connection pool with error handling
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '181.215.205.3',
  user: process.env.MYSQL_USER || 'pihrfidr_userjokertools',
  password: process.env.MYSQL_PASSWORD || '##@JokerTools261197##@',
  database: process.env.MYSQL_DATABASE || 'pihrfidr_jokertools',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

// Add connection verification
pool.getConnection()
  .then(connection => {
    console.log('MySQL Connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('MySQL connection error:', err);
  });

module.exports = pool;