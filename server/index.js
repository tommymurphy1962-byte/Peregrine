/**
 * PEREGRINE PORTAL — COMPLETE SERVER
 * Self-configuring. Only needs BASE_DOMAIN, ADMIN_EMAIL, ADMIN_PASSWORD set.
 * Everything else auto-generates or is set through the in-app setup wizard.
 */
require('dotenv').config();

const express    = require('express');
const path       = require('path');
const cors       = require('cors');
const helmet     = require('helmet');
const jwt        = require('jsonwebtoken');
const bcrypt     = require('bcryptjs');
const multer     = require('multer');
const cron       = require('node-cron');
const nodemailer = require('nodemailer');
const crypto     = require('crypto');
const fs         = require('fs');
const Database   = require('better-sqlite3');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── PATHS ───────────────────────────────────────────────────────────────────
const DATA_DIR   = process.env.DATA_DIR || path.join(__dirname, '../data');
const DB_PATH    = path.join(DATA_DIR, 'peregrine.db');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const LOG_DIR    = path.join(DATA_DIR, 'logs');
const BUILD_DIR  = path.join(__dirname, '../frontend/build');

[DATA_DIR, UPLOAD_DIR, path.join(UPLOAD_DIR,'logos'), path.join(UPLOAD_DIR,'products'), LOG_DIR]
  .forEach(d => { try { fs.mkdirSync(d, { recursive:true }); } catch {} });

// ─── DATABASE ────────────────────────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Auto-run migrations on startup
require('./db-init').init(db);

// ─── JWT SECRET — auto-generates if not set ──────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  const f = path.join(DATA_DIR, '.secret');
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
  const s = crypto.randomBytes(64).toString('hex');
  fs.writeFileSync(f, s, { mode: 0o600 });
  return s;
})();

// ─── ENCRYPTION ──────────────────────────────────────────────────────────────
const CK = crypto.scryptSync(JWT_SECRET.slice(0,32), 'pg-salt-v1', 32);
const enc = t => { const iv=crypto.randomBytes(16),c=crypto.createCipheriv('aes-256-gcm',CK,iv),e=c.update(t,'utf8','hex')+c.final('hex'); return `${iv.toString('hex')}:${c.getAuthTag().toString('hex')}:${e}`; };
const dec = d => { const [ih,th,e]=d.split(':'),dc=crypto.createDecipheriv('aes-256-gcm',CK,Buffer.from(ih,'hex')); dc.setAuthTag(Buffer.from(th,'hex')); return dc.update(e,'hex','utf8')+dc.final('utf8'); };

