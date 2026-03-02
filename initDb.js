const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDB() {
    try {
        // Connect without database selected first
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'op',
            password: process.env.DB_PASSWORD || '426842',
            multipleStatements: true
        });

        console.log('Connected to MySQL. Initializing database...');
        const sqlScript = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf-8');

        await connection.query(sqlScript);
        console.log('Database initialized successfully from database.sql');
        await connection.end();
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

initDB();
