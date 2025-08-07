const express = require('express');
const router = express.Router();
const pool = require('../config/database');

/**
 * @route   GET /api/cars
 * @desc    Get all available cars
 * @access  Public
 */
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT
                brand,
                model,
                year,
                price,
                mileage,
                color,
                body_type,
                image_url
            FROM
                cars
            WHERE
                available = true
            ORDER BY
                brand, model;
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching available cars:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
