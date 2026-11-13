const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/register
router.post(
    '/register',
    [
        body('full_name')
            .trim()
            .notEmpty().withMessage('Ad soyad alani zorunludur.')
            .isLength({ min: 3, max: 100 }).withMessage('Ad soyad 3-100 karakter arasinda olmalidir.')
            .escape(), // XSS koruması için HTML karakterlerini kodlar
        body('email')
            .trim()
            .isEmail().withMessage('Gecerli bir e-posta adresi giriniz.')
            .normalizeEmail(),
        body('password')
            .isLength({ min: 6 }).withMessage('Sifre en az 6 karakter olmalidir.')
    ],
    authController.register
);

// POST /api/auth/login
router.post(
    '/login',
    [
        body('email').trim().isEmail().withMessage('Gecerli bir e-posta adresi giriniz.'),
        body('password').notEmpty().withMessage('Sifre alani bos birakilamaz.')
    ],
    authController.login
);

module.exports = router;