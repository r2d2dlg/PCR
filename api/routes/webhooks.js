const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// POST /api/webhooks/n8n/chatbot - Main webhook for n8n chatbot integration
router.post('/n8n/chatbot', async (req, res) => {
    try {
        const {
            action,
            session_id,
            user_message,
            user_data,
            search_criteria,
            client_id
        } = req.body;

        console.log('N8N Webhook received:', { action, session_id, user_message });

        let response = {};

        switch (action) {
            case 'start_conversation':
                response = await handleStartConversation(session_id || uuidv4());
                break;

            case 'search_cars':
                response = await handleCarSearch(session_id, search_criteria, client_id);
                break;

            case 'capture_lead':
                response = await handleLeadCapture(session_id, user_data);
                break;

            case 'log_interaction':
                response = await handleLogInteraction(session_id, user_message, req.body.bot_response, req.body.interaction_type, client_id);
                break;

            case 'get_car_details':
                response = await handleGetCarDetails(req.body.car_id, session_id, client_id);
                break;

            case 'natural_search':
                response = await handleNaturalLanguageSearch(session_id, user_message, client_id);
                break;

            default:
                return res.status(400).json({ error: 'Invalid action specified' });
        }

        res.json({
            success: true,
            action: action,
            session_id: session_id,
            data: response
        });

    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            action: req.body.action
        });
    }
});

// Handle conversation start
async function handleStartConversation(session_id) {
    await pool.query(
        `INSERT INTO client_interactions (session_id, interaction_type, bot_response) 
         VALUES ($1, 'greeting', 'Conversation started')`,
        [session_id]
    );

    return {
        session_id: session_id,
        greeting: "¡Hola! Soy tu asistente virtual de AutoDealer Premium. ¿Qué tipo de vehículo estás buscando hoy?",
        options: ["SUV", "Sedán", "Pickup", "Hatchback", "Coupé"]
    };
}

