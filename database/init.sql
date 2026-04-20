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

-- NOTE: shopping_db database is created by 
--       POSTGRES_DB: shopping_db   in docker-compose.yaml and by
--       - name: POSTGRES_DB \ value: "shopping_db"   in k8s/db-deploy.yaml

-- keycloak_db is used by the keycloak container
CREATE DATABASE keycloak_db;
