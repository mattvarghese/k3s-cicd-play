CREATE TABLE IF NOT EXISTS shopping_items (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed data for initial testing
INSERT INTO shopping_items (username, item_name, quantity) 
VALUES ('matt', 'Gallon of Milk', 1), ('matt', 'Eggs', 12);
