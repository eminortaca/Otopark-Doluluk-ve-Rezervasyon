const pool = require('../config/db');

// Arama, filtreleme ve sayfalama ile park yerlerini getir
const getAllSpots = async ({ search, floor, spot_type, is_active, page = 1, limit = 6 }) => {
    const offset = (page - 1) * limit;
    const queryParams = [];
    let whereClause = 'WHERE 1=1';

    if (search) {
        whereClause += ' AND spot_code LIKE ?';
        queryParams.push(`%${search}%`);
    }
    if (floor !== undefined && floor !== '') {
        whereClause += ' AND floor = ?';
        queryParams.push(Number(floor));
    }
    if (spot_type) {
        whereClause += ' AND spot_type = ?';
        queryParams.push(spot_type);
    }
    if (is_active !== undefined && is_active !== '') {
        whereClause += ' AND is_active = ?';
        queryParams.push(is_active === 'true' || is_active === '1' ? 1 : 0);
    }

    // Toplam kayıt sayısını bul (Sayfalama hesabı için)
    const countQuery = `SELECT COUNT(*) as total FROM parking_spots ${whereClause}`;
    const [countResult] = await pool.execute(countQuery, queryParams);
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    // Sayfalanmış veriyi çek
    const dataQuery = `
        SELECT id, spot_code, floor, spot_type, hourly_rate, is_active, created_at
        FROM parking_spots
        ${whereClause}
        ORDER BY floor ASC, spot_code ASC
        LIMIT ? OFFSET ?
    `;
    
    // LIMIT ve OFFSET değerlerini string yerine tam sayı olarak gönderiyoruz
    const [spots] = await pool.query(dataQuery, [...queryParams, Number(limit), Number(offset)]);

    return {
        data: spots,
        pagination: {
            totalItems,
            totalPages,
            currentPage: Number(page),
            limit: Number(limit)
        }
    };
};

// Tek bir park yerinin detayını ve aktif rezervasyonlarını getir
const getSpotById = async (id) => {
    const [spots] = await pool.execute(
        'SELECT id, spot_code, floor, spot_type, hourly_rate, is_active, created_at FROM parking_spots WHERE id = ?',
        [id]
    );

    if (spots.length === 0) {
        const error = new Error('Park yeri bulunamadi.');
        error.statusCode = 404;
        throw error;
    }

    // Bu park yerine ait ileri tarihli veya aktif rezervasyonları da detaya ekle
    const [reservations] = await pool.execute(
        `SELECT id, plate_number, start_time, end_time, status 
         FROM reservations 
         WHERE spot_id = ? AND status = 'aktif' AND end_time >= NOW()
         ORDER BY start_time ASC`,
        [id]
    );

    return {
        ...spots[0],
        active_reservations: reservations
    };
};

// Yeni park yeri ekle (Admin)
const createSpot = async ({ spot_code, floor, spot_type, hourly_rate, is_active = true }) => {
    const [existing] = await pool.execute(
        'SELECT id FROM parking_spots WHERE spot_code = ?',
        [spot_code]
    );

    if (existing.length > 0) {
        const error = new Error('Bu park yeri kodu (spot_code) zaten mevcut.');
        error.statusCode = 400;
        throw error;
    }

    const [result] = await pool.execute(
        'INSERT INTO parking_spots (spot_code, floor, spot_type, hourly_rate, is_active) VALUES (?, ?, ?, ?, ?)',
        [spot_code, floor, spot_type, hourly_rate, is_active]
    );

    return { id: result.insertId, spot_code, floor, spot_type, hourly_rate, is_active };
};

// Park yeri güncelle (Admin)
const updateSpot = async (id, { spot_code, floor, spot_type, hourly_rate, is_active }) => {
    // Önce kayıt var mı kontrol et (Yoksa 404 fırlatır)
    await getSpotById(id);

    // Başka bir kayıtta aynı spot_code var mı kontrol et
    const [existing] = await pool.execute(
        'SELECT id FROM parking_spots WHERE spot_code = ? AND id != ?',
        [spot_code, id]
    );

    if (existing.length > 0) {
        const error = new Error('Bu park yeri kodu baska bir kayitta kullaniliyor.');
        error.statusCode = 400;
        throw error;
    }

    await pool.execute(
        `UPDATE parking_spots 
         SET spot_code = ?, floor = ?, spot_type = ?, hourly_rate = ?, is_active = ? 
         WHERE id = ?`,
        [spot_code, floor, spot_type, hourly_rate, is_active, id]
    );

    return { id: Number(id), spot_code, floor, spot_type, hourly_rate, is_active };
};

module.exports = { getAllSpots, getSpotById, createSpot, updateSpot };