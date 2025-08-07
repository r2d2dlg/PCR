const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const Joi = require('joi');

// Validation schema for search logging
const searchSchema = Joi.object({
    client_id: Joi.number().optional(),
    session_id: Joi.string().required(),
    search_body_type: Joi.string().valid('sedan', 'suv', 'hatchback', 'pickup', 'coupe').optional(),
    search_brand: Joi.string().min(2).max(50).optional(),
    search_min_price: Joi.number().min(0).optional(),
    search_max_price: Joi.number().min(0).optional(),
    search_color: Joi.string().min(3).max(30).optional(),
    search_max_mileage: Joi.number().min(0).optional()
});

// POST /api/search/cars - Advanced car search with logging
router.post('/cars', async (req, res) => {
    try {
        const { error, value } = searchSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        // Build the car search query
        let query = `
            SELECT id, brand, model, year, body_type, color, mileage, price, 
                   fuel_type, transmission, engine_size, doors, description, image_url
            FROM cars 
            WHERE available = true
        `;
        let params = [];
        let paramCount = 0;

        // Build dynamic WHERE clause
        if (value.search_body_type) {
            paramCount++;
            query += ` AND body_type = $${paramCount}`;
            params.push(value.search_body_type);
        }

        if (value.search_brand) {
            paramCount++;
            query += ` AND LOWER(brand) LIKE LOWER($${paramCount})`;
            params.push(`%${value.search_brand}%`);
        }

        if (value.search_min_price) {
            paramCount++;
            query += ` AND price >= $${paramCount}`;
            params.push(value.search_min_price);
        }

        if (value.search_max_price) {
            paramCount++;
            query += ` AND price <= $${paramCount}`;
            params.push(value.search_max_price);
        }

        if (value.search_color) {
            paramCount++;
            query += ` AND LOWER(color) LIKE LOWER($${paramCount})`;
            params.push(`%${value.search_color}%`);
        }

        if (value.search_max_mileage) {
            paramCount++;
            query += ` AND mileage <= $${paramCount}`;
            params.push(value.search_max_mileage);
        }

        query += ` ORDER BY price ASC LIMIT 10`;

        // Execute the search
        const searchResult = await pool.query(query, params);
        const cars = searchResult.rows;

        // Log the search
        const logQuery = `
            INSERT INTO client_searches (
                client_id, session_id, search_body_type, search_brand,
                search_min_price, search_max_price, search_color, 
                search_max_mileage, results_count
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        `;

        await pool.query(logQuery, [
            value.client_id || null,
            value.session_id,
            value.search_body_type || null,
            value.search_brand || null,
            value.search_min_price || null,
            value.search_max_price || null,
            value.search_color || null,
            value.search_max_mileage || null,
            cars.length
        ]);

        // If cars were found and we have a client_id or session_id, log car views
        if (cars.length > 0) {
            const viewPromises = cars.map(car => {
                return pool.query(
                    `INSERT INTO car_views (car_id, client_id, session_id, view_source) 
                     VALUES ($1, $2, $3, 'chatbot')`,
                    [car.id, value.client_id || null, value.session_id]
                );
            });
            await Promise.all(viewPromises);
        }

        res.json({
            cars: cars,
            total_results: cars.length,
            search_criteria: {
                body_type: value.search_body_type,
                brand: value.search_brand,
                price_range: {
                    min: value.search_min_price,
                    max: value.search_max_price
                },
                color: value.search_color,
                max_mileage: value.search_max_mileage
            }
        });

    } catch (error) {
        console.error('Error performing car search:', error);
        res.status(500).json({ error: 'Error performing search' });
    }
});

// POST /api/search/intelligent - Intelligent search with natural language processing
router.post('/intelligent', async (req, res) => {
    try {
        const { query_text, session_id, client_id } = req.body;

        if (!query_text || !session_id) {
            return res.status(400).json({ error: 'query_text and session_id are required' });
        }

        // Simple keyword extraction (in production, you might use NLP libraries)
        const searchCriteria = extractSearchCriteria(query_text.toLowerCase());

        // Perform the search using extracted criteria
        const searchData = {
            client_id: client_id,
            session_id: session_id,
            ...searchCriteria
        };

        // Reuse the existing search logic
        const { error, value } = searchSchema.validate(searchData);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        // Build and execute the search query (same as above)
        let query = `
            SELECT id, brand, model, year, body_type, color, mileage, price, 
                   fuel_type, transmission, engine_size, doors, description, image_url
            FROM cars 
            WHERE available = true
        `;
        let params = [];
        let paramCount = 0;

        if (value.search_body_type) {
            paramCount++;
            query += ` AND body_type = $${paramCount}`;
            params.push(value.search_body_type);
        }

        if (value.search_brand) {
            paramCount++;
            query += ` AND LOWER(brand) LIKE LOWER($${paramCount})`;
            params.push(`%${value.search_brand}%`);
        }

        if (value.search_min_price) {
            paramCount++;
            query += ` AND price >= $${paramCount}`;
            params.push(value.search_min_price);
        }

        if (value.search_max_price) {
            paramCount++;
            query += ` AND price <= $${paramCount}`;
            params.push(value.search_max_price);
        }

        if (value.search_color) {
            paramCount++;
            query += ` AND LOWER(color) LIKE LOWER($${paramCount})`;
            params.push(`%${value.search_color}%`);
        }

        if (value.search_max_mileage) {
            paramCount++;
            query += ` AND mileage <= $${paramCount}`;
            params.push(value.search_max_mileage);
        }

        query += ` ORDER BY price ASC LIMIT 10`;

        const searchResult = await pool.query(query, params);
        const cars = searchResult.rows;

        // Log the search
        const logQuery = `
            INSERT INTO client_searches (
                client_id, session_id, search_body_type, search_brand,
                search_min_price, search_max_price, search_color, 
                search_max_mileage, results_count
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        `;

        await pool.query(logQuery, [
            value.client_id || null,
            value.session_id,
            value.search_body_type || null,
            value.search_brand || null,
            value.search_min_price || null,
            value.search_max_price || null,
            value.search_color || null,
            value.search_max_mileage || null,
            cars.length
        ]);

        res.json({
            cars: cars,
            total_results: cars.length,
            original_query: query_text,
            extracted_criteria: searchCriteria,
            interpretation: generateSearchInterpretation(searchCriteria, cars.length)
        });

    } catch (error) {
        console.error('Error performing intelligent search:', error);
        res.status(500).json({ error: 'Error performing intelligent search' });
    }
});

