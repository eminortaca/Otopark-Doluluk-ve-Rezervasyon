const path = require('path');
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const { swaggerUi, swaggerDocument } = require('./config/swagger');

const authRoutes = require('./routes/authRoutes');
const spotRoutes = require('./routes/spotRoutes');
const reservationRoutes = require('./routes/reservationRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Frontend statik dosyalarını sun
app.use(express.static(path.join(__dirname, '../../frontend')));

// Ek Özellik: Swagger (OpenAPI) Canlı Dokümantasyon Rotası
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API Rotaları
app.use('/api/auth', authRoutes);
app.use('/api/spots', spotRoutes);
app.use('/api/reservations', reservationRoutes);

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