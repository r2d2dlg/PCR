-- Add purchase_date and purchase_price to cars table
ALTER TABLE cars
ADD COLUMN purchase_date TIMESTAMPTZ,
ADD COLUMN purchase_price DECIMAL(10, 2);

-- Create sales table
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    car_id INTEGER REFERENCES cars(id) NOT NULL,
    client_id INTEGER REFERENCES clients(id) NOT NULL,
    sale_price DECIMAL(10, 2) NOT NULL,
    sale_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_sales_car_id ON sales(car_id);
CREATE INDEX idx_sales_client_id ON sales(client_id);