// Helper function to extract search criteria from natural language
function extractSearchCriteria(text) {
    const criteria = {};

    // Body type detection
    if (text.includes('suv') || text.includes('camioneta')) {
        criteria.search_body_type = 'suv';
    } else if (text.includes('sedan') || text.includes('sedán')) {
        criteria.search_body_type = 'sedan';
    } else if (text.includes('pickup') || text.includes('pick up')) {
        criteria.search_body_type = 'pickup';
    } else if (text.includes('hatchback') || text.includes('compacto')) {
        criteria.search_body_type = 'hatchback';
    } else if (text.includes('coupe') || text.includes('coupé') || text.includes('deportivo')) {
        criteria.search_body_type = 'coupe';
    }

    // Brand detection
    const brands = ['toyota', 'honda', 'ford', 'chevrolet', 'nissan', 'volkswagen', 'hyundai', 'mazda', 'subaru', 'kia', 'bmw', 'mercedes', 'audi', 'tesla', 'jeep'];
    for (const brand of brands) {
        if (text.includes(brand)) {
            criteria.search_brand = brand;
            break;
        }
    }

    // Color detection
    const colors = {
        'blanco': 'blanco', 'white': 'blanco',
        'negro': 'negro', 'black': 'negro',
        'gris': 'gris', 'gray': 'gris', 'grey': 'gris',
        'rojo': 'rojo', 'red': 'rojo',
        'azul': 'azul', 'blue': 'azul',
        'verde': 'verde', 'green': 'verde',
        'plateado': 'plateado', 'silver': 'plateado',
        'dorado': 'dorado', 'gold': 'dorado'
    };

    for (const [colorKey, colorValue] of Object.entries(colors)) {
        if (text.includes(colorKey)) {
            criteria.search_color = colorValue;
            break;
        }
    }

    // Price detection (basic regex for numbers)
    const priceMatch = text.match(/(\d+),?(\d+)?/);
    if (priceMatch) {
        const price = parseInt(priceMatch[0].replace(',', ''));
        if (text.includes('menos de') || text.includes('under') || text.includes('máximo')) {
            criteria.search_max_price = price;
        } else if (text.includes('más de') || text.includes('over') || text.includes('mínimo')) {
            criteria.search_min_price = price;
        } else {
            // Default to max price if no qualifier
            criteria.search_max_price = price;
        }
    }

    // Mileage detection
    const mileageMatch = text.match(/(\d+),?(\d+)?\s*(km|kilómetros|millas)/);
    if (mileageMatch) {
        criteria.search_max_mileage = parseInt(mileageMatch[0].replace(/[^\d]/g, ''));
    }

    return criteria;
}

// Helper function to generate search interpretation
function generateSearchInterpretation(criteria, resultCount) {
    let interpretation = "Búsqueda realizada";
    
    const parts = [];
    
    if (criteria.search_body_type) {
        parts.push(`tipo: ${criteria.search_body_type}`);
    }
    
    if (criteria.search_brand) {
        parts.push(`marca: ${criteria.search_brand}`);
    }
    
    if (criteria.search_color) {
        parts.push(`color: ${criteria.search_color}`);
    }
    
    if (criteria.search_max_price) {
        parts.push(`precio máximo: $${criteria.search_max_price.toLocaleString()}`);
    }
    
    if (criteria.search_min_price) {
        parts.push(`precio mínimo: $${criteria.search_min_price.toLocaleString()}`);
    }
    
    if (criteria.search_max_mileage) {
        parts.push(`kilometraje máximo: ${criteria.search_max_mileage.toLocaleString()} km`);
    }
    
    if (parts.length > 0) {
        interpretation += ` con criterios: ${parts.join(', ')}`;
    }
    
    interpretation += `. Se encontraron ${resultCount} vehículos.`;
    
    return interpretation;
}

module.exports = router;