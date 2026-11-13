const pool = require('../config/db');

// Kullanıcının kendi rezervasyonlarını (Admin ise tümünü) listele
const getReservations = async (user) => {
    let query = `
        SELECT r.id, r.user_id, u.full_name, r.spot_id, s.spot_code, s.floor, s.spot_type,
               r.plate_number, r.start_time, r.end_time, r.total_price, r.status, r.created_at
        FROM reservations r
        JOIN users u ON r.user_id = u.id
        JOIN parking_spots s ON r.spot_id = s.id
    `;
    const params = [];

    // Rol 'user' ise sadece kendi rezervasyonlarını görsün, 'admin' ise hepsini
    if (user.role !== 'admin') {
        query += ' WHERE r.user_id = ?';
        params.push(user.id);
    }

    query += ' ORDER BY r.start_time DESC';

    const [reservations] = await pool.execute(query, params);
    return reservations;
};

// Yeni rezervasyon oluştur (Çakışma kontrolü ve otomatik ücret hesaplama ile)
const createReservation = async (userId, { spot_id, plate_number, start_time, end_time }) => {
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
        const error = new Error('Bitis zamani, baslangic zamanindan sonra olmalidir.');
        error.statusCode = 400;
        throw error;
    }

    // 1. Park yeri var mı ve kullanıma açık mı (is_active) kontrol et
    const [spots] = await pool.execute(
        'SELECT id, hourly_rate, is_active FROM parking_spots WHERE id = ?',
        [spot_id]
    );

    if (spots.length === 0) {
        const error = new Error('Secilen park yeri bulunamadi.');
        error.statusCode = 404;
        throw error;
    }

    const spot = spots[0];
    if (!spot.is_active) {
        const error = new Error('Bu park yeri su anda bakimda oldugu icin rezerve edilemez.');
        error.statusCode = 400;
        throw error;
    }

    // 2. Seçilen saat aralığında bu park yerinde başka aktif rezervasyon var mı? (Çakışma Kontrolü)
    const [conflicts] = await pool.execute(
        `SELECT id FROM reservations 
         WHERE spot_id = ? 
           AND status = 'aktif' 
           AND (start_time < ? AND end_time > ?)`,
        [spot_id, end_time, start_time]
    );

    if (conflicts.length > 0) {
        const error = new Error('Secilen tarih ve saat araliginda bu park yeri doludur.');
        error.statusCode = 400;
        throw error;
    }

    // 3. Saat farkını ve toplam ücreti hesapla (En az 1 saat ücretlendirilir)
    const durationHours = Math.ceil((endDate - startDate) / (1000 * 60 * 60));
    const totalPrice = (durationHours * Number(spot.hourly_rate)).toFixed(2);

    // 4. Veritabanına kaydet
    const [result] = await pool.execute(
        `INSERT INTO reservations (user_id, spot_id, plate_number, start_time, end_time, total_price, status) 
         VALUES (?, ?, ?, ?, ?, ?, 'aktif')`,
        [userId, spot_id, plate_number.toUpperCase(), start_time, end_time, totalPrice]
    );

    return {
        id: result.insertId,
        user_id: userId,
        spot_id: Number(spot_id),
        plate_number: plate_number.toUpperCase(),
        start_time,
        end_time,
        total_price: Number(totalPrice),
        status: 'aktif'
    };
};

// Rezervasyon sil / iptal et (Kullanıcı sadece kendininkini, Admin hepsini -> 403 & 404 kontrolü)
const deleteReservation = async (reservationId, user) => {
    const [reservations] = await pool.execute(
        'SELECT id, user_id FROM reservations WHERE id = ?',
        [reservationId]
    );

    if (reservations.length === 0) {
        const error = new Error('Rezervasyon bulunamadi.');
        error.statusCode = 404;
        throw error;
    }

    const reservation = reservations[0];

    // Başka bir kullanıcının rezervasyonunu silmeye çalışıyorsa ve admin değilse 403 Forbidden
    if (user.role !== 'admin' && reservation.user_id !== user.id) {
        const error = new Error('Baska bir kullanicinin rezervasyonunu silme yetkiniz yoktur.');
        error.statusCode = 403;
        throw error;
    }

    await pool.execute('DELETE FROM reservations WHERE id = ?', [reservationId]);
};

module.exports = { getReservations, createReservation, deleteReservation };