const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Rotalar
app.use('/api/auth', authRoutes);

// Sağlık kontrolü uç noktası
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.status(200).json({ status: 'OK', message: 'API ve MySQL baglantisi aktif.' });
    } catch (error) {
        res.status(500).json({ status: 'ERROR', message: 'Veritabani baglanti hatasi.', error: error.message });
    }
});

module.exports = app;