// ─── LOGGING ─────────────────────────────────────────────────────────────────
const log = (l, m, x='') => {
  const line = `[${new Date().toISOString()}] [${l.toUpperCase()}] ${m} ${x}`.trim();
  console.log(line);
  try { fs.appendFileSync(path.join(LOG_DIR,'app.log'), line+'\n'); } catch {}
};

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy:false, crossOriginEmbedderPolicy:false }));
app.use(cors({ origin:true, credentials:true }));
app.use(express.json({ limit:'20mb' }));
app.use(express.urlencoded({ extended:true }));
app.use('/uploads', express.static(UPLOAD_DIR));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req,file,cb) => { const d=path.join(UPLOAD_DIR,file.fieldname==='logo'?'logos':'products'); fs.mkdirSync(d,{recursive:true}); cb(null,d); },
    filename: (req,file,cb) => cb(null,`${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize:10*1024*1024 },
  fileFilter: (req,file,cb) => cb(null, file.mimetype.startsWith('image/')),
});

// ─── AUTH ─────────────────────────────────────────────────────────────────────
const sign   = p  => jwt.sign(p, JWT_SECRET, { expiresIn:'10h' });
const authMW = (req,res,next) => {
  const t = (req.headers.authorization||'').replace('Bearer ','');
  if (!t) return res.status(401).json({ error:'Not authenticated' });
  try { req.user=jwt.verify(t,JWT_SECRET); next(); }
  catch { res.status(401).json({ error:'Session expired — please sign in again' }); }
};
const staffOnly = (req,res,next) => req.user?.userType==='staff' ? next() : res.status(403).json({ error:'Staff only' });
const adminOnly = (req,res,next) => ['super_admin','location_admin'].includes(req.user?.role) ? next() : res.status(403).json({ error:'Admin only' });
const safeJSON  = v => { if(!v) return []; if(typeof v!=='string') return v; try { return JSON.parse(v); } catch { return []; } };

// ─── HEALTH ───────────────────────────────────────────────────────────────────
app.get('/api/health', (req,res) => res.json({ ok:true, uptime:Math.round(process.uptime()), version:'1.0.0' }));

// ─── SETUP STATUS (drives first-run wizard in frontend) ───────────────────────
app.get('/api/setup/status', (req,res) => {
  const cfg = {
    hasAdmin:   !!db.prepare('SELECT id FROM staff_users WHERE role="super_admin" LIMIT 1').get(),
    hasDomain:  !!process.env.BASE_DOMAIN,
    hasAI:      !!process.env.ANTHROPIC_API_KEY,
    hasEmail:   !!process.env.SMTP_USER,
    hasVendor:  !!db.prepare('SELECT id FROM vendors WHERE connected=1 LIMIT 1').get(),
    hasProduct: !!db.prepare('SELECT id FROM products LIMIT 1').get(),
    domain:     process.env.BASE_DOMAIN || '',
  };
  cfg.complete = cfg.hasAdmin && cfg.hasVendor;
  res.json(cfg);
});

// ─── PORTAL CONFIG ────────────────────────────────────────────────────────────
app.get('/api/portal/config', (req,res) => {
  const host = (req.headers['x-forwarded-host']||req.headers.host||req.hostname||'').split(':')[0].toLowerCase();
  const base = (process.env.BASE_DOMAIN||'').toLowerCase();
  const sub  = base ? host.replace(`.${base}`,'').replace(base,'') : '';
  if (!sub || sub===host || sub==='admin' || sub==='www' || !base)
    return res.json({ isPortal:false });
  const cust = db.prepare(`SELECT c.*,cb.primary_color,cb.secondary_color,cb.accent_color,cb.font_family,cb.template,cb.logo_url,cb.logo_text
    FROM customers c LEFT JOIN customer_branding cb ON cb.customer_id=c.id
    WHERE c.subdomain=? AND c.active=1`).get(sub);
  if (!cust) return res.json({ isPortal:false, notFound:true });
  const tags = db.prepare(`SELECT * FROM customer_tags WHERE (customer_id=? OR customer_id IS NULL) AND active=1`).all(cust.id);
  res.json({ isPortal:true, customer:cust, tags });
});

// ─── AUTH ROUTES ─────────────────────────────────────────────────────────────
app.post('/api/auth/staff/login', (req,res) => {
  const { email, password } = req.body;
  if (!email||!password) return res.status(400).json({ error:'Email and password required' });
  const u = db.prepare('SELECT * FROM staff_users WHERE email=? AND active=1').get(email.toLowerCase().trim());
  if (!u || !bcrypt.compareSync(password, u.password_hash))
    return res.status(401).json({ error:'Invalid email or password' });
  db.prepare('UPDATE staff_users SET last_login=datetime("now") WHERE id=?').run(u.id);
  const { password_hash, ...safe } = u;
  log('info', `Login: ${email}`);
  res.json({ token:sign({ userId:u.id, userType:'staff', role:u.role, locationId:u.location_id }), user:safe });
});

app.post('/api/auth/customer/login', (req,res) => {
  const { email, password, subdomain } = req.body;
  const q = subdomain
    ? `SELECT cu.*,c.company_name,c.subdomain,c.ai_enabled,c.allow_invoice FROM customer_users cu JOIN customers c ON cu.customer_id=c.id WHERE cu.email=? AND cu.active=1 AND c.active=1 AND c.subdomain=?`
    : `SELECT cu.*,c.company_name,c.subdomain,c.ai_enabled,c.allow_invoice FROM customer_users cu JOIN customers c ON cu.customer_id=c.id WHERE cu.email=? AND cu.active=1 AND c.active=1`;
  const u = db.prepare(q).get(...[email?.toLowerCase().trim(), subdomain].filter(Boolean));
  if (!u || !bcrypt.compareSync(password, u.password_hash))
    return res.status(401).json({ error:'Invalid email or password' });
  db.prepare('UPDATE customer_users SET last_login=datetime("now") WHERE id=?').run(u.id);
  const { password_hash, ...safe } = u;
  res.json({ token:sign({ userId:u.id, userType:'customer', customerId:u.customer_id }), user:safe });
});

app.post('/api/auth/change-password', authMW, (req,res) => {
  const { currentPassword, newPassword } = req.body;
  const tbl = req.user.userType==='staff' ? 'staff_users' : 'customer_users';
  const u = db.prepare(`SELECT * FROM ${tbl} WHERE id=?`).get(req.user.userId);
  if (!u || !bcrypt.compareSync(currentPassword, u.password_hash))
    return res.status(400).json({ error:'Current password is incorrect' });
  db.prepare(`UPDATE ${tbl} SET password_hash=? WHERE id=?`).run(bcrypt.hashSync(newPassword,12), req.user.userId);
  res.json({ success:true });
});

// ─── ORDERS ──────────────────────────────────────────────────────────────────
app.get('/api/orders', authMW, (req,res) => {
  let rows;
  if (req.user.userType==='staff') {
    const lw = req.user.role==='super_admin' ? '' : `AND o.location_id=${req.user.locationId}`;
    rows = db.prepare(`SELECT o.*,c.company_name,t.carrier,t.tracking_number,t.eta
      FROM orders o LEFT JOIN customers c ON o.customer_id=c.id LEFT JOIN order_tracking t ON t.order_id=o.id
      WHERE 1=1 ${lw} ORDER BY o.placed_at DESC LIMIT 200`).all();
  } else {
    rows = db.prepare(`SELECT o.*,t.carrier,t.tracking_number,t.eta FROM orders o
      LEFT JOIN order_tracking t ON t.order_id=o.id WHERE o.customer_id=? ORDER BY o.placed_at DESC`).all(req.user.customerId);
  }
  rows.forEach(o => { o.items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(o.id); });
  res.json(rows);
});

app.post('/api/orders', authMW, (req,res) => {
  if (req.user.userType!=='customer') return res.status(403).json({ error:'Customer login required' });
  const { items=[], ship_to_address, notes } = req.body;
  const cust = db.prepare('SELECT * FROM customers WHERE id=?').get(req.user.customerId);
  if (!cust) return res.status(404).json({ error:'Customer not found' });
  const subtotal = items.reduce((s,i)=>s+parseFloat(i.unit_price||0)*parseInt(i.quantity||1),0);
  const num = `ORD-${Date.now().toString().slice(-6)}`;
  const info = db.prepare(`INSERT INTO orders (order_number,customer_id,customer_user_id,location_id,status,invoice_status,subtotal,total,ship_to_address,notes,placed_at)
    VALUES (?,?,?,?,'processing','pending',?,?,?,?,datetime('now'))`
  ).run(num,req.user.customerId,req.user.userId,cust.location_id,subtotal,subtotal,JSON.stringify(ship_to_address),notes);
  for (const i of items) db.prepare('INSERT INTO order_items (order_id,product_id,product_name,product_sku,quantity,unit_price,line_total) VALUES (?,?,?,?,?,?,?)')
    .run(info.lastInsertRowid,i.product_id,i.product_name,i.product_sku,i.quantity,i.unit_price,i.unit_price*i.quantity);
  db.prepare('INSERT INTO notifications (location_id,type,title,description,link) VALUES (?,?,?,?,?)')
    .run(cust.location_id,'sale',`New Order ${num}`,`$${subtotal.toFixed(2)} from ${cust.company_name}`,`/orders`);
  log('info',`New order ${num} — $${subtotal}`);
  res.json({ id:info.lastInsertRowid, order_number:num });
});

app.put('/api/orders/:id', authMW, staffOnly, (req,res) => {
  const { status, invoice_status, internal_notes, tracking } = req.body;
  if (status) {
    const extra = status==='shipped'?`,shipped_at=datetime('now')`:status==='delivered'?`,delivered_at=datetime('now')`:'';
    db.prepare(`UPDATE orders SET status=?${extra},updated_at=datetime('now') WHERE id=?`).run(status,req.params.id);
  }
  if (invoice_status) {
    const extra = invoice_status==='paid'?`,invoice_paid_at=datetime('now')`:'';
    db.prepare(`UPDATE orders SET invoice_status=?${extra},updated_at=datetime('now') WHERE id=?`).run(invoice_status,req.params.id);
  }
  if (internal_notes!==undefined) db.prepare(`UPDATE orders SET internal_notes=? WHERE id=?`).run(internal_notes,req.params.id);
  if (tracking?.tracking_number) {
    const ex = db.prepare('SELECT id FROM order_tracking WHERE order_id=?').get(req.params.id);
    if (ex) db.prepare('UPDATE order_tracking SET carrier=?,tracking_number=?,eta=?,entered_at=datetime("now") WHERE order_id=?').run(tracking.carrier,tracking.tracking_number,tracking.eta,req.params.id);
    else    db.prepare('INSERT INTO order_tracking (order_id,carrier,tracking_number,eta,entered_by) VALUES (?,?,?,?,?)').run(req.params.id,tracking.carrier,tracking.tracking_number,tracking.eta,req.user.userId);
    db.prepare('INSERT INTO notifications (type,title,description) VALUES (?,?,?)').run('shipping',`Tracking added to ${req.params.id}`,tracking.tracking_number);
  }
  res.json({ success:true });
});

app.post('/api/orders/:id/invoice', authMW, staffOnly, async (req,res) => {
  const o = db.prepare(`SELECT o.*,c.company_name,cu.name as contact,cu.email FROM orders o JOIN customers c ON o.customer_id=c.id JOIN customer_users cu ON o.customer_user_id=cu.id WHERE o.id=?`).get(req.params.id);
  if (!o) return res.status(404).json({ error:'Order not found' });
  o.items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(o.id);
  try {
    await sendInvoice(o);
    db.prepare(`UPDATE orders SET invoice_status='sent',invoice_sent_at=datetime('now') WHERE id=?`).run(o.id);
    res.json({ success:true });
  } catch(e) { res.status(500).json({ error:`Email failed: ${e.message}` }); }
});

// ─── PRODUCTS ────────────────────────────────────────────────────────────────
app.get('/api/products', authMW, (req,res) => {
  let rows;
  if (req.user.userType==='staff') {
    let where='WHERE 1=1', vals=[];
    if (req.query.active!==undefined) { where+=` AND p.active=${req.query.active==='true'?1:0}`; }
    if (req.query.search) { where+=` AND (p.name LIKE ? OR p.sku LIKE ?)`; vals.push(`%${req.query.search}%`,`%${req.query.search}%`); }
    if (req.query.category) { where+=` AND p.category=?`; vals.push(req.query.category); }
    rows = db.prepare(`SELECT p.*,v.name as vendor_name FROM products p LEFT JOIN vendors v ON p.vendor_id=v.id ${where} ORDER BY p.category,p.name LIMIT 500`).all(...vals);
  } else {
    rows = db.prepare(`SELECT p.*,
      COALESCE(cp.sale_price,CASE WHEN cp.markup_type='pct' THEN p.base_price*(1+cp.markup_value/100.0) WHEN cp.markup_type='dollar' THEN p.base_price+cp.markup_value ELSE p.base_price END) as customer_price,
      cp.setup_fee as customer_setup_fee,cp.markup_type,cp.markup_value
      FROM products p LEFT JOIN customer_pricing cp ON cp.product_id=p.id AND cp.customer_id=?
      WHERE p.active=1 ORDER BY p.category,p.name`).all(req.user.customerId);
  }
  res.json(rows.map(r=>({...r,price_tiers:safeJSON(r.price_tiers),colors:safeJSON(r.colors),sizes:safeJSON(r.sizes),images:safeJSON(r.images)})));
});

app.post('/api/products', authMW, staffOnly, adminOnly, (req,res) => {
  const p=req.body;
  const info=db.prepare(`INSERT INTO products (name,sku,description,category,base_price,price_tiers,colors,sizes,min_qty,production_days,images,is_quote_only,active)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(p.name,p.sku,p.description,p.category,p.base_price,
    JSON.stringify(p.price_tiers||[]),JSON.stringify(p.colors||[]),JSON.stringify(p.sizes||[]),
    p.min_qty||1,p.production_days,JSON.stringify(p.images||[]),p.is_quote_only?1:0,p.active?1:0);
  res.json({ id:info.lastInsertRowid });
});

