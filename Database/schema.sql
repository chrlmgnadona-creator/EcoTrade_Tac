PRAGMA foreign_keys = ON;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    barangay TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. MATERIALS TABLE
CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    type TEXT NOT NULL,
    price REAL DEFAULT 0.0,
    quantity TEXT NOT NULL,
    description TEXT NOT NULL,
    barangay TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    owner_contact TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    image_url TEXT NOT NULL,
    date_posted TEXT NOT NULL,
    FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. REQUESTS TABLE
CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    item_title TEXT NOT NULL,
    requester_name TEXT NOT NULL,
    requester_contact TEXT NOT NULL,
    message TEXT NOT NULL,
    date_sent TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    FOREIGN KEY(item_id) REFERENCES materials(id) ON DELETE CASCADE
);

-- SAMPLE SEED DATA
INSERT OR IGNORE INTO users (id, name, email, password_hash, barangay) VALUES
('user-roberto', 'Capt. Roberto Romualdez', 'roberto@tacloban.gov.ph', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Brgy 88 (San Jose)'),
('user-101', 'Juan Dela Cruz', 'juan.tacloban@gmail.com', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Brgy 88 (San Jose)');

INSERT OR IGNORE INTO materials (id, title, category, type, price, quantity, description, barangay, owner_name, owner_contact, owner_id, image_url, date_posted) VALUES
('item-101', 'Corrugated Galvanized Iron Roofing Sheets (10 pcs)', 'Construction & Timber', 'FOR_SALE', 1500.0, '10 sheets (8ft length)', 'Slightly used roof iron sheets removed during house renovation in San Jose.', 'Brgy 88 (San Jose)', 'Capt. Roberto Romualdez', '0917-555-0192', 'user-roberto', 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?auto=format&fit=crop&w=600&q=80', '2026-03-24'),
('item-102', '200L High-Density Plastic Blue Drums', 'Plastics & Containers', 'FOR_TRADE', 0.0, '4 units', 'Clean chemical-free food-grade plastic drums. Excellent for rainwater harvesting.', 'Brgy 91 (Abucay)', 'Elena Mendoza', '0928-444-1188', 'user-101', 'https://images.unsplash.com/photo-1590247813693-5541d1c609fd?auto=format&fit=crop&w=600&q=80', '2026-03-25');

INSERT OR IGNORE INTO requests (id, item_id, item_title, requester_name, requester_contact, message, date_sent, status) VALUES
('req-1', 'item-102', '200L High-Density Plastic Blue Drums', 'Benjie Tan', '0917-999-4433', 'Hi! I have 3 bags of cement available. Can we trade for 2 blue drums?', '2026-03-26', 'Pending');