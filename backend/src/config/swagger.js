const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
    openapi: '3.0.0',
    info: {
        title: 'Otopark Doluluk ve Rezervasyon Sistemi API',
        version: '1.0.0',
        description: 'BMB315 Web Programlama dersi projesi kapsaminda gelistirilen RESTful API dokumantasyonu.'
    },
    servers: [
        {
            url: 'http://localhost:3000',
            description: 'Yerel Gelistirme Sunucusu'
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Giris yaptiktan sonra alinan JWT token bilgisini giriniz.'
            }
        }
    },
    tags: [
        { name: 'Auth', description: 'Kimlik dogrulama ve kullanici islemleri' },
        { name: 'Spots', description: 'Otopark alanlari listeleme, filtreleme ve yonetim islemleri' },
        { name: 'Reservations', description: 'Rezervasyon olusturma, listeleme ve iptal islemleri' }
    ],
    paths: {
        '/api/auth/register': {
            post: {
                tags: ['Auth'],
                summary: 'Yeni kullanici kaydi olusturur',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['full_name', 'email', 'password'],
                                properties: {
                                    full_name: { type: 'string', example: 'Ahmet Yilmaz' },
                                    email: { type: 'string', example: 'ahmet@ornek.com' },
                                    password: { type: 'string', example: '123456' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: { description: 'Kullanici basariyla olusturuldu' },
                    400: { description: 'Gecersiz girdi veya e-posta zaten kayitli' }
                }
            }
        },
        '/api/auth/login': {
            post: {
                tags: ['Auth'],
                summary: 'Kullanici girisi yapar ve JWT token doner',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password'],
                                properties: {
                                    email: { type: 'string', example: 'admin@otopark.com' },
                                    password: { type: 'string', example: '123456' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Giris basarili, JWT token uretildi' },
                    400: { description: 'Gecersiz veri formati' },
                    401: { description: 'E-posta veya sifre hatali' }
                }
            }
        },
        '/api/spots': {
            get: {
                tags: ['Spots'],
                summary: 'Otopark alanlarini arama, filtreleme ve sayfalama ile listeler',
                parameters: [
                    { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Park yeri koduna gore arama (Orn: A-01)' },
                    { name: 'floor', in: 'query', schema: { type: 'integer' }, description: 'Kat filtresi (Orn: 1, 2, -1)' },
                    { name: 'spot_type', in: 'query', schema: { type: 'string', enum: ['standart', 'elektrikli', 'engelli'] }, description: 'Park yeri tipi filtresi' },
                    { name: 'is_active', in: 'query', schema: { type: 'boolean' }, description: 'Sadece aktif/bakimda olanlari filtrele' },
                    { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Sayfa numarasi' },
                    { name: 'limit', in: 'query', schema: { type: 'integer', default: 6 }, description: 'Sayfa basina kayit sayisi' }
                ],
                responses: {
                    200: { description: 'Sayfalanmis park yeri listesi basariyla getirildi' }
                }
            },
            post: {
                tags: ['Spots'],
                summary: 'Yeni otopark alani ekler (Sadece Admin)',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['spot_code', 'floor', 'spot_type', 'hourly_rate'],
                                properties: {
                                    spot_code: { type: 'string', example: 'D-01' },
                                    floor: { type: 'integer', example: 1 },
                                    spot_type: { type: 'string', enum: ['standart', 'elektrikli', 'engelli'], example: 'standart' },
                                    hourly_rate: { type: 'number', example: 60.00 },
                                    is_active: { type: 'boolean', example: true }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: { description: 'Park yeri basariyla eklendi' },
                    400: { description: 'Gecersiz veri veya ayni kodlu park yeri mevcut' },
                    401: { description: 'Token bulunamadi veya gecersiz' },
                    403: { description: 'Bu islem icin Admin yetkisi gereklidir' }
                }
            }
        },
        '/api/spots/{id}': {
            get: {
                tags: ['Spots'],
                summary: 'Tek bir park yerinin detayini ve aktif rezervasyonlarini getirir',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Park Yeri ID' }
                ],
                responses: {
                    200: { description: 'Park yeri detayi getirildi' },
                    404: { description: 'Park yeri bulunamadi' }
                }
            },
            put: {
                tags: ['Spots'],
                summary: 'Mevcut bir park yerini gunceller (Sadece Admin)',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Park Yeri ID' }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['spot_code', 'floor', 'spot_type', 'hourly_rate', 'is_active'],
                                properties: {
                                    spot_code: { type: 'string', example: 'A-01' },
                                    floor: { type: 'integer', example: 1 },
                                    spot_type: { type: 'string', enum: ['standart', 'elektrikli', 'engelli'], example: 'elektrikli' },
                                    hourly_rate: { type: 'number', example: 75.00 },
                                    is_active: { type: 'boolean', example: true }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Park yeri basariyla guncellendi' },
                    400: { description: 'Gecersiz girdi verileri' },
                    401: { description: 'Yetkisiz erisim' },
                    403: { description: 'Admin yetkisi gereklidir' },
                    404: { description: 'Guncellenecek park yeri bulunamadi' }
                }
            }
        },
        '/api/reservations': {
            get: {
                tags: ['Reservations'],
                summary: 'Kullanicinin kendi rezervasyonlarini (Admin ise tumunu) listeler',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: 'Rezervasyon listesi getirildi' },
                    401: { description: 'Token bulunamadi veya gecersiz' }
                }
            },
            post: {
                tags: ['Reservations'],
                summary: 'Secilen tarih ve saat araligina yeni rezervasyon olusturur',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['spot_id', 'plate_number', 'start_time', 'end_time'],
                                properties: {
                                    spot_id: { type: 'integer', example: 2 },
                                    plate_number: { type: 'string', example: '22 EKR 022' },
                                    start_time: { type: 'string', format: 'date-time', example: '2026-12-01T14:00:00' },
                                    end_time: { type: 'string', format: 'date-time', example: '2026-12-01T17:00:00' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: { description: 'Rezervasyon basariyla olusturuldu ve toplam ucret hesaplandi' },
                    400: { description: 'Tarih cakismasi, bakimda olan park yeri veya gecersiz tarih araligi' },
                    401: { description: 'Giris yapilmasi gereklidir' },
                    404: { description: 'Secilen park yeri bulunamadi' }
                }
            }
        },
        '/api/reservations/{id}': {
            delete: {
                tags: ['Reservations'],
                summary: 'Rezervasyonu iptal eder / siler (204 No Content)',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Rezervasyon ID' }
                ],
                responses: {
                    204: { description: 'Rezervasyon basariyla silindi (Icerik donmez)' },
                    401: { description: 'Token bulunamadi' },
                    403: { description: 'Baska bir kullanicinin rezervasyonunu silme yetkiniz yok' },
                    404: { description: 'Rezervasyon bulunamadi' }
                }
            }
        }
    }
};

module.exports = { swaggerUi, swaggerDocument };