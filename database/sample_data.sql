-- Clear existing data to prevent conflicts
TRUNCATE TABLE sales, clients, cars RESTART IDENTITY CASCADE;

-- Step 1: Generate 50 clients first
INSERT INTO clients (name, phone, email)
SELECT
    'Client ' || s.id,
    '555-' || lpad(floor(random()*100)::text, 3, '0') || '-' || lpad(floor(random()*10000)::text, 4, '0'),
    'client' || s.id || '@example.com'
FROM generate_series(1, 50) AS s(id);

-- Step 2: Generate 200 cars
INSERT INTO cars (brand, model, year, body_type, color, mileage, price, purchase_date, purchase_price, available)
SELECT
    (ARRAY['Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan', 'Jeep', 'Hyundai', 'Kia'])[1 + floor(random() * 8)] AS brand,
    'Model ' || (ARRAY['A', 'B', 'C', 'X', 'Z'])[1 + floor(random() * 5)] AS model,
    2018 + floor(random() * 6) AS year,
    (ARRAY['Sedan', 'SUV', 'Pickup', 'Hatchback'])[1 + floor(random() * 4)] AS body_type,
    (ARRAY['White', 'Black', 'Silver', 'Blue', 'Red', 'Gray'])[1 + floor(random() * 6)] AS color,
    floor(random() * 80000 + 10000)::int AS mileage,
    (floor(random() * 25000 + 15000)::int) * 1.2 AS price, -- Price is 20% over purchase
    NOW() - (floor(random() * 500) * INTERVAL '1 day') AS purchase_date,
    floor(random() * 25000 + 15000)::int AS purchase_price,
    (random() > 0.4) -- ~60% of cars are available
FROM generate_series(1, 200);

-- Step 3: Generate sales only for cars marked as unavailable, ensuring valid client_id
WITH sold_cars AS (
    SELECT id, purchase_date, price FROM cars WHERE available = false
)
INSERT INTO sales (car_id, client_id, sale_price, sale_date)
SELECT
    s.id,
    -- Use modulo to guarantee client_id is between 1 and 50
    (mod(s.id, 50) + 1)::int,
    s.price * (0.95 + random() * 0.1), -- Sale price is between 95% and 105% of asking price
    s.purchase_date + (floor(random() * 90 + 10) * INTERVAL '1 day') -- Sold 10-100 days after purchase
FROM sold_cars s;