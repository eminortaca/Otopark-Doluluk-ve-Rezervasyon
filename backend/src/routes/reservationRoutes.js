const express = require('express');
const { body } = require('express-validator');
const reservationController = require('../controllers/reservationController');
const { authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// Tüm rezervasyon işlemleri için giriş yapmış olmak (JWT) zorunludur
router.use(authenticateToken);

// GET /api/reservations (Kullanıcının kendi rezervasyonları / Admin için tümü)
router.get('/', reservationController.getReservations);

// POST /api/reservations (Yeni rezervasyon oluşturma)
router.post(
    '/',
    [
        body('spot_id')
            .isInt({ min: 1 }).withMessage('Gecerli bir park yeri secilmelidir.'),
        body('plate_number')
            .trim()
            .notEmpty().withMessage('Arac plakasi zorunludur.')
            .isLength({ min: 5, max: 15 }).withMessage('Plaka 5-15 karakter arasinda olmalidir.')
            .escape(), // XSS koruması
        body('start_time')
            .notEmpty().withMessage('Baslangic zamani zorunludur.')
            .isISO8601().withMessage('Baslangic zamani gecerli bir tarih formatinda (YYYY-MM-DD HH:mm) olmalidir.'),
        body('end_time')
            .notEmpty().withMessage('Bitis zamani zorunludur.')
            .isISO8601().withMessage('Bitis zamani gecerli bir tarih formatinda (YYYY-MM-DD HH:mm) olmalidir.')
    ],
    reservationController.createReservation
);

// DELETE /api/reservations/:id (Rezervasyon iptali / silme -> 204 No Content)
router.delete('/:id', reservationController.deleteReservation);

module.exports = router;