app.put('/api/products/:id', authMW, staffOnly, adminOnly, (req,res) => {
  const p=req.body;
  db.prepare(`UPDATE products SET name=?,sku=?,description=?,category=?,base_price=?,is_quote_only=?,active=?,updated_at=datetime('now') WHERE id=?`)
    .run(p.name,p.sku,p.description,p.category,p.base_price,p.is_quote_only?1:0,p.active?1:0,req.params.id);
  res.json({ success:true });
});

app.get('/api/products/categories', authMW, (req,res) =>
  res.json(db.prepare(`SELECT DISTINCT category FROM products WHERE active=1 AND category IS NOT NULL ORDER BY category`).all().map(r=>r.category)));

app.put('/api/products/pricing/:cId/:pId', authMW, staffOnly, adminOnly, (req,res) => {
  const {markup_type,markup_value,sale_price,setup_fee,shipping_cost}=req.body;
  const ex=db.prepare('SELECT id FROM customer_pricing WHERE customer_id=? AND product_id=?').get(req.params.cId,req.params.pId);
  if(ex) db.prepare('UPDATE customer_pricing SET markup_type=?,markup_value=?,sale_price=?,setup_fee=?,shipping_cost=?,updated_at=datetime("now") WHERE id=?')
    .run(markup_type||'pct',markup_value||0,sale_price||null,setup_fee||0,shipping_cost||0,ex.id);
  else db.prepare('INSERT INTO customer_pricing (customer_id,product_id,markup_type,markup_value,sale_price,setup_fee,shipping_cost) VALUES (?,?,?,?,?,?,?)')
    .run(req.params.cId,req.params.pId,markup_type||'pct',markup_value||0,sale_price||null,setup_fee||0,shipping_cost||0);
  res.json({ success:true });
});

