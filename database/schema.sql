-- Car Dealership Database Schema
-- PostgreSQL Database Setup

-- Create database (run this separately if needed)
-- CREATE DATABASE car_dealership;

-- Create tables for car inventory and client data

-- Cars table with all important attributes
CREATE TABLE cars (
    id SERIAL PRIMARY KEY,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    body_type VARCHAR(20) NOT NULL, -- sedan, suv, hatchback, pickup, coupe
    color VARCHAR(30) NOT NULL,
    mileage INTEGER NOT NULL, -- in kilometers
    price DECIMAL(10,2) NOT NULL,
    fuel_type VARCHAR(20) DEFAULT 'gasoline', -- gasoline, diesel, hybrid, electric
    transmission VARCHAR(20) DEFAULT 'manual', -- manual, automatic
    engine_size DECIMAL(3,1), -- in liters
    doors INTEGER DEFAULT 4,
    available BOOLEAN DEFAULT true,
    vin VARCHAR(17) UNIQUE,
    description TEXT,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients table for lead capture and analytics
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    preferred_body_type VARCHAR(20), -- what they're looking for
    preferred_brand VARCHAR(50),
    min_price DECIMAL(10,2),
    max_price DECIMAL(10,2),
    preferred_color VARCHAR(30),
    max_mileage INTEGER,
    contact_method VARCHAR(20) DEFAULT 'whatsapp', -- whatsapp, phone, email
    status VARCHAR(20) DEFAULT 'new', -- new, contacted, qualified, sold, lost
    notes TEXT,
    source VARCHAR(50) DEFAULT 'chatbot', -- chatbot, website, referral, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client searches table to track what clients are looking for
CREATE TABLE client_searches (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    session_id VARCHAR(100), -- for anonymous searches before lead capture
    search_body_type VARCHAR(20),
    search_brand VARCHAR(50),
    search_min_price DECIMAL(10,2),
    search_max_price DECIMAL(10,2),
    search_color VARCHAR(30),
    search_max_mileage INTEGER,
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client interactions table for chatbot conversation tracking
CREATE TABLE client_interactions (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    session_id VARCHAR(100),
    interaction_type VARCHAR(50), -- greeting, search, contact_capture, etc.
    user_message TEXT,
    bot_response TEXT,
    extracted_data JSONB, -- structured data extracted from conversation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Car views table to track which cars clients are interested in
CREATE TABLE car_views (
    id SERIAL PRIMARY KEY,
    car_id INTEGER REFERENCES cars(id),
    client_id INTEGER REFERENCES clients(id),
    session_id VARCHAR(100),
    view_source VARCHAR(50) DEFAULT 'chatbot', -- chatbot, website, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_cars_body_type ON cars(body_type);
CREATE INDEX idx_cars_brand ON cars(brand);
CREATE INDEX idx_cars_price ON cars(price);
CREATE INDEX idx_cars_available ON cars(available);
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_client_searches_session ON client_searches(session_id);
CREATE INDEX idx_client_interactions_session ON client_interactions(session_id);
CREATE INDEX idx_car_views_car_id ON car_views(car_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON cars
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();