
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./config/database');

const inventoryRoutes = require('./routes/inventory');
const carRoutes = require('./routes/cars');

const app = express();
const port = 3000;

// Serve static files from the project root
app.use(express.static(path.join(__dirname, '..')));

app.use(express.json());
app.use(cors());

// API Routes
app.use('/api/inventory', inventoryRoutes);
app.use('/api/cars', carRoutes);

// API endpoint to get all clients (formerly leads)
app.get('/api/clients', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT name, phone, preferred_body_type AS "vehicleType", created_at AS "timestamp" FROM clients ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint to add a new client (formerly lead)
app.post('/api/clients', async (req, res) => {
    const { name, phone, vehicleType, priceRange, timestamp } = req.body;

    try {
        const { rows } = await pool.query(
            'INSERT INTO clients (name, phone, preferred_body_type, max_price, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, phone, vehicleType, priceRange, timestamp]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error inserting client:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