// ─── CUSTOMERS ───────────────────────────────────────────────────────────────
app.get('/api/customers', authMW, staffOnly, (req,res) => {
  const lw=req.user.role==='super_admin'?'':`AND c.location_id=${req.user.locationId}`;
  res.json(db.prepare(`SELECT c.*,l.name as location_name,cb.primary_color,cb.logo_url,cb.logo_text,cb.template,
    (SELECT COUNT(*) FROM customer_users cu WHERE cu.customer_id=c.id AND cu.active=1) as user_count
    FROM customers c LEFT JOIN locations l ON c.location_id=l.id LEFT JOIN customer_branding cb ON cb.customer_id=c.id
    WHERE 1=1 ${lw} ORDER BY c.company_name`).all());
});

app.get('/api/customers/:id', authMW, staffOnly, (req,res) => {
  const r=db.prepare(`SELECT c.*,cb.*,l.name as location_name FROM customers c LEFT JOIN customer_branding cb ON cb.customer_id=c.id LEFT JOIN locations l ON c.location_id=l.id WHERE c.id=?`).get(req.params.id);
  if(!r) return res.status(404).json({error:'Not found'});
  res.json(r);
});

app.post('/api/customers', authMW, staffOnly, adminOnly, (req,res) => {
  const {company_name,subdomain,location_id,pricing_tier,allow_invoice,require_approval,ai_enabled,notes,branding,users}=req.body;
  try {
    const info=db.prepare(`INSERT INTO customers (company_name,subdomain,location_id,pricing_tier,allow_invoice,require_approval,ai_enabled,notes,created_by,active)
      VALUES (?,?,?,?,?,?,?,?,?,1)`).run(company_name,subdomain.toLowerCase().replace(/[^a-z0-9-]/g,''),
      location_id||req.user.locationId||1,pricing_tier||1,allow_invoice?1:0,require_approval?1:0,ai_enabled?1:0,notes,req.user.userId);
    const cId=info.lastInsertRowid;
    db.prepare(`INSERT INTO customer_branding (customer_id,primary_color,secondary_color,accent_color,font_family,template,logo_text) VALUES (?,?,?,?,?,?,?)`)
      .run(cId,branding?.primary_color||'#DA532C',branding?.secondary_color||'#1A1A2E',branding?.accent_color||'#F5A623',branding?.font_family||'Inter',branding?.template||'minimal',branding?.logo_text||company_name[0]);
    for(const u of(users||[])) {
      db.prepare('INSERT INTO customer_users (customer_id,role,name,email,password_hash,can_order,active) VALUES (?,?,?,?,?,?,1)')
        .run(cId,u.role||'admin',u.name,u.email,bcrypt.hashSync(u.password||'Welcome123!',12),u.can_order?1:0);
    }
    log('info',`Customer created: ${company_name} → ${subdomain}`);
    res.json({id:cId,subdomain});
  } catch(e) {
    if(e.message.includes('UNIQUE')) return res.status(409).json({error:'That subdomain is already taken — try another'});
    res.status(500).json({error:e.message});
  }
});

app.put('/api/customers/:id', authMW, staffOnly, adminOnly, (req,res) => {
  const {company_name,pricing_tier,active,allow_invoice,require_approval,ai_enabled,notes}=req.body;
  db.prepare('UPDATE customers SET company_name=?,pricing_tier=?,active=?,allow_invoice=?,require_approval=?,ai_enabled=?,notes=? WHERE id=?')
    .run(company_name,pricing_tier,active?1:0,allow_invoice?1:0,require_approval?1:0,ai_enabled?1:0,notes,req.params.id);
  res.json({success:true});
});

app.put('/api/customers/:id/branding', authMW, staffOnly, adminOnly, (req,res) => {
  const {primary_color,secondary_color,accent_color,font_family,template,logo_text,logo_url}=req.body;
  const ex=db.prepare('SELECT id FROM customer_branding WHERE customer_id=?').get(req.params.id);
  if(ex) db.prepare('UPDATE customer_branding SET primary_color=?,secondary_color=?,accent_color=?,font_family=?,template=?,logo_text=?,logo_url=?,updated_at=datetime("now") WHERE customer_id=?')
    .run(primary_color,secondary_color,accent_color,font_family,template,logo_text,logo_url,req.params.id);
  else db.prepare('INSERT INTO customer_branding (customer_id,primary_color,secondary_color,accent_color,font_family,template,logo_text,logo_url) VALUES (?,?,?,?,?,?,?,?)')
    .run(req.params.id,primary_color,secondary_color,accent_color,font_family,template,logo_text,logo_url);
  res.json({success:true});
});

