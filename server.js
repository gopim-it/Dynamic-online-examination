const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const authRoutes = require('./backend/routes/auth');
const examRoutes = require('./backend/routes/exams');
const resultRoutes = require('./backend/routes/results');
const db = require('./backend/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static frontend files

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/results', resultRoutes);

// TEMPORARY: Reset admin account - visit http://localhost:3000/api/setup-admin once, then remove this
app.get('/api/setup-admin', async (req, res) => {
    try {
        const hash = await bcrypt.hash('admin123', 10);
        const [rows] = await db.query('SELECT id FROM users WHERE email = ?', ['admin@example.com']);
        if (rows.length > 0) {
            await db.query('UPDATE users SET password = ?, role = ? WHERE email = ?', [hash, 'admin', 'admin@example.com']);
            res.json({ success: true, message: 'Admin password reset to admin123', email: 'admin@example.com' });
        } else {
            await db.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                ['System Admin', 'admin@example.com', hash, 'admin']);
            res.json({ success: true, message: 'Admin user created with password admin123', email: 'admin@example.com' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
