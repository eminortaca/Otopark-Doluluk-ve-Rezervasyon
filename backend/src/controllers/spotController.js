const { validationResult } = require('express-validator');
const spotService = require('../services/spotService');

const getSpots = async (req, res) => {
    try {
        const { search, floor, spot_type, is_active, page, limit } = req.query;
        const result = await spotService.getAllSpots({ search, floor, spot_type, is_active, page, limit });
        res.status(200).json(result);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || 'Sunucu hatasi.' });
    }
};

const getSpotDetail = async (req, res) => {
    try {
        const spot = await spotService.getSpotById(req.params.id);
        res.status(200).json(spot);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || 'Sunucu hatasi.' });
    }
};

const createSpot = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Gecersiz girdi verileri.', errors: errors.array() });
    }

    try {
        const newSpot = await spotService.createSpot(req.body);
        res.status(201).json({
            message: 'Park yeri basariyla eklendi.',
            spot: newSpot
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || 'Sunucu hatasi.' });
    }
};

const updateSpot = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Gecersiz girdi verileri.', errors: errors.array() });
    }

    try {
        const updatedSpot = await spotService.updateSpot(req.params.id, req.body);
        res.status(200).json({
            message: 'Park yeri basariyla guncellendi.',
            spot: updatedSpot
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || 'Sunucu hatasi.' });
    }
};

module.exports = { getSpots, getSpotDetail, createSpot, updateSpot };