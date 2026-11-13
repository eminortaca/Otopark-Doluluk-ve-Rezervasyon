const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const registerUser = async (fullName, email, password, role = 'user') => {
    // E-posta adresi daha önce alınmış mı kontrol et
    const [existingUsers] = await pool.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
    );

    if (existingUsers.length > 0) {
        const error = new Error('Bu e-posta adresi zaten kayitli.');
        error.statusCode = 400;
        throw error;
    }

    // Şifreyi bcrypt ile hashle (Salt rounds: 10)
    const passwordHash = await bcrypt.hash(password, 10);

    // Parametreli sorgu ile veritabanına kaydet
    const [result] = await pool.execute(
        'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [fullName, email, passwordHash, role]
    );

    return { id: result.insertId, full_name: fullName, email, role };
};

const loginUser = async (email, password) => {
    const [users] = await pool.execute(
        'SELECT id, full_name, email, password_hash, role FROM users WHERE email = ?',
        [email]
    );

    if (users.length === 0) {
        const error = new Error('E-posta veya sifre hatali.');
        error.statusCode = 401;
        throw error;
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
        const error = new Error('E-posta veya sifre hatali.');
        error.statusCode = 401;
        throw error;
    }

    // JWT Token oluştur
    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return {
        token,
        user: {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role
        }
    };
};

module.exports = { registerUser, loginUser };