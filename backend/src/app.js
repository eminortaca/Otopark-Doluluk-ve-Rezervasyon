const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

const app = express();

// Middleware'ler
app.use(cors());
app.use(express.json());

// Sağlık kontrolü ve Veritabanı bağlantı testi uç noktası
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.status(200).json({ status: 'OK', message: 'API ve MySQL baglantisi aktif.' });
    } catch (error) {
        res.status(500).json({ status: 'ERROR', message: 'Veritabani baglanti hatasi.', error: error.message });
    }
});

module.exports = app;