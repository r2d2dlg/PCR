const express = require('express');
const router = express.Router();
const pool = require('../config/database');

/**
 * @route   GET /api/inventory/sales-analysis
 * @desc    Get sales analysis data for a given period
 * @access  Public
 */
router.get('/sales-analysis', async (req, res) => {
    const { period } = req.query; // e.g., 1m, 3m, 6m, 12m

    let interval;
    switch (period) {
        case '1m': interval = '1 month'; break;
        case '3m': interval = '3 months'; break;
        case '6m': interval = '6 months'; break;
        case '12m': interval = '12 months'; break;
        default: interval = '12 months'; // Default to 12 months
    }

    try {
        const query = `
            SELECT
                c.brand,
                c.model,
                c.price,
                s.sale_date
            FROM
                sales s
            JOIN
                cars c ON s.car_id = c.id
            WHERE
                s.sale_date >= NOW() - $1::interval;
        `;
        const { rows } = await pool.query(query, [interval]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching sales analysis:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route   GET /api/inventory/rotation
 * @desc    Get car inventory rotation analysis
 * @access  Public
 */
router.get('/rotation', async (req, res) => {
    try {
        const query = `
            SELECT
                c.brand,
                c.model,
                c.year,
                AVG(EXTRACT(DAY FROM s.sale_date - c.purchase_date)) AS avg_days_in_inventory,
                COUNT(s.id) AS total_sold
            FROM
                sales s
            JOIN
                cars c ON s.car_id = c.id
            WHERE
                c.purchase_date IS NOT NULL
            GROUP BY
                c.brand, c.model, c.year
            ORDER BY
                avg_days_in_inventory ASC;
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching inventory rotation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route   GET /api/inventory/discount-analysis
 * @desc    Get discount analysis for slow-moving cars
 * @access  Public
 */
router.get('/discount-analysis', async (req, res) => {
    try {
        const query = `
            SELECT
                c.id,
                c.brand,
                c.model,
                c.year,
                c.price,
                EXTRACT(DAY FROM NOW() - c.purchase_date) AS days_in_inventory
            FROM
                cars c
            WHERE
                c.available = true
                AND c.purchase_date IS NOT NULL
                AND (NOW() - c.purchase_date) > INTERVAL '60 days'
            ORDER BY
                days_in_inventory DESC;
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching discount analysis:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route   POST /api/inventory/buying-price-suggestion
 * @desc    Get buying price suggestion for a car
 * @access  Public
 */
router.post('/buying-price-suggestion', async (req, res) => {
    const { brand, model, year } = req.body;

    try {
        const query = `
            SELECT
                AVG(s.sale_price) AS avg_sale_price,
                AVG(EXTRACT(DAY FROM s.sale_date - c.purchase_date)) AS avg_days_to_sell
            FROM
                sales s
            JOIN
                cars c ON s.car_id = c.id
            WHERE
                c.brand = $1
                AND c.model = $2
                AND c.year = $3
            GROUP BY
                c.brand, c.model, c.year;
        `;
        const { rows } = await pool.query(query, [brand, model, year]);
        res.json(rows[0] || {});
    } catch (error) {
        console.error('Error fetching buying price suggestion:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route   POST /api/inventory/offer-suggestion
 * @desc    Calculate a suggested offer price for a car
 * @access  Public
 */
router.post('/offer-suggestion', async (req, res) => {
    const { brand, model, year, salesPrice, dailyHoldingCost, salesCommission, reconditioningCost, desiredProfitMargin } = req.body;

    try {
        // First, get the average days in inventory for this model
        const avgDaysQuery = `
            SELECT AVG(EXTRACT(DAY FROM s.sale_date - c.purchase_date)) AS avg_days
            FROM sales s
            JOIN cars c ON s.car_id = c.id
            WHERE c.brand = $1 AND c.model = $2 AND c.year = $3;
        `;
        const { rows } = await pool.query(avgDaysQuery, [brand, model, year]);
        const avgDaysInInventory = rows[0]?.avg_days || 60; // Default to 60 days if no data

        // Financial Model Calculation
        const inventoryCost = avgDaysInInventory * dailyHoldingCost;
        const commissionAmount = salesPrice * (salesCommission / 100);
        const desiredProfit = salesPrice * (desiredProfitMargin / 100);

        const totalCosts = inventoryCost + commissionAmount + reconditioningCost + (salesPrice * 0.01); // 1% opportunity cost

        const suggestedOfferPrice = salesPrice - totalCosts - desiredProfit;

        res.json({
            suggestedOfferPrice: suggestedOfferPrice.toFixed(2),
            breakdown: {
                targetSalesPrice: parseFloat(salesPrice).toFixed(2),
                avgDaysInInventory: avgDaysInInventory.toFixed(2),
                inventoryCost: inventoryCost.toFixed(2),
                commissionAmount: commissionAmount.toFixed(2),
                reconditioningCost: reconditioningCost.toFixed(2),
                opportunityCost: (salesPrice * 0.01).toFixed(2),
                projectedProfit: desiredProfit.toFixed(2),
                totalCosts: totalCosts.toFixed(2),
            }
        });

    } catch (error) {
        console.error('Error calculating offer suggestion:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