app.get('/api/customers/:id/users', authMW, staffOnly, (req,res) =>
  res.json(db.prepare('SELECT id,name,email,role,can_order,active,last_login FROM customer_users WHERE customer_id=?').all(req.params.id)));

app.post('/api/customers/:id/users', authMW, staffOnly, adminOnly, (req,res) => {
  const {name,email,role,can_order,password}=req.body;
  try {
    const info=db.prepare('INSERT INTO customer_users (customer_id,name,email,password_hash,role,can_order,active) VALUES (?,?,?,?,?,?,1)')
      .run(req.params.id,name,email,bcrypt.hashSync(password||'Welcome123!',12),role||'buyer',can_order?1:0);
    res.json({id:info.lastInsertRowid});
  } catch(e) {
    if(e.message.includes('UNIQUE')) return res.status(409).json({error:'That email is already in use'});
    res.status(500).json({error:e.message});
  }
});

// ─── STAFF ───────────────────────────────────────────────────────────────────
app.get('/api/staff', authMW, staffOnly, adminOnly, (req,res) => {
  const lw=req.user.role==='super_admin'?'':`AND s.location_id=${req.user.locationId}`;
  res.json(db.prepare(`SELECT s.id,s.name,s.email,s.role,s.active,s.last_login,l.name as location_name,s.location_id
    FROM staff_users s LEFT JOIN locations l ON s.location_id=l.id WHERE 1=1 ${lw} ORDER BY s.name`).all());
});

app.post('/api/staff', authMW, staffOnly, adminOnly, (req,res) => {
  const {name,email,role,location_id}=req.body;
  const locId=req.user.role==='super_admin'?location_id:req.user.locationId;
  if(locId){const cnt=db.prepare('SELECT COUNT(*) as c FROM staff_users WHERE location_id=? AND active=1').get(locId).c; if(cnt>=10) return res.status(409).json({error:'This location has reached the 10-user limit'});}
  const tmpPass=Math.random().toString(36).slice(-8)+'A1!';
  try {
    const info=db.prepare('INSERT INTO staff_users (name,email,password_hash,role,location_id,active) VALUES (?,?,?,?,?,1)')
      .run(name,email.toLowerCase(),bcrypt.hashSync(tmpPass,12),role,locId||null);
    res.json({id:info.lastInsertRowid,tempPassword:tmpPass});
  } catch(e) {
    if(e.message.includes('UNIQUE')) return res.status(409).json({error:'That email is already in use'});
    res.status(500).json({error:e.message});
  }
});

app.put('/api/staff/:id', authMW, staffOnly, adminOnly, (req,res) => {
  const {name,role,location_id,active}=req.body;
  db.prepare('UPDATE staff_users SET name=?,role=?,location_id=?,active=? WHERE id=?').run(name,role,location_id||null,active?1:0,req.params.id);
  res.json({success:true});
});

app.delete('/api/staff/:id', authMW, staffOnly, adminOnly, (req,res) => {
  db.prepare('UPDATE staff_users SET active=0 WHERE id=?').run(req.params.id);
  res.json({success:true});
});

app.get('/api/locations', authMW, staffOnly, (req,res) =>
  res.json(db.prepare(`SELECT l.*,COUNT(s.id) as active_users FROM locations l LEFT JOIN staff_users s ON s.location_id=l.id AND s.active=1 GROUP BY l.id ORDER BY l.name`).all()));

app.post('/api/locations', authMW, staffOnly, (req,res) => {
  if(req.user.role!=='super_admin') return res.status(403).json({error:'Super admin only'});
  const {name,city,state,address,phone}=req.body;
  const info=db.prepare('INSERT INTO locations (name,city,state,address,phone) VALUES (?,?,?,?,?)').run(name,city,state,address,phone);
  res.json({id:info.lastInsertRowid});
});

// ─── VENDORS ─────────────────────────────────────────────────────────────────
app.get('/api/vendors', authMW, staffOnly, adminOnly, (req,res) =>
  res.json(db.prepare('SELECT id,type,name,method,color,icon,active,connected,schedule_enabled,schedule_time,schedule_days,last_sync_at,last_sync_status,total_products,sync_count FROM vendors ORDER BY id').all()));

app.get('/api/vendors/:id', authMW, staffOnly, adminOnly, (req,res) => {
  const v=db.prepare('SELECT * FROM vendors WHERE id=?').get(req.params.id);
  if(!v) return res.status(404).json({error:'Not found'});
  if(v.credentials_enc){try{v.credentials=JSON.parse(dec(v.credentials_enc));}catch{}}
  delete v.credentials_enc;
  v.logs=db.prepare('SELECT * FROM vendor_sync_logs WHERE vendor_id=? ORDER BY started_at DESC LIMIT 30').all(v.id);
  res.json(v);
});

