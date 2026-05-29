/**
 * Database initializer — runs automatically on every server startup.
 * Safe to run multiple times (uses IF NOT EXISTS and checks for existing data).
 */
const bcrypt = require('bcryptjs');

function init(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, city TEXT, state TEXT,
      address TEXT, phone TEXT, max_users INTEGER DEFAULT 10, active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS staff_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, location_id INTEGER REFERENCES locations(id),
      role TEXT NOT NULL DEFAULT 'salesperson', name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      active INTEGER DEFAULT 1, last_login TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT, location_id INTEGER NOT NULL REFERENCES locations(id),
      company_name TEXT NOT NULL, subdomain TEXT UNIQUE NOT NULL, pricing_tier INTEGER DEFAULT 1,
      active INTEGER DEFAULT 1, allow_invoice INTEGER DEFAULT 1, require_approval INTEGER DEFAULT 0,
      ai_enabled INTEGER DEFAULT 1, notes TEXT, created_by INTEGER REFERENCES staff_users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS customer_branding (
      id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
      logo_url TEXT, logo_text TEXT, primary_color TEXT DEFAULT '#DA532C',
      secondary_color TEXT DEFAULT '#1A1A2E', accent_color TEXT DEFAULT '#F5A623',
      font_family TEXT DEFAULT 'Inter', template TEXT DEFAULT 'minimal',
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS customer_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      provider TEXT NOT NULL, tag_id TEXT, tag_name TEXT, snippet TEXT,
      active INTEGER DEFAULT 0, updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(customer_id, provider)
    );
    CREATE TABLE IF NOT EXISTS customer_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'buyer', name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL, can_order INTEGER DEFAULT 1,
      active INTEGER DEFAULT 1, last_login TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS customer_addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      label TEXT, street TEXT NOT NULL, city TEXT NOT NULL, state TEXT NOT NULL,
      zip TEXT NOT NULL, country TEXT DEFAULT 'US', is_default INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, name TEXT NOT NULL,
      method TEXT DEFAULT 'web', color TEXT DEFAULT '#888888', icon TEXT DEFAULT '📦',
      active INTEGER DEFAULT 1, connected INTEGER DEFAULT 0, credentials_enc TEXT,
      schedule_enabled INTEGER DEFAULT 0, schedule_time TEXT DEFAULT '00:00',
      schedule_days TEXT DEFAULT 'mon,tue,wed,thu,fri,sat,sun',
      last_sync_at TEXT, last_sync_status TEXT, total_products INTEGER DEFAULT 0,
      sync_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS vendor_sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
      started_at TEXT DEFAULT (datetime('now')), finished_at TEXT, status TEXT,
      added INTEGER DEFAULT 0, updated INTEGER DEFAULT 0, removed INTEGER DEFAULT 0,
      errors INTEGER DEFAULT 0, duration_ms INTEGER, message TEXT
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT, vendor_id INTEGER REFERENCES vendors(id),
      name TEXT NOT NULL, sku TEXT, description TEXT, category TEXT, subcategory TEXT,
      price_tiers TEXT, base_price REAL, colors TEXT, sizes TEXT, imprint_methods TEXT,
      imprint_area TEXT, min_qty INTEGER DEFAULT 1, production_days INTEGER,
      rush_available INTEGER DEFAULT 0, supplier_name TEXT, supplier_sku TEXT,
      is_quote_only INTEGER DEFAULT 0, images TEXT, active INTEGER DEFAULT 0,
      last_synced_at TEXT, vendor_data TEXT,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_products_sku      ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_products_active   ON products(active);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE TABLE IF NOT EXISTS customer_pricing (
      id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      markup_type TEXT DEFAULT 'pct', markup_value REAL DEFAULT 0, sale_price REAL,
      setup_fee REAL DEFAULT 0, shipping_cost REAL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')), UNIQUE(customer_id, product_id)
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, order_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER REFERENCES customers(id), customer_user_id INTEGER REFERENCES customer_users(id),
      staff_user_id INTEGER REFERENCES staff_users(id), location_id INTEGER REFERENCES locations(id),
      status TEXT DEFAULT 'processing', invoice_status TEXT DEFAULT 'pending',
      subtotal REAL DEFAULT 0, shipping_cost REAL DEFAULT 0, setup_fee REAL DEFAULT 0,
      total REAL DEFAULT 0, ship_to_address TEXT, notes TEXT, internal_notes TEXT,
      placed_at TEXT DEFAULT (datetime('now')), shipped_at TEXT, delivered_at TEXT,
      invoice_sent_at TEXT, invoice_paid_at TEXT, updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_orders_customer  ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status    ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_placed    ON orders(placed_at);
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id), product_name TEXT, product_sku TEXT,
      quantity INTEGER NOT NULL, unit_price REAL NOT NULL, setup_fee REAL DEFAULT 0,
      line_total REAL NOT NULL, notes TEXT
    );
    CREATE TABLE IF NOT EXISTS order_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
      carrier TEXT, tracking_number TEXT, tracking_url TEXT, eta TEXT,
      entered_by INTEGER REFERENCES staff_users(id), entered_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT, location_id INTEGER REFERENCES locations(id),
      staff_id INTEGER REFERENCES staff_users(id), type TEXT, title TEXT NOT NULL,
      description TEXT, link TEXT, read INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER REFERENCES customers(id),
      staff_user_id INTEGER REFERENCES staff_users(id), mode TEXT DEFAULT 'customer',
      message_count INTEGER DEFAULT 0, topic TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed default data if empty
  const hasLoc = db.prepare('SELECT id FROM locations LIMIT 1').get();
  let locId;
  if (!hasLoc) {
    locId = db.prepare("INSERT INTO locations (name,city,state,max_users) VALUES ('Jonesboro, AR','Jonesboro','AR',10)").run().lastInsertRowid;
    console.log('✓ Created default location');
  } else {
    locId = hasLoc.id;
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@peregrinesolutions.com';
  const adminPass  = process.env.ADMIN_PASSWORD || 'Peregrine2024!';
  const hasAdmin = db.prepare('SELECT id FROM staff_users WHERE email=?').get(adminEmail);
  if (!hasAdmin) {
    db.prepare("INSERT INTO staff_users (location_id,role,name,email,password_hash,active) VALUES (NULL,'super_admin','Admin',?,?,1)")
      .run(adminEmail, bcrypt.hashSync(adminPass, 12));
    console.log(`✓ Created admin user: ${adminEmail}`);
  }

  // Seed default vendors
  const vendorSeeds = [
    { type:'asi_web',    name:'ASI ESP+',        method:'web', color:'#E37400', icon:'📦', time:'00:00' },
    { type:'sanmar',     name:'SanMar',          method:'web', color:'#1E40AF', icon:'👕', time:'00:30' },
    { type:'custom_web', name:'Hanes Wholesale', method:'web', color:'#DC2626', icon:'🎽', time:'01:00' },
  ];
  for (const v of vendorSeeds) {
    const ex = db.prepare('SELECT id FROM vendors WHERE name=?').get(v.name);
    if (!ex) db.prepare("INSERT INTO vendors (type,name,method,color,icon,active,schedule_time,schedule_enabled) VALUES (?,?,?,?,?,1,?,0)")
      .run(v.type,v.name,v.method,v.color,v.icon,v.time);
  }

  console.log(`✓ Database ready: ${db.prepare('SELECT COUNT(*) as c FROM products').get().c} products`);
}

module.exports = { init };

// Allow running directly: node server/db-init.js
if (require.main === module) {
  require('dotenv').config();
  const path = require('path');
  const fs   = require('fs');
  const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
  fs.mkdirSync(DATA_DIR, { recursive:true });
  const Database = require('better-sqlite3');
  const db = new Database(path.join(DATA_DIR, 'peregrine.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  init(db);
  db.close();
  console.log('Done.');
}
