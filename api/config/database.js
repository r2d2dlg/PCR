const { Pool } = require('pg');

const pool = new Pool({
    user: 'arturodlg',
    host: 'localhost',
    database: 'car_rental',
    password: 'Cometa?01',
    port: 5432,
});

module.exports = pool;