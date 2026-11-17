const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');

describe('Otopark Rezervasyon Sistemi REST API Otomatik Testleri', () => {
    let userToken = '';
    let testUserEmail = `test_${Date.now()}@otopark.com`;

    // Tüm testler bittiğinde test kullanıcısını sil ve MySQL bağlantısını kapat
    afterAll(async () => {
        await pool.execute('DELETE FROM users WHERE email = ?', [testUserEmail]);
        await pool.end();
    });

    // TEST 1: Sunucu ve Veritabanı Sağlık Kontrolü (200 OK)
    test('1. GET /api/health - API ve veritabani baglantisi aktif olmali (200)', async () => {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('OK');
    });

    // TEST 2: Yeni Kullanıcı Kaydı ve Bcrypt Hashleme (201 Created)
    test('2. POST /api/auth/register - Yeni kullanici basariyla kayit olabilmeli (201)', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                full_name: 'Jest Test Kullanicisi',
                email: testUserEmail,
                password: 'password123'
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.user).toHaveProperty('id');
        expect(res.body.user.email).toBe(testUserEmail);
        expect(res.body.user.role).toBe('user');
    });

    // TEST 3: Sunucu Tarafı Girdi Doğrulama Kontrolü (400 Bad Request)
    test('3. POST /api/auth/register - Eksik veya gecersiz veride 400 donmeli', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                full_name: 'A', // En az 3 karakter kuralını ihlal ediyor
                email: 'gecersiz-email',
                password: '123' // En az 6 karakter kuralını ihlal ediyor
            });

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
    });

    // TEST 4: Kullanıcı Girişi ve JWT Token Üretimi (200 OK)
    test('4. POST /api/auth/login - Dogru bilgilerle giris yapip JWT token donmeli (200)', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUserEmail,
                password: 'password123'
            });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
        userToken = res.body.token; // Sonraki yetki testleri için token'ı sakla
    });

    // TEST 5: Otopark Alanlarını Sayfalama ve Filtreleme ile Listeleme (200 OK)
    test('5. GET /api/spots - Park yerleri sayfalama bilgisiyle listelenmeli (200)', async () => {
        const res = await request(app).get('/api/spots?page=1&limit=5');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body).toHaveProperty('pagination');
        expect(res.body.pagination.limit).toBe(5);
    });

    // TEST 6: Olmayan Park Yeri Detayı İstendiğinde Hata Kontrolü (404 Not Found)
    test('6. GET /api/spots/:id - Olmayan park yeri icin 404 Not Found donmeli', async () => {
        const res = await request(app).get('/api/spots/999999');
        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty('message');
    });

    // TEST 7: Rol Bazlı Yetkilendirme Kontrolü - Normal Kullanıcı Park Yeri Ekleyemez (403 Forbidden)
    test('7. POST /api/spots - Normal kullanici (user) yeni park yeri ekleyememeli (403)', async () => {
        const res = await request(app)
            .post('/api/spots')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                spot_code: 'TEST-99',
                floor: 1,
                spot_type: 'standart',
                hourly_rate: 50
            });

        expect(res.statusCode).toBe(403);
    });
});