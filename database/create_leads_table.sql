CREATE TABLE leads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(50),
    price_range VARCHAR(50),
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);