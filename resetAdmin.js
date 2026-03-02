const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetAdmin() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'op',
        password: process.env.DB_PASSWORD || '426842',
        database: process.env.DB_NAME || 'dynamic_online_exam',
    });

    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123';
    const adminName = 'System Admin';

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    console.log('Generated hash:', hashedPassword);

    // Check if admin exists
    const [rows] = await connection.query('SELECT id FROM users WHERE email = ?', [adminEmail]);

    if (rows.length > 0) {
        // Update existing admin password
        await connection.query('UPDATE users SET password = ?, role = ? WHERE email = ?', [hashedPassword, 'admin', adminEmail]);
        console.log(`✅ Admin password updated for ${adminEmail}`);
    } else {
        // Insert new admin
        await connection.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [adminName, adminEmail, hashedPassword, 'admin']
        );
        console.log(`✅ Admin user created: ${adminEmail}`);
    }

    console.log(`\n--- Admin Credentials ---`);
    console.log(`Email:    ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`-------------------------`);

    await connection.end();
}

resetAdmin().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
