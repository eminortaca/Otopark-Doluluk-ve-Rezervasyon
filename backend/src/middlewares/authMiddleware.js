const jwt = require('jsonwebtoken');

// Kullanıcının geçerli bir JWT token'ı olup olmadığını doğrular (401 kontrolü)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

    if (!token) {
        return res.status(401).json({ message: 'Erisim reddedildi. Token bulunamadi.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, email, role } bilgisini isteğe ekler
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Gecersiz veya suresi dolmus token.' });
    }
};

// Kullanıcının rolünü kontrol eder (Örn: Sadece 'admin' girebilir -> 403 kontrolü)
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Bu islem icin yetkiniz bulunmamaktadir.' });
        }
        next();
    };
};

module.exports = { authenticateToken, authorizeRoles };