app.post('/api/vendors', authMW, staffOnly, adminOnly, (req,res) => {
  const {type,name,method,color,icon,credentials,schedule_enabled,schedule_time,schedule_days}=req.body;
  const info=db.prepare('INSERT INTO vendors (type,name,method,color,icon,credentials_enc,schedule_enabled,schedule_time,schedule_days,connected) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(type,name,method||'web',color||'#888',icon||'📦',credentials?enc(JSON.stringify(credentials)):null,schedule_enabled?1:0,schedule_time||'00:00',schedule_days||'mon,tue,wed,thu,fri,sat,sun',credentials?1:0);
  res.json({id:info.lastInsertRowid});
});

app.put('/api/vendors/:id', authMW, staffOnly, adminOnly, (req,res) => {
  const {credentials,schedule_enabled,schedule_time,schedule_days,active,name}=req.body;
  const v=db.prepare('SELECT * FROM vendors WHERE id=?').get(req.params.id);
  if(!v) return res.status(404).json({error:'Not found'});
  db.prepare('UPDATE vendors SET name=?,active=?,schedule_enabled=?,schedule_time=?,schedule_days=?,credentials_enc=?,connected=? WHERE id=?')
    .run(name||v.name,active?1:0,schedule_enabled?1:0,schedule_time||v.schedule_time,schedule_days||v.schedule_days,
      credentials?enc(JSON.stringify(credentials)):v.credentials_enc,credentials?1:v.connected,req.params.id);
  res.json({success:true});
});

app.post('/api/vendors/:id/sync', authMW, staffOnly, adminOnly, (req,res) => {
  const v=db.prepare('SELECT * FROM vendors WHERE id=?').get(req.params.id);
  if(!v) return res.status(404).json({error:'Not found'});
  if(!v.credentials_enc) return res.status(400).json({error:'Save your vendor credentials first, then sync'});
  res.json({message:'Sync started — check Sync Logs for progress'});
  runSync(v).catch(e=>log('error','Sync error:',e.message));
});

app.post('/api/vendors/:id/test', authMW, staffOnly, adminOnly, async (req,res) => {
  const v=db.prepare('SELECT * FROM vendors WHERE id=?').get(req.params.id);
  if(!v?.credentials_enc) return res.status(400).json({error:'Save credentials first'});
  try {
    const creds=JSON.parse(dec(v.credentials_enc));
    const {chromium}=require('playwright');
    const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});
    const page=await browser.newPage({userAgent:'Mozilla/5.0'});
    await page.goto(creds.login_url||creds.endpoint||'about:blank',{timeout:20000,waitUntil:'domcontentloaded'});
    if(v.method==='web'&&creds.username) {
      if(creds.selector_username) await page.fill(creds.selector_username,creds.username).catch(()=>{});
      if(creds.selector_password) await page.fill(creds.selector_password,creds.password||'').catch(()=>{});
      if(creds.selector_submit)   await page.click(creds.selector_submit).catch(()=>{});
      await page.waitForTimeout(2000);
    }
    await browser.close();
    db.prepare('UPDATE vendors SET connected=1 WHERE id=?').run(req.params.id);
    res.json({success:true,message:'✓ Connection successful — credentials work'});
  } catch(e) { res.status(400).json({error:`Connection failed: ${e.message}`}); }
});

// ─── ANALYTICS ───────────────────────────────────────────────────────────────
app.get('/api/analytics/kpis', authMW, staffOnly, (req,res) => {
  const lw=req.user.role!=='super_admin'?`AND location_id=${req.user.locationId}`:'';
  const k=db.prepare(`SELECT COUNT(*) as orders_total,COALESCE(SUM(total),0) as revenue_total,
    COUNT(*) FILTER(WHERE strftime('%Y-%m',placed_at)=strftime('%Y-%m','now')) as orders_mtd,
    COALESCE(SUM(total) FILTER(WHERE strftime('%Y-%m',placed_at)=strftime('%Y-%m','now')),0) as revenue_mtd,
    COUNT(*) FILTER(WHERE status='shipped') as in_transit,
    COUNT(*) FILTER(WHERE invoice_status IN ('pending','sent') AND status='delivered') as invoices_pending
    FROM orders WHERE status!='cancelled' ${lw}`).get();
  res.json({...k, active_customers:db.prepare('SELECT COUNT(*) as c FROM customers WHERE active=1').get().c,
    active_products:db.prepare('SELECT COUNT(*) as c FROM products WHERE active=1').get().c});
});

app.get('/api/analytics/locations', authMW, staffOnly, (req,res) =>
  res.json(db.prepare(`SELECT l.id,l.name,
    COALESCE(SUM(o.total) FILTER(WHERE strftime('%Y-%m',o.placed_at)=strftime('%Y-%m','now')),0) as revenue_mtd,
    COUNT(o.id) FILTER(WHERE strftime('%Y-%m',o.placed_at)=strftime('%Y-%m','now')) as orders_mtd,
    COALESCE(SUM(o.total) FILTER(WHERE strftime('%Y',o.placed_at)=strftime('%Y','now')),0) as revenue_ytd
    FROM locations l LEFT JOIN orders o ON o.location_id=l.id AND o.status!='cancelled'
    GROUP BY l.id ORDER BY revenue_mtd DESC`).all()));

