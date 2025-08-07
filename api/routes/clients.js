const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');

// Validation schemas
const clientSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    phone: Joi.string().min(10).max(20).required(),
    email: Joi.string().email().optional(),
    preferred_body_type: Joi.string().valid('sedan', 'suv', 'hatchback', 'pickup', 'coupe').optional(),
    preferred_brand: Joi.string().min(2).max(50).optional(),
    min_price: Joi.number().min(0).optional(),
    max_price: Joi.number().min(0).optional(),
    preferred_color: Joi.string().min(3).max(30).optional(),
    max_mileage: Joi.number().min(0).optional(),
    contact_method: Joi.string().valid('whatsapp', 'phone', 'email').default('whatsapp'),
    notes: Joi.string().max(1000).optional(),
    source: Joi.string().max(50).default('chatbot'),
    session_id: Joi.string().optional()
});

const interactionSchema = Joi.object({
    client_id: Joi.number().optional(),
    session_id: Joi.string().required(),
    interaction_type: Joi.string().required(),
    user_message: Joi.string().max(2000).optional(),
    bot_response: Joi.string().max(2000).optional(),
    extracted_data: Joi.object().optional()
});

// POST /api/clients - Create new client/lead
router.post('/', async (req, res) => {
    try {
        const { error, value } = clientSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        // Check if client already exists by phone
        const existingClient = await pool.query(
            'SELECT id, name, phone FROM clients WHERE phone = $1',
            [value.phone]
        );

        if (existingClient.rows.length > 0) {
            // Update existing client with new preferences
            const updateQuery = `
                UPDATE clients SET 
                    name = COALESCE($2, name),
                    email = COALESCE($3, email),
                    preferred_body_type = COALESCE($4, preferred_body_type),
                    preferred_brand = COALESCE($5, preferred_brand),
                    min_price = COALESCE($6, min_price),
                    max_price = COALESCE($7, max_price),
                    preferred_color = COALESCE($8, preferred_color),
                    max_mileage = COALESCE($9, max_mileage),
                    contact_method = COALESCE($10, contact_method),
                    notes = COALESCE($11, notes),
                    source = COALESCE($12, source),
                    updated_at = CURRENT_TIMESTAMP
                WHERE phone = $1
                RETURNING *
            `;

            const result = await pool.query(updateQuery, [
                value.phone, value.name, value.email, value.preferred_body_type,
                value.preferred_brand, value.min_price, value.max_price,
                value.preferred_color, value.max_mileage, value.contact_method,
                value.notes, value.source
            ]);

            return res.json({
                message: 'Client updated successfully',
                client: result.rows[0],
                is_new: false
            });
        }

        // Create new client
        const insertQuery = `
            INSERT INTO clients (
                name, phone, email, preferred_body_type, preferred_brand,
                min_price, max_price, preferred_color, max_mileage,
                contact_method, notes, source
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;

        const result = await pool.query(insertQuery, [
            value.name, value.phone, value.email, value.preferred_body_type,
            value.preferred_brand, value.min_price, value.max_price,
            value.preferred_color, value.max_mileage, value.contact_method,
            value.notes, value.source
        ]);

        res.status(201).json({
            message: 'Client created successfully',
            client: result.rows[0],
            is_new: true
        });

    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ error: 'Error creating client' });
    }
});

// POST /api/clients/interaction - Log client interaction
router.post('/interaction', async (req, res) => {
    try {
        const { error, value } = interactionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const insertQuery = `
            INSERT INTO client_interactions (
                client_id, session_id, interaction_type, user_message, 
                bot_response, extracted_data
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const result = await pool.query(insertQuery, [
            value.client_id, value.session_id, value.interaction_type,
            value.user_message, value.bot_response, 
            value.extracted_data ? JSON.stringify(value.extracted_data) : null
        ]);

        res.status(201).json({
            message: 'Interaction logged successfully',
            interaction: result.rows[0]
        });

    } catch (error) {
        console.error('Error logging interaction:', error);
        res.status(500).json({ error: 'Error logging interaction' });
    }
});

// GET /api/clients/:id - Get client details
router.get('/:id', async (req, res) => {
    try {
        const clientId = parseInt(req.params.id);
        
        if (isNaN(clientId)) {
            return res.status(400).json({ error: 'Invalid client ID' });
        }

        const result = await pool.query(
            'SELECT * FROM clients WHERE id = $1',
            [clientId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.json({ client: result.rows[0] });

    } catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).json({ error: 'Error retrieving client' });
    }
});

// GET /api/clients/:id/interactions - Get client interaction history
router.get('/:id/interactions', async (req, res) => {
    try {
        const clientId = parseInt(req.params.id);
        
        if (isNaN(clientId)) {
            return res.status(400).json({ error: 'Invalid client ID' });
        }

        const result = await pool.query(
            `SELECT * FROM client_interactions 
             WHERE client_id = $1 
             ORDER BY created_at DESC`,
            [clientId]
        );

        res.json({ 
            interactions: result.rows,
            total: result.rows.length 
        });

    } catch (error) {
        console.error('Error fetching interactions:', error);
        res.status(500).json({ error: 'Error retrieving interactions' });
    }
});

// GET /api/clients/session/:session_id - Get client by session ID
router.get('/session/:session_id', async (req, res) => {
    try {
        const sessionId = req.params.session_id;

        // First try to find client by session_id in interactions
        const interactionResult = await pool.query(
            `SELECT DISTINCT client_id FROM client_interactions 
             WHERE session_id = $1 AND client_id IS NOT NULL 
             ORDER BY created_at DESC LIMIT 1`,
            [sessionId]
        );

        if (interactionResult.rows.length > 0) {
            const clientResult = await pool.query(
                'SELECT * FROM clients WHERE id = $1',
                [interactionResult.rows[0].client_id]
            );

            if (clientResult.rows.length > 0) {
                return res.json({ client: clientResult.rows[0] });
            }
        }

        res.status(404).json({ error: 'No client found for this session' });

    } catch (error) {
        console.error('Error fetching client by session:', error);
        res.status(500).json({ error: 'Error retrieving client' });
    }
});

// PUT /api/clients/:id/status - Update client status
router.put('/:id/status', async (req, res) => {
    try {
        const clientId = parseInt(req.params.id);
        const { status, notes } = req.body;

        if (isNaN(clientId)) {
            return res.status(400).json({ error: 'Invalid client ID' });
        }

        const validStatuses = ['new', 'contacted', 'qualified', 'sold', 'lost'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                error: 'Invalid status', 
                valid_statuses: validStatuses 
            });
        }

        const result = await pool.query(
            `UPDATE clients SET 
                status = $2, 
                notes = COALESCE($3, notes),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 
             RETURNING *`,
            [clientId, status, notes]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.json({
            message: 'Client status updated successfully',
            client: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating client status:', error);
        res.status(500).json({ error: 'Error updating client status' });
    }
});

// GET /api/clients - Get all clients with pagination and filters
router.get('/', async (req, res) => {
    try {
        const {
            status = 'all',
            source = 'all',
            limit = 20,
            offset = 0
        } = req.query;

        let query = 'SELECT * FROM clients';
        let params = [];
        let whereConditions = [];

        if (status !== 'all') {
            whereConditions.push(`status = $${params.length + 1}`);
            params.push(status);
        }

        if (source !== 'all') {
            whereConditions.push(`source = $${params.length + 1}`);
            params.push(source);
        }

        if (whereConditions.length > 0) {
            query += ' WHERE ' + whereConditions.join(' AND ');
        }

        query += ' ORDER BY created_at DESC';
        
        // Add pagination
        query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM clients';
        let countParams = [];

        if (status !== 'all') {
            countQuery += ' WHERE status = $1';
            countParams.push(status);
        }

        if (source !== 'all') {
            if (countParams.length > 0) {
                countQuery += ' AND source = $2';
            } else {
                countQuery += ' WHERE source = $1';
            }
            countParams.push(source);
        }

        const countResult = await pool.query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0].count);

        res.json({
            clients: result.rows,
            pagination: {
                total: totalCount,
                limit: parseInt(limit),
                offset: parseInt(offset),
                pages: Math.ceil(totalCount / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: 'Error retrieving clients' });
    }
});

module.exports = router;