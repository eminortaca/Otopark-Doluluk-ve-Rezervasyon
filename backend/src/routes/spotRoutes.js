const express = require('express');
const { body } = require('express-validator');
const spotController = require('../controllers/spotController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

// Ekleme ve Güncelleme için ortak doğrulama kuralları
const spotValidationRules = [
    body('spot_code')
        .trim()
        .notEmpty().withMessage('Park yeri kodu (spot_code) zorunludur.')
        .isLength({ max: 20 }).withMessage('Park yeri kodu en fazla 20 karakter olabilir.')
        .escape(),
    body('floor')
        .isInt({ min: -5, max: 20 }).withMessage('Kat bilgisi gecerli bir tam sayi olmalidir (-5 ile 20 arasi).'),
    body('spot_type')
        .isIn(['standart', 'elektrikli', 'engelli']).withMessage('Gecersiz park yeri tipi.'),
    body('hourly_rate')
        .isFloat({ min: 0 }).withMessage('Saatlik ucret 0 veya daha buyuk bir sayi olmalidir.'),
    body('is_active')
        .optional()
        .isBoolean().withMessage('Aktiflik durumu boolean (true/false) olmalidir.')
];

// GET /api/spots (Arama, Filtreleme ve Sayfalama destekli liste)
router.get('/', spotController.getSpots);

// GET /api/spots/:id (Tekil park yeri detayı ve aktif rezervasyonları)
router.get('/:id', spotController.getSpotDetail);

// POST /api/spots (Sadece Admin ekleyebilir -> 401 ve 403 kontrolü)
router.post(
    '/',
    authenticateToken,
    authorizeRoles('admin'),
    spotValidationRules,
    spotController.createSpot
);

// PUT /api/spots/:id (Sadece Admin güncelleyebilir -> 401, 403 ve 404 kontrolü)
router.put(
    '/:id',
    authenticateToken,
    authorizeRoles('admin'),
    spotValidationRules,
    spotController.updateSpot
);

module.exports = router;