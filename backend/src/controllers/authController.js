const { validationResult } = require('express-validator');
const authService = require('../services/authService');

const register = async (req, res) => {
    // Sunucu tarafı girdi doğrulama kontrolü
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Gecersiz girdi verileri.', errors: errors.array() });
    }

    try {
        const { full_name, email, password } = req.body;
        const newUser = await authService.registerUser(full_name, email, password);
        res.status(201).json({
            message: 'Kullanici basariyla olusturuldu.',
            user: newUser
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || 'Sunucu hatasi.' });
    }
};

const login = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Gecersiz girdi verileri.', errors: errors.array() });
    }

    try {
        const { email, password } = req.body;
        const result = await authService.loginUser(email, password);
        res.status(200).json({
            message: 'Giris basarili.',
            ...result
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || 'Sunucu hatasi.' });
    }
};

module.exports = { register, login };