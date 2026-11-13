const { validationResult } = require('express-validator');
const reservationService = require('../services/reservationService');

const getReservations = async (req, res) => {
    try {
        const reservations = await reservationService.getReservations(req.user);
        res.status(200).json(reservations);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || 'Sunucu hatasi.' });
    }
};

const createReservation = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Gecersiz girdi verileri.', errors: errors.array() });
    }

    try {
        const newReservation = await reservationService.createReservation(req.user.id, req.body);
        res.status(201).json({
            message: 'Rezervasyon basariyla olusturuldu.',
            reservation: newReservation
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || 'Sunucu hatasi.' });
    }
};

const deleteReservation = async (req, res) => {
    try {
        await reservationService.deleteReservation(req.params.id, req.user);
        // Ödev zorunluluğu: Başarılı silme işleminde 204 No Content dönülür
        res.status(204).send();
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || 'Sunucu hatasi.' });
    }
};

module.exports = { getReservations, createReservation, deleteReservation };