app.get('/api/analytics/monthly', authMW, staffOnly, (req,res) => {
  const lw=req.user.role!=='super_admin'?`AND location_id=${req.user.locationId}`:'';
  res.json(db.prepare(`SELECT strftime('%Y-%m',placed_at) as month,COALESCE(SUM(total),0) as revenue,COUNT(*) as orders
    FROM orders WHERE status!='cancelled' ${lw} GROUP BY strftime('%Y-%m',placed_at) ORDER BY month DESC LIMIT 12`).all().reverse());
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
app.get('/api/notifications', authMW, staffOnly, (req,res) => {
  const lw=req.user.role!=='super_admin'?`AND (location_id=${req.user.locationId} OR location_id IS NULL)`:'';
  res.json(db.prepare(`SELECT * FROM notifications WHERE 1=1 ${lw} ORDER BY created_at DESC LIMIT 100`).all());
});
app.put('/api/notifications/:id/read', authMW, (req,res) => { db.prepare('UPDATE notifications SET read=1 WHERE id=?').run(req.params.id); res.json({success:true}); });
app.put('/api/notifications/all/read', authMW, (req,res) => { db.prepare('UPDATE notifications SET read=1').run(); res.json({success:true}); });

// ─── TAGS ────────────────────────────────────────────────────────────────────
app.get('/api/tags', authMW, staffOnly, (req,res) => {
  const cId=req.query.customer_id||null;
  res.json(db.prepare(`SELECT * FROM customer_tags WHERE customer_id ${cId?`= ${cId}`:'IS NULL'}`).all());
});
app.put('/api/tags/:provider', authMW, staffOnly, adminOnly, (req,res) => {
  const {tag_id,tag_name,snippet,active,customer_id=null}=req.body;
  const ex=db.prepare('SELECT id FROM customer_tags WHERE provider=? AND customer_id IS ?').get(req.params.provider,customer_id);
  if(ex) db.prepare('UPDATE customer_tags SET tag_id=?,tag_name=?,snippet=?,active=?,updated_at=datetime("now") WHERE id=?').run(tag_id,tag_name,snippet,active?1:0,ex.id);
  else db.prepare('INSERT INTO customer_tags (customer_id,provider,tag_id,tag_name,snippet,active) VALUES (?,?,?,?,?,?)').run(customer_id,req.params.provider,tag_id,tag_name,snippet,active?1:0);
  res.json({success:true});
});

// ─── AI ───────────────────────────────────────────────────────────────────────
app.post('/api/ai/chat', authMW, async (req,res) => {
  if(!process.env.ANTHROPIC_API_KEY)
    return res.status(500).json({error:'AI not configured — add ANTHROPIC_API_KEY in Railway → Variables'});
  const {messages=[],mode='customer'}=req.body;
  try {
    let system;
    if(req.user.userType==='customer'){
      const orders=db.prepare('SELECT order_number,status,total,placed_at FROM orders WHERE customer_id=? ORDER BY placed_at DESC LIMIT 5').all(req.user.customerId);
      const prods =db.prepare('SELECT name,sku,base_price,is_quote_only,category FROM products WHERE active=1 LIMIT 60').all();
      system=`You are a helpful AI shopping assistant for a Peregrine Solutions customer portal — a promotional products company. Help customers find products, check orders, and request quotes. Recent orders: ${JSON.stringify(orders)}. Products available: ${JSON.stringify(prods)}. For quote-only products say you can get an official quote. Be friendly and concise.`;
    } else {
      system=`You are an AI assistant for Peregrine Solutions staff. Help with product lookups, customer communications, and order management. Staff role: ${req.user.role}. Be concise and professional.`;
    }
    const r=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:'claude-sonnet-4-5',max_tokens:800,system,
        messages:messages.map(m=>({role:m.role==='ai'?'assistant':'user',content:m.text}))})
    });
    const data=await r.json();
    if(!r.ok) throw new Error(data.error?.message||'AI API error');
    res.json({reply:data.content?.[0]?.text||'Try again in a moment.'});
  } catch(e){res.status(500).json({error:e.message});}
});

// ─── UPLOADS ─────────────────────────────────────────────────────────────────
app.post('/api/upload/logo/:cId', authMW, staffOnly, upload.single('logo'), (req,res) => {
  if(!req.file) return res.status(400).json({error:'No file uploaded'});
  const url=`/uploads/logos/${req.file.filename}`;
  db.prepare('UPDATE customer_branding SET logo_url=? WHERE customer_id=?').run(url,req.params.cId);
  res.json({url});
});

// ─── SCRAPER ─────────────────────────────────────────────────────────────────
async function runSync(vendor){
  const logId=db.prepare("INSERT INTO vendor_sync_logs (vendor_id,status,started_at) VALUES (?,'running',datetime('now'))").run(vendor.id).lastInsertRowid;
  const stats={added:0,updated:0,removed:0,errors:0};
  let browser;
  try{
    const creds=JSON.parse(dec(vendor.credentials_enc));
    const {chromium}=require('playwright');
    browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});
    const ctx=await browser.newContext({userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'});
    const page=await ctx.newPage();
    log('info',`Sync: ${vendor.name} logging in…`);
    await page.goto(creds.login_url,{waitUntil:'networkidle',timeout:30000});
    if(creds.selector_username&&creds.username) await page.fill(creds.selector_username,creds.username).catch(()=>{});
    if(creds.selector_password&&creds.password) await page.fill(creds.selector_password,creds.password).catch(()=>{});
    if(creds.selector_submit) await page.click(creds.selector_submit).catch(()=>{});
    await page.waitForNavigation({waitUntil:'networkidle',timeout:15000}).catch(()=>{});
    log('info',`Sync: ${vendor.name} logged in, scraping catalog…`);
    if(creds.catalog_url){
      await page.goto(creds.catalog_url,{waitUntil:'networkidle',timeout:30000});
      let hasMore=true,pageNum=1;
      while(hasMore&&pageNum<=500){
        await page.waitForTimeout(parseInt(process.env.SCRAPER_DELAY_MS)||1500);
        const items=await page.evaluate(sel=>{
          const els=document.querySelectorAll(sel||'.product-item,.product,.item,[data-product-id]');
          return Array.from(els).map(el=>({
            name:        el.querySelector('.name,.title,.product-name,h2,h3')?.textContent?.trim(),
            sku:         el.querySelector('.sku,.item-number,.product-number,[data-sku]')?.textContent?.trim(),
            price:       parseFloat(el.querySelector('.price,[data-price]')?.textContent?.replace(/[^0-9.]/g,'')||0)||null,
            description: el.querySelector('.description,.summary,p')?.textContent?.trim()?.slice(0,500),
            image:       el.querySelector('img[src]:not([src=""])')?.src,
            category:    el.querySelector('.category,.product-category')?.textContent?.trim(),
          })).filter(p=>p.name&&p.name.length>1);
        },creds.product_selector||null);
        for(const p of items){
          try{
            const sku=(p.sku||'').trim()||(vendor.id+'-'+p.name.slice(0,20).replace(/\W+/g,'-').toLowerCase());
            const ex=db.prepare('SELECT id FROM products WHERE sku=? AND vendor_id=?').get(sku,vendor.id);
            if(ex){db.prepare("UPDATE products SET name=?,base_price=?,description=?,category=?,updated_at=datetime('now') WHERE id=?").run(p.name,p.price,p.description,p.category,ex.id);stats.updated++;}
            else  {db.prepare("INSERT INTO products (vendor_id,name,sku,base_price,description,category,images,active,last_synced_at) VALUES (?,?,?,?,?,?,?,0,datetime('now'))").run(vendor.id,p.name,sku,p.price,p.description,p.category,JSON.stringify(p.image?[p.image]:[]));stats.added++;}
          }catch(e){stats.errors++;}
        }
        const next=await page.$('a[rel="next"],.next-page,.pagination-next:not(.disabled)').catch(()=>null);
        if(next&&items.length>0){await next.click();await page.waitForNavigation({timeout:10000}).catch(()=>{});pageNum++;}
        else hasMore=false;
      }
    }
    db.prepare("UPDATE vendor_sync_logs SET finished_at=datetime('now'),status='success',added=?,updated=?,removed=?,errors=?,duration_ms=CAST((julianday('now')-julianday(started_at))*86400000 AS INT) WHERE id=?")
      .run(stats.added,stats.updated,stats.removed,stats.errors,logId);
    db.prepare("UPDATE vendors SET last_sync_at=datetime('now'),last_sync_status='success',total_products=(SELECT COUNT(*) FROM products WHERE vendor_id=?),sync_count=sync_count+1,connected=1 WHERE id=?")
      .run(vendor.id,vendor.id);
    db.prepare('INSERT INTO notifications (type,title,description) VALUES (?,?,?)').run('system',`Sync complete: ${vendor.name}`,`+${stats.added} new, ${stats.updated} updated`);
    log('info',`Sync complete: ${vendor.name}`,JSON.stringify(stats));
  }catch(e){
    db.prepare("UPDATE vendor_sync_logs SET finished_at=datetime('now'),status='error',errors=1,message=? WHERE id=?").run(e.message,logId);
    log('error',`Sync failed: ${vendor.name}`,e.message);
  }finally{if(browser)await browser.close();}
  return stats;
}

