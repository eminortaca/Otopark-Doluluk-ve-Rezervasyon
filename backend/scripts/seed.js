const bcrypt = require('bcrypt');
const pool = require('../src/config/db');

const DEMO_USERS = [
    { full_name: 'Sistem Yöneticisi', email: 'admin@otopark.com', role: 'admin' },
    { full_name: 'Örnek Kullanıcı', email: 'user@otopark.com', role: 'user' }
];

const DEMO_SPOTS = [
    ['A-01', 1, 'standart', 50.0, true],
    ['A-02', 1, 'standart', 50.0, true],
    ['A-03', 1, 'engelli', 30.0, true],
    ['A-04', 1, 'elektrikli', 80.0, true],
    ['A-05', 1, 'standart', 50.0, false],
    ['B-01', 2, 'standart', 45.0, true],
    ['B-02', 2, 'standart', 45.0, true],
    ['B-03', 2, 'elektrikli', 75.0, true],
    ['B-04', 2, 'engelli', 30.0, true],
    ['B-05', 2, 'standart', 45.0, true],
    ['C-01', -1, 'standart', 40.0, true],
    ['C-02', -1, 'elektrikli', 70.0, true]
];

const DEMO_RESERVATIONS = [
    ['A-01', '22 ABC 123', '2026-11-15 10:00:00', '2026-11-15 13:00:00', 150.0, 'tamamlandi'],
    ['A-02', '34 IST 456', '2026-12-10 09:00:00', '2026-12-10 12:00:00', 150.0, 'aktif'],
    ['A-04', '22 EV 022', '2026-12-12 14:00:00', '2026-12-12 16:00:00', 160.0, 'aktif']
];

async function seedDatabase() {
    try {
        const passwordHash = await bcrypt.hash('123456', 10);

        for (const user of DEMO_USERS) {
            await pool.execute(
                `INSERT INTO users (full_name, email, password_hash, role)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                   full_name = VALUES(full_name),
                   password_hash = VALUES(password_hash),
                   role = VALUES(role)`,
                [user.full_name, user.email, passwordHash, user.role]
            );
        }

        for (const spot of DEMO_SPOTS) {
            await pool.execute(
                `INSERT INTO parking_spots (spot_code, floor, spot_type, hourly_rate, is_active)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                   floor = VALUES(floor),
                   spot_type = VALUES(spot_type),
                   hourly_rate = VALUES(hourly_rate),
                   is_active = VALUES(is_active)`,
                spot
            );
        }

        const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', ['user@otopark.com']);
        const demoUserId = users[0]?.id;

        const [spotRows] = await pool.execute('SELECT id, spot_code FROM parking_spots');
        const spotIdByCode = new Map(spotRows.map((row) => [row.spot_code, row.id]));

        let insertedReservations = 0;
        if (demoUserId) {
            for (const [spotCode, plate, startTime, endTime, totalPrice, status] of DEMO_RESERVATIONS) {
                const spotId = spotIdByCode.get(spotCode);
                if (!spotId) continue;

                const [existing] = await pool.execute(
                    'SELECT id FROM reservations WHERE user_id = ? AND spot_id = ? AND start_time = ?',
                    [demoUserId, spotId, startTime]
                );

                if (existing.length === 0) {
                    await pool.execute(
                        `INSERT INTO reservations (user_id, spot_id, plate_number, start_time, end_time, total_price, status)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [demoUserId, spotId, plate, startTime, endTime, totalPrice, status]
                    );
                    insertedReservations += 1;
                }
            }
        }

        console.log(
            `Seed işlemi tamamlandı: ${DEMO_USERS.length} demo kullanıcı, ${DEMO_SPOTS.length} park yeri doğrulandı, ${insertedReservations} yeni örnek rezervasyon eklendi.`
        );
    } finally {
        await pool.end();
    }
}

seedDatabase().catch((error) => {
    console.error('Seed hatası:', error.message);
    process.exitCode = 1;
});
