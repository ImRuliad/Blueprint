/**
 * Seed script — creates a mock SQLite database for testing.
 * Run with: bun tests/database/seed-mock.ts
 */
import { Database } from 'bun:sqlite';
import { join } from 'path';

const DB_PATH = join(import.meta.dir, 'mock.db');

// Remove existing DB so we start fresh
const fs = await import('fs');
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

const db = new Database(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// --- Schema ---

db.exec(`
  CREATE TABLE customers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE,
    tier        TEXT    NOT NULL DEFAULT 'free' CHECK(tier IN ('free','pro','enterprise')),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    sku         TEXT    NOT NULL UNIQUE,
    name        TEXT    NOT NULL,
    price_cents INTEGER NOT NULL CHECK(price_cents >= 0),
    stock       INTEGER NOT NULL DEFAULT 0,
    category    TEXT
  )
`);

db.exec(`
  CREATE TABLE orders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id   INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    status        TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','shipped','delivered','cancelled')),
    total_cents   INTEGER NOT NULL DEFAULT 0,
    ordered_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE order_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id),
    quantity    INTEGER NOT NULL CHECK(quantity > 0),
    unit_price  INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE VIEW order_summary AS
  SELECT
    o.id            AS order_id,
    c.name          AS customer_name,
    o.status,
    o.total_cents,
    COUNT(oi.id)    AS item_count,
    o.ordered_at
  FROM orders o
  JOIN customers c   ON c.id = o.customer_id
  JOIN order_items oi ON oi.order_id = o.id
  GROUP BY o.id
`);

db.exec(`CREATE INDEX idx_orders_customer ON orders(customer_id)`);
db.exec(`CREATE INDEX idx_order_items_order ON order_items(order_id)`);

// --- Seed data ---

const insertCustomer = db.prepare(
  `INSERT INTO customers (name, email, tier, created_at) VALUES (?, ?, ?, ?)`
);
const customers = [
  ['Alice Johnson',   'alice@example.com',    'enterprise', '2025-01-15 09:30:00'],
  ['Bob Chen',        'bob@example.com',      'pro',        '2025-02-20 14:15:00'],
  ['Carol Williams',  'carol@example.com',    'free',       '2025-03-10 11:00:00'],
  ['David Park',      'david@example.com',    'pro',        '2025-04-05 16:45:00'],
  ['Eva Martinez',    'eva@example.com',      'enterprise', '2025-05-01 08:00:00'],
  ['Frank O\'Brien',  'frank@example.com',    'free',       '2025-06-12 10:30:00'],
  ['Grace Kim',       'grace@example.com',    'pro',        '2025-07-08 13:20:00'],
  ['Hiro Tanaka',     'hiro@example.com',     'enterprise', '2025-08-22 15:10:00'],
];
for (const c of customers) insertCustomer.run(...c);

const insertProduct = db.prepare(
  `INSERT INTO products (sku, name, price_cents, stock, category) VALUES (?, ?, ?, ?, ?)`
);
const products = [
  ['WDG-001', 'Quantum Widget',      2999,  150, 'widgets'],
  ['WDG-002', 'Nano Widget',         1499,  300, 'widgets'],
  ['GAD-001', 'Hyper Gadget',        7999,   45, 'gadgets'],
  ['GAD-002', 'Micro Gadget',        3499,  200, 'gadgets'],
  ['ACC-001', 'Universal Adapter',    999,  500, 'accessories'],
  ['ACC-002', 'Premium Cable Kit',   2499,  120, 'accessories'],
  ['SFT-001', 'Pro License (1yr)',  14999,   -1, 'software'],
  ['SFT-002', 'Team License (1yr)', 49999,   -1, 'software'],
];
for (const p of products) insertProduct.run(...p);

const insertOrder = db.prepare(
  `INSERT INTO orders (customer_id, status, total_cents, ordered_at) VALUES (?, ?, ?, ?)`
);
const insertItem = db.prepare(
  `INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)`
);

const orders: [number, string, number, string, [number, number, number][]][] = [
  [1, 'delivered',  5498,  '2025-06-01 10:00:00', [[1, 1, 2999], [5, 1, 999], [6, 1, 2499]]],
  [2, 'shipped',    7999,  '2025-06-15 11:30:00', [[3, 1, 7999]]],
  [3, 'pending',    2998,  '2025-07-01 09:00:00', [[2, 2, 1499]]],
  [4, 'delivered', 14999,  '2025-07-10 14:00:00', [[7, 1, 14999]]],
  [5, 'shipped',   10497,  '2025-07-20 16:00:00', [[4, 3, 3499]]],
  [1, 'pending',   49999,  '2025-08-01 08:00:00', [[8, 1, 49999]]],
  [6, 'cancelled',  1499,  '2025-08-05 12:00:00', [[2, 1, 1499]]],
  [7, 'delivered',  3998,  '2025-08-12 10:30:00', [[5, 2, 999], [2, 1, 1499]]],
  [8, 'shipped',   15998,  '2025-08-20 09:45:00', [[1, 2, 2999], [3, 1, 7999]]],
  [2, 'pending',    4998,  '2025-09-01 11:00:00', [[6, 2, 2499]]],
];

for (const [custId, status, total, date, items] of orders) {
  insertOrder.run(custId, status, total, date);
  const orderId = db.query('SELECT last_insert_rowid() as id').get() as { id: number };
  for (const [prodId, qty, price] of items) {
    insertItem.run(orderId.id, prodId, qty, price);
  }
}

db.close();

console.log(`Mock database created at: ${DB_PATH}`);
console.log('  8 customers, 8 products, 10 orders, 13 order items, 1 view');