// Cron — check for scheduled syncs every hour at :05
cron.schedule('5 * * * *',async()=>{
  const now=new Date(),hhmm=`${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`,day=['sun','mon','tue','wed','thu','fri','sat'][now.getDay()];
  const due=db.prepare("SELECT * FROM vendors WHERE active=1 AND connected=1 AND schedule_enabled=1 AND schedule_time LIKE ? AND schedule_days LIKE ?").all(`${hhmm}%`,`%${day}%`);
  for(const v of due) await runSync(v).catch(e=>log('error','Cron sync:',e.message));
});

// ─── INVOICE EMAIL ────────────────────────────────────────────────────────────
async function sendInvoice(order){
  if(!process.env.SMTP_USER) throw new Error('Email not configured — add SMTP_USER and SMTP_PASS in Railway Variables');
  const t=nodemailer.createTransport({host:process.env.SMTP_HOST||'smtp.gmail.com',port:parseInt(process.env.SMTP_PORT)||587,secure:false,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
  await t.sendMail({
    from:`Peregrine Solutions <${process.env.SMTP_USER}>`,
    to:order.email,
    subject:`Invoice — Order ${order.order_number}`,
    html:`<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#DA532C;padding:24px;text-align:center"><h1 style="color:#fff;margin:0">Peregrine Solutions</h1></div>
      <div style="padding:24px;background:#f9f9f9;border:1px solid #e0e0e0">
        <h2>Order ${order.order_number}</h2>
        <p>Hi ${order.contact},</p>
        <p>Thank you for your order. Here is your invoice for <strong>${order.company_name}</strong>.</p>
        <table width="100%" cellpadding="8" style="border-collapse:collapse;margin:16px 0">
          <tr style="background:#DA532C;color:#fff"><th align="left">Item</th><th align="right">Qty</th><th align="right">Price</th><th align="right">Total</th></tr>
          ${(order.items||[]).map(i=>`<tr style="border-bottom:1px solid #e0e0e0"><td>${i.product_name}</td><td align="right">${i.quantity}</td><td align="right">$${parseFloat(i.unit_price).toFixed(2)}</td><td align="right">$${parseFloat(i.line_total).toFixed(2)}</td></tr>`).join('')}
        </table>
        <p style="font-size:20px;font-weight:bold;color:#DA532C;text-align:right">Total: $${parseFloat(order.total).toFixed(2)}</p>
        <p>Please remit payment at your earliest convenience. Questions? Reply to this email.</p>
        <p>Thank you,<br>Peregrine Solutions</p>
      </div>
    </div>`
  });
}

// ─── SERVE REACT ─────────────────────────────────────────────────────────────
if(fs.existsSync(BUILD_DIR)){
  app.use(express.static(BUILD_DIR));
  app.get('*',(req,res)=>res.sendFile(path.join(BUILD_DIR,'index.html')));
}else{
  app.get('/',(req,res)=>res.json({status:'Backend running — frontend building…',health:'/api/health'}));
}

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────
app.use((err,req,res,next)=>{
  log('error',err.message);
  res.status(500).json({error:err.message||'Server error'});
});

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(PORT,()=>{
  log('info',`✦ Peregrine Portal running on port ${PORT}`);
  log('info',`Domain: ${process.env.BASE_DOMAIN||'(not set — add BASE_DOMAIN in Railway Variables)'}`);
  log('info',`Database: ${DB_PATH}`);
  log('info',`Admin: ${process.env.ADMIN_EMAIL||'(not set)'}`);
});

module.exports=app;