// Handle car search
async function handleCarSearch(session_id, criteria, client_id = null) {
    // Build search query
    let query = `
        SELECT id, brand, model, year, body_type, color, mileage, price, 
               fuel_type, transmission, engine_size, doors, description
        FROM cars 
        WHERE available = true
    `;
    let params = [];
    let paramCount = 0;

    if (criteria.body_type) {
        paramCount++;
        query += ` AND body_type = $${paramCount}`;
        params.push(criteria.body_type);
    }

    if (criteria.brand) {
        paramCount++;
        query += ` AND LOWER(brand) LIKE LOWER($${paramCount})`;
        params.push(`%${criteria.brand}%`);
    }

    if (criteria.min_price) {
        paramCount++;
        query += ` AND price >= $${paramCount}`;
        params.push(criteria.min_price);
    }

    if (criteria.max_price) {
        paramCount++;
        query += ` AND price <= $${paramCount}`;
        params.push(criteria.max_price);
    }

    if (criteria.color) {
        paramCount++;
        query += ` AND LOWER(color) LIKE LOWER($${paramCount})`;
        params.push(`%${criteria.color}%`);
    }

    if (criteria.max_mileage) {
        paramCount++;
        query += ` AND mileage <= $${paramCount}`;
        params.push(criteria.max_mileage);
    }

    query += ` ORDER BY price ASC LIMIT 5`;

    const searchResult = await pool.query(query, params);
    const cars = searchResult.rows;

    // Log the search
    await pool.query(`
        INSERT INTO client_searches (
            client_id, session_id, search_body_type, search_brand,
            search_min_price, search_max_price, search_color, 
            search_max_mileage, results_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
        client_id,
        session_id,
        criteria.body_type || null,
        criteria.brand || null,
        criteria.min_price || null,
        criteria.max_price || null,
        criteria.color || null,
        criteria.max_mileage || null,
        cars.length
    ]);

    // Log car views
    if (cars.length > 0) {
        for (const car of cars) {
            await pool.query(
                `INSERT INTO car_views (car_id, client_id, session_id, view_source) 
                 VALUES ($1, $2, $3, 'chatbot')`,
                [car.id, client_id, session_id]
            );
        }
    }

    return {
        cars: cars,
        total_results: cars.length,
        search_criteria: criteria,
        message: cars.length > 0 
            ? `Encontré ${cars.length} vehículos que coinciden con tu búsqueda:`
            : "No encontré vehículos que coincidan exactamente con tu búsqueda. ¿Te gustaría modificar algún criterio?"
    };
}

// Handle lead capture
async function handleLeadCapture(session_id, user_data) {
    const { name, phone, email, preferences } = user_data;

    // Check if client exists
    const existingClient = await pool.query(
        'SELECT id FROM clients WHERE phone = $1',
        [phone]
    );

    let client;
    if (existingClient.rows.length > 0) {
        // Update existing client
        const updateResult = await pool.query(`
            UPDATE clients SET 
                name = $2,
                email = COALESCE($3, email),
                preferred_body_type = COALESCE($4, preferred_body_type),
                preferred_brand = COALESCE($5, preferred_brand),
                min_price = COALESCE($6, min_price),
                max_price = COALESCE($7, max_price),
                preferred_color = COALESCE($8, preferred_color),
                max_mileage = COALESCE($9, max_mileage),
                updated_at = CURRENT_TIMESTAMP
            WHERE phone = $1
            RETURNING *
        `, [
            phone, name, email,
            preferences?.body_type,
            preferences?.brand,
            preferences?.min_price,
            preferences?.max_price,
            preferences?.color,
            preferences?.max_mileage
        ]);
        client = updateResult.rows[0];
    } else {
        // Create new client
        const insertResult = await pool.query(`
            INSERT INTO clients (
                name, phone, email, preferred_body_type, preferred_brand,
                min_price, max_price, preferred_color, max_mileage, source
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'chatbot')
            RETURNING *
        `, [
            name, phone, email,
            preferences?.body_type,
            preferences?.brand,
            preferences?.min_price,
            preferences?.max_price,
            preferences?.color,
            preferences?.max_mileage
        ]);
        client = insertResult.rows[0];
    }

    // Update existing interactions with client_id
    await pool.query(
        'UPDATE client_interactions SET client_id = $1 WHERE session_id = $2 AND client_id IS NULL',
        [client.id, session_id]
    );

    // Update existing searches with client_id
    await pool.query(
        'UPDATE client_searches SET client_id = $1 WHERE session_id = $2 AND client_id IS NULL',
        [client.id, session_id]
    );

    // Update existing car views with client_id
    await pool.query(
        'UPDATE car_views SET client_id = $1 WHERE session_id = $2 AND client_id IS NULL',
        [client.id, session_id]
    );

    return {
        client: client,
        message: "¡Gracias! Hemos guardado tu información. Un asesor se pondrá en contacto contigo pronto por WhatsApp.",
        follow_up: "¿Te gustaría que te mostremos algunos vehículos específicos basados en tus preferencias?"
    };
}

// Handle interaction logging
async function handleLogInteraction(session_id, user_message, bot_response, interaction_type, client_id = null) {
    const result = await pool.query(`
        INSERT INTO client_interactions (
            client_id, session_id, interaction_type, user_message, bot_response
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `, [client_id, session_id, interaction_type, user_message, bot_response]);

    return {
        interaction_logged: true,
        interaction_id: result.rows[0].id
    };
}

// Handle car details request
async function handleGetCarDetails(car_id, session_id, client_id = null) {
    const carResult = await pool.query(
        'SELECT * FROM cars WHERE id = $1 AND available = true',
        [car_id]
    );

    if (carResult.rows.length === 0) {
        return {
            error: "Car not found or not available",
            message: "Lo siento, ese vehículo ya no está disponible."
        };
    }

    const car = carResult.rows[0];

    // Log the car view
    await pool.query(
        `INSERT INTO car_views (car_id, client_id, session_id, view_source) 
         VALUES ($1, $2, $3, 'chatbot_details')`,
        [car_id, client_id, session_id]
    );

    // Format car details for chatbot response
    const formattedCar = {
        id: car.id,
        title: `${car.brand} ${car.model} ${car.year}`,
        price: `$${car.price.toLocaleString()}`,
        details: {
            tipo: car.body_type,
            color: car.color,
            kilometraje: `${car.mileage.toLocaleString()} km`,
            combustible: car.fuel_type,
            transmision: car.transmission,
            motor: car.engine_size ? `${car.engine_size}L` : 'N/A',
            puertas: car.doors
        },
        description: car.description,
        message: `Aquí tienes los detalles del ${car.brand} ${car.model} ${car.year}:`
    };

    return formattedCar;
}

// Handle natural language search
async function handleNaturalLanguageSearch(session_id, user_message, client_id = null) {
    // Extract search criteria from natural language
    const criteria = extractSearchCriteria(user_message.toLowerCase());

    // If no criteria extracted, provide help
    if (Object.keys(criteria).length === 0) {
        return {
            message: "No pude entender tu búsqueda. ¿Podrías ser más específico? Por ejemplo: 'Busco un SUV Toyota en color negro'",
            suggestions: [
                "SUV Toyota",
                "Sedán menos de 300,000",
                "Pickup Ford",
                "Auto azul bajo kilometraje"
            ]
        };
    }

    // Perform the search
    const searchResult = await handleCarSearch(session_id, criteria, client_id);

    return {
        ...searchResult,
        extracted_criteria: criteria,
        interpretation: `Busqué: ${formatCriteriaForUser(criteria)}`
    };
}

// Helper function to extract search criteria (same as in search.js)
function extractSearchCriteria(text) {
    const criteria = {};

    // Body type detection
    if (text.includes('suv') || text.includes('camioneta')) {
        criteria.body_type = 'suv';
    } else if (text.includes('sedan') || text.includes('sedán')) {
        criteria.body_type = 'sedan';
    } else if (text.includes('pickup') || text.includes('pick up')) {
        criteria.body_type = 'pickup';
    } else if (text.includes('hatchback') || text.includes('compacto')) {
        criteria.body_type = 'hatchback';
    } else if (text.includes('coupe') || text.includes('coupé') || text.includes('deportivo')) {
        criteria.body_type = 'coupe';
    }

    // Brand detection
    const brands = ['toyota', 'honda', 'ford', 'chevrolet', 'nissan', 'volkswagen', 'hyundai', 'mazda', 'subaru', 'kia', 'bmw', 'mercedes', 'audi', 'tesla', 'jeep'];
    for (const brand of brands) {
        if (text.includes(brand)) {
            criteria.brand = brand;
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
            criteria.color = colorValue;
            break;
        }
    }

    // Price detection
    const priceMatch = text.match(/(\d+),?(\d+)?/);
    if (priceMatch) {
        const price = parseInt(priceMatch[0].replace(',', ''));
        if (text.includes('menos de') || text.includes('under') || text.includes('máximo')) {
            criteria.max_price = price;
        } else if (text.includes('más de') || text.includes('over') || text.includes('mínimo')) {
            criteria.min_price = price;
        } else {
            criteria.max_price = price;
        }
    }

    // Mileage detection
    const mileageMatch = text.match(/(\d+),?(\d+)?\s*(km|kilómetros|millas)/);
    if (mileageMatch) {
        criteria.max_mileage = parseInt(mileageMatch[0].replace(/[^\d]/g, ''));
    }

    return criteria;
}

// Helper function to format criteria for user
function formatCriteriaForUser(criteria) {
    const parts = [];
    
    if (criteria.body_type) parts.push(`tipo: ${criteria.body_type}`);
    if (criteria.brand) parts.push(`marca: ${criteria.brand}`);
    if (criteria.color) parts.push(`color: ${criteria.color}`);
    if (criteria.max_price) parts.push(`precio máximo: $${criteria.max_price.toLocaleString()}`);
    if (criteria.min_price) parts.push(`precio mínimo: $${criteria.min_price.toLocaleString()}`);
    if (criteria.max_mileage) parts.push(`kilometraje máximo: ${criteria.max_mileage.toLocaleString()} km`);
    
    return parts.join(', ') || 'búsqueda general';
}

// POST /api/webhooks/n8n/analytics - Webhook for analytics requests
router.post('/n8n/analytics', async (req, res) => {
    try {
        const { metric_type, timeframe = '7' } = req.body;

        let result = {};

        switch (metric_type) {
            case 'daily_summary':
                result = await getDailySummary(parseInt(timeframe));
                break;
            case 'popular_searches':
                result = await getPopularSearches(parseInt(timeframe));
                break;
            case 'conversion_rate':
                result = await getConversionRate(parseInt(timeframe));
                break;
            default:
                return res.status(400).json({ error: 'Invalid metric_type' });
        }

        res.json({
            success: true,
            metric_type: metric_type,
            timeframe: `${timeframe} days`,
            data: result
        });

    } catch (error) {
        console.error('Analytics webhook error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Analytics helper functions
async function getDailySummary(days) {
    const result = await pool.query(`
        SELECT 
            COUNT(DISTINCT c.id) as new_leads,
            COUNT(DISTINCT cs.id) as total_searches,
            COUNT(DISTINCT cv.id) as total_views,
            COUNT(DISTINCT ci.session_id) as unique_sessions
        FROM clients c
        FULL OUTER JOIN client_searches cs ON c.created_at::date = cs.created_at::date
        FULL OUTER JOIN car_views cv ON c.created_at::date = cv.created_at::date
        FULL OUTER JOIN client_interactions ci ON c.created_at::date = ci.created_at::date
        WHERE (c.created_at >= NOW() - INTERVAL '${days} days'
           OR cs.created_at >= NOW() - INTERVAL '${days} days'
           OR cv.created_at >= NOW() - INTERVAL '${days} days'
           OR ci.created_at >= NOW() - INTERVAL '${days} days')
    `);

    return result.rows[0];
}

async function getPopularSearches(days) {
    const result = await pool.query(`
        SELECT 
            search_body_type,
            search_brand,
            COUNT(*) as search_count
        FROM client_searches 
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        AND (search_body_type IS NOT NULL OR search_brand IS NOT NULL)
        GROUP BY search_body_type, search_brand
        ORDER BY search_count DESC
        LIMIT 10
    `);

    return result.rows;
}

async function getConversionRate(days) {
    const result = await pool.query(`
        SELECT 
            COUNT(DISTINCT ci.session_id) as total_sessions,
            COUNT(DISTINCT c.id) as converted_sessions,
            ROUND(
                (COUNT(DISTINCT c.id)::decimal / COUNT(DISTINCT ci.session_id)) * 100, 
                2
            ) as conversion_rate
        FROM client_interactions ci
        LEFT JOIN clients c ON ci.session_id IN (
            SELECT DISTINCT ci2.session_id 
            FROM client_interactions ci2 
            WHERE ci2.client_id = c.id
        )
        WHERE ci.created_at >= NOW() - INTERVAL '${days} days'
    `);

    return result.rows[0];
}

module.